// Firebase Admin SDK initialization (server-side only).
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let adminApp: App | undefined;

function initAdmin(): App {
  if (getApps().length) return getApp();

  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT is not set. Add the service-account JSON to your environment."
    );
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT is not valid JSON.");
  }

  return initializeApp({
    credential: cert(serviceAccount as never),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

/** Lazily initialize and return the admin app (throws if unconfigured). */
export function getAdminApp(): App {
  if (!adminApp) adminApp = initAdmin();
  return adminApp;
}

export const adminAuth = (): Auth => getAuth(getAdminApp());
export const adminDb = (): Firestore => getFirestore(getAdminApp());
export const adminStorage = (): Storage => getStorage(getAdminApp());

/**
 * Verify a Firebase ID token from the Authorization: Bearer header.
 * Returns the decoded uid, or null when missing/invalid.
 */
export async function verifyRequestUid(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
