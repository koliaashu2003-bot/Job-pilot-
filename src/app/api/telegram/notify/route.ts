import { NextResponse } from "next/server";
import { adminDb, verifyRequestUid } from "@/lib/firebase-admin";
import { sendTelegramMessage } from "@/lib/telegram";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

/** Send a test notification to the authenticated user's linked Telegram. */
export async function POST(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb().collection("users").doc(uid).get();
  const user = snap.data() as User | undefined;

  if (!user?.telegramLinked || !user.telegramChatId) {
    return NextResponse.json({ error: "Telegram is not linked." }, { status: 400 });
  }

  const ok = await sendTelegramMessage(
    user.telegramChatId,
    "🔔 *JobPilot test notification*\n\nYour Telegram is linked and working. You'll get job alerts here."
  );

  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Failed to send message." }, { status: 502 });
}
