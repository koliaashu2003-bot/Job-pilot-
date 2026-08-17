"use client";

import * as React from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import type { User } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/** Ensure a Firestore user document exists; return the merged User. */
async function ensureUserDoc(fbUser: FirebaseUser): Promise<User> {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const newUser = {
      uid: fbUser.uid,
      email: fbUser.email || "",
      displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
      photoURL: fbUser.photoURL || undefined,
      plan: "free" as const,
      telegramLinked: false,
      gmailLinked: false,
      notificationPrefs: {
        jobAlerts: true,
        applicationConfirmations: true,
        weeklyDigest: true,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, newUser);
    return { ...newUser } as User;
  }
  return { uid: fbUser.uid, ...(snap.data() as Omit<User, "uid">) };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          setUser(await ensureUserDoc(fbUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const refreshUser = React.useCallback(async () => {
    if (!firebaseUser) return;
    const snap = await getDoc(doc(db, "users", firebaseUser.uid));
    if (snap.exists()) setUser({ uid: firebaseUser.uid, ...(snap.data() as Omit<User, "uid">) });
  }, [firebaseUser]);

  const value: AuthContextValue = {
    firebaseUser,
    user,
    loading,
    configured: firebaseConfigured,
    signInWithGoogle: async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpWithEmail: async (email, password, displayName) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const ref = doc(db, "users", cred.user.uid);
      await setDoc(
        ref,
        {
          uid: cred.user.uid,
          email,
          displayName,
          plan: "free",
          telegramLinked: false,
          gmailLinked: false,
          notificationPrefs: {
            jobAlerts: true,
            applicationConfirmations: true,
            weeklyDigest: true,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    logout: async () => {
      await signOut(auth);
    },
    refreshUser,
    getToken: async () => (firebaseUser ? firebaseUser.getIdToken() : null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
