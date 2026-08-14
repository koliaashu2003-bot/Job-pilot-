// Gmail API client: OAuth2 + draft creation.
import { google } from "googleapis";
import { adminDb } from "./firebase-admin";
import { decrypt, encrypt } from "./crypto";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.compose"];

export function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env vars are not set.");
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

/** Build the consent URL. `state` carries the uid through the round-trip. */
export function gmailAuthUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}

/** Exchange an auth code for tokens and store the encrypted refresh token. */
export async function storeGmailTokens(uid: string, code: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned. Revoke access and reconnect with consent.");
  }
  await adminDb()
    .collection("users")
    .doc(uid)
    .collection("tokens")
    .doc("gmail")
    .set({
      refreshToken: encrypt(tokens.refresh_token),
      updatedAt: new Date().toISOString(),
    });
  await adminDb().collection("users").doc(uid).set({ gmailLinked: true }, { merge: true });
}

/** Remove stored Gmail tokens and flip the linked flag. */
export async function disconnectGmail(uid: string): Promise<void> {
  await adminDb().collection("users").doc(uid).collection("tokens").doc("gmail").delete();
  await adminDb().collection("users").doc(uid).set({ gmailLinked: false }, { merge: true });
}

async function authorizedClient(uid: string) {
  const snap = await adminDb()
    .collection("users")
    .doc(uid)
    .collection("tokens")
    .doc("gmail")
    .get();
  if (!snap.exists) throw new Error("Gmail not connected for this user.");
  const refreshToken = decrypt(snap.data()!.refreshToken as string);
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/** Base64url-encode a UTF-8 string. */
function b64url(s: string): string {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface DraftInput {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  attachment?: { filename: string; mimeType: string; base64: string };
}

/** Create a Gmail draft (optionally with a single attachment). */
export async function createGmailDraft(uid: string, input: DraftInput): Promise<string> {
  const auth = await authorizedClient(uid);
  const gmail = google.gmail({ version: "v1", auth });

  let raw: string;
  if (input.attachment) {
    const boundary = "jobpilot_boundary_" + Date.now();
    raw = [
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      input.body,
      "",
      `--${boundary}`,
      `Content-Type: ${input.attachment.mimeType}; name="${input.attachment.filename}"`,
      `Content-Disposition: attachment; filename="${input.attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      input.attachment.base64,
      "",
      `--${boundary}--`,
    ].join("\r\n");
  } else {
    raw = [
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      input.body,
    ].join("\r\n");
  }

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: b64url(raw) } },
  });
  return res.data.id || "";
}
