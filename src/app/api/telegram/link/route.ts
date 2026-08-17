import { NextResponse } from "next/server";
import { adminDb, verifyRequestUid } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const CODE_TTL_MS = 5 * 60 * 1000;

/** Generate a 6-digit link code for the authenticated user. */
export async function POST(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await adminDb()
    .collection("linkCodes")
    .doc(code)
    .set({ uid, expiresAt: Date.now() + CODE_TTL_MS });

  return NextResponse.json({ code, expiresInSeconds: CODE_TTL_MS / 1000 });
}

/** Unlink Telegram for the authenticated user. */
export async function DELETE(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await adminDb()
    .collection("users")
    .doc(uid)
    .set({ telegramLinked: false, telegramChatId: null }, { merge: true });

  return NextResponse.json({ ok: true });
}
