import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyRequestUid } from "@/lib/firebase-admin";
import { disconnectGmail, gmailAuthUrl, storeGmailTokens } from "@/lib/gmail";

export const runtime = "nodejs";

function stateSecret(): string {
  return process.env.CRON_SECRET || process.env.TOKEN_ENCRYPTION_KEY || "jobpilot-dev-state";
}

/** Sign the uid into a tamper-evident state string: `uid.hmac`. */
function signState(uid: string): string {
  const sig = crypto.createHmac("sha256", stateSecret()).update(uid).digest("hex").slice(0, 32);
  return `${uid}.${sig}`;
}

function verifyState(state: string): string | null {
  const [uid, sig] = state.split(".");
  if (!uid || !sig) return null;
  const expected = crypto
    .createHmac("sha256", stateSecret())
    .update(uid)
    .digest("hex")
    .slice(0, 32);
  return sig === expected ? uid : null;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * GET handles two cases:
 *   - `?action=connect` (with Bearer token) → returns { url } to start OAuth.
 *   - `?code=...&state=...` (OAuth redirect) → exchanges code, stores tokens.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // OAuth callback from Google.
  if (code && state) {
    const uid = verifyState(state);
    if (!uid) {
      return NextResponse.redirect(`${appUrl()}/settings?gmail=error`);
    }
    try {
      await storeGmailTokens(uid, code);
      return NextResponse.redirect(`${appUrl()}/settings?gmail=connected`);
    } catch {
      return NextResponse.redirect(`${appUrl()}/settings?gmail=error`);
    }
  }

  // Start the connect flow.
  if (url.searchParams.get("action") === "connect") {
    const uid = await verifyRequestUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      return NextResponse.json({ url: gmailAuthUrl(signState(uid)) });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Gmail OAuth not configured." },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

/** DELETE disconnects Gmail for the authenticated user. */
export async function DELETE(req: Request) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await disconnectGmail(uid);
  return NextResponse.json({ ok: true });
}
