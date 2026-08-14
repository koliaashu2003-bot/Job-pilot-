import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

/**
 * Telegram webhook. Receives the user's 6-digit link code, matches it to a
 * pending linkCode doc, and links the chat_id to that user.
 */
export async function POST(req: Request) {
  // Verify the secret token Telegram echoes back (if configured).
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text || "").trim();
  if (!chatId) return NextResponse.json({ ok: true });

  // /start greeting.
  if (text === "/start") {
    await sendTelegramMessage(
      String(chatId),
      "👋 Welcome to *JobPilot*! Paste the 6-digit code from your JobPilot Settings page to link your account."
    );
    return NextResponse.json({ ok: true });
  }

  const codeMatch = text.match(/\b(\d{6})\b/);
  if (!codeMatch) {
    await sendTelegramMessage(
      String(chatId),
      "Please send the 6-digit code shown on your JobPilot Settings page."
    );
    return NextResponse.json({ ok: true });
  }

  const code = codeMatch[1];
  const ref = adminDb().collection("linkCodes").doc(code);
  const snap = await ref.get();

  if (!snap.exists) {
    await sendTelegramMessage(String(chatId), "❌ Invalid code. Generate a fresh one in Settings.");
    return NextResponse.json({ ok: true });
  }

  const data = snap.data() as { uid: string; expiresAt: number };
  if (Date.now() > data.expiresAt) {
    await ref.delete();
    await sendTelegramMessage(String(chatId), "⌛ That code expired. Generate a new one in Settings.");
    return NextResponse.json({ ok: true });
  }

  await adminDb()
    .collection("users")
    .doc(data.uid)
    .set({ telegramLinked: true, telegramChatId: String(chatId) }, { merge: true });
  await ref.delete();

  await sendTelegramMessage(
    String(chatId),
    "✅ Telegram linked successfully! You'll receive job alerts here."
  );
  return NextResponse.json({ ok: true });
}
