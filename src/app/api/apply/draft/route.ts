import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, adminStorage, verifyRequestUid } from "@/lib/firebase-admin";
import { generateApplicationEmail } from "@/lib/claude";
import { createGmailDraft } from "@/lib/gmail";
import { sendTelegramMessage, formatDraftCreated } from "@/lib/telegram";
import type { User } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().default(""),
  description: z.string().default(""),
  source: z.string().default(""),
});

const bodySchema = z.object({
  job: jobSchema,
  toEmail: z.string().email(),
  // Optional pre-edited body; if absent we generate one.
  emailBody: z.string().optional(),
  // Preview-only: generate the email body without creating a Gmail draft.
  preview: z.boolean().optional(),
});

/** Fetch the user's CV from Storage as base64 for attaching to the draft. */
async function fetchCvBase64(cvUrl?: string): Promise<{ base64: string; filename: string } | null> {
  if (!cvUrl) return null;
  try {
    const file = adminStorage().bucket().file(cvUrl);
    const [buffer] = await file.download();
    return {
      base64: buffer.toString("base64"),
      filename: cvUrl.split("/").pop() || "cv.pdf",
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userSnap = await adminDb().collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  const user = userSnap.data() as User;
  if (!user.profile) {
    return NextResponse.json({ error: "Complete your profile first." }, { status: 400 });
  }

  // 1. Email body (generate if not supplied).
  let emailBody = body.emailBody?.trim();
  if (!emailBody) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Email generation not configured (missing ANTHROPIC_API_KEY)." },
        { status: 503 }
      );
    }
    emailBody = await generateApplicationEmail(body.job, user.profile);
  }

  const subject = `Application: ${body.job.title} — ${user.profile.fullName || user.displayName}`;

  // Preview-only: return the generated email without creating a draft.
  if (body.preview) {
    return NextResponse.json({ ok: true, preview: true, emailBody, subject });
  }

  // 2. Create the Gmail draft (with CV attachment when available).
  let draftId = "";
  try {
    const cv = await fetchCvBase64(user.cvUrl);
    draftId = await createGmailDraft(uid, {
      to: body.toEmail,
      subject,
      body: emailBody,
      fromName: user.profile.fullName,
      attachment: cv
        ? { filename: cv.filename, mimeType: "application/pdf", base64: cv.base64 }
        : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Draft creation failed: ${e.message}`
            : "Draft creation failed. Is Gmail connected?",
      },
      { status: 502 }
    );
  }

  // 3. Persist the application record.
  await adminDb()
    .collection("applications")
    .doc(uid)
    .collection("items")
    .doc(body.job.id)
    .set({
      jobId: body.job.id,
      jobTitle: body.job.title,
      company: body.job.company,
      source: body.job.source,
      appliedAt: new Date().toISOString(),
      emailDraft: emailBody,
      status: "drafted",
      toEmail: body.toEmail,
    });

  // 4. Telegram confirmation (best-effort).
  if (user.telegramLinked && user.telegramChatId && user.notificationPrefs?.applicationConfirmations !== false) {
    await sendTelegramMessage(
      user.telegramChatId,
      formatDraftCreated(body.job.title, body.job.company)
    );
  }

  return NextResponse.json({ ok: true, draftId, emailBody, subject });
}
