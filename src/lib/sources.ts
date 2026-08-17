// Per-user job-provider credentials, encrypted at rest (server-side only).
import { adminDb } from "./firebase-admin";
import { decrypt, encrypt } from "./crypto";
import { getProvider } from "./providers";
import type { Credentials } from "./providers/types";

function sourcesCol(uid: string) {
  return adminDb().collection("users").doc(uid).collection("sources");
}

/** Encrypt and store a provider's credentials for a user. */
export async function saveCredentials(
  uid: string,
  providerId: string,
  creds: Credentials
): Promise<void> {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  const encrypted: Record<string, string> = {};
  for (const field of provider.fields) {
    const value = (creds[field.key] || "").trim();
    if (value) encrypted[field.key] = encrypt(value);
  }
  await sourcesCol(uid).doc(providerId).set({
    fields: encrypted,
    updatedAt: new Date().toISOString(),
  });
}

/** Load and decrypt a provider's credentials, or null if none stored. */
export async function loadCredentials(
  uid: string,
  providerId: string
): Promise<Credentials | null> {
  const snap = await sourcesCol(uid).doc(providerId).get();
  if (!snap.exists) return null;
  const stored = (snap.data()?.fields || {}) as Record<string, string>;
  const out: Credentials = {};
  for (const [key, enc] of Object.entries(stored)) {
    try {
      out[key] = decrypt(enc);
    } catch {
      /* skip unreadable field */
    }
  }
  return Object.keys(out).length ? out : null;
}

/** Remove a provider's stored credentials. */
export async function deleteCredentials(uid: string, providerId: string): Promise<void> {
  await sourcesCol(uid).doc(providerId).delete();
}

/** List provider ids the user has connected (has stored credentials for). */
export async function listConnectedProviders(uid: string): Promise<string[]> {
  const snap = await sourcesCol(uid).get();
  return snap.docs
    .filter((d) => Object.keys(d.data()?.fields || {}).length > 0)
    .map((d) => d.id);
}
