import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUid } from "@/lib/firebase-admin";
import { parseCvPdf } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  // base64-encoded PDF (no data: URI prefix)
  pdfBase64: z.string().min(1),
});

export async function POST(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "CV parsing is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    parsedBody = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Guard against oversized payloads (~5MB PDF ≈ 6.8MB base64).
  if (parsedBody.pdfBase64.length > 7_500_000) {
    return NextResponse.json({ error: "File too large (max 5MB)." }, { status: 413 });
  }

  try {
    const profile = await parseCvPdf(parsedBody.pdfBase64);
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse CV." },
      { status: 500 }
    );
  }
}
