"use client";

import * as React from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import type { UserProfile } from "@/lib/types";

/** Read/write the current user's CV-derived profile. */
export function useProfile() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = React.useState(false);

  const save = React.useCallback(
    async (profile: UserProfile) => {
      if (!user) throw new Error("Not authenticated");
      setSaving(true);
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { profile, updatedAt: serverTimestamp() },
          { merge: true }
        );
        await refreshUser();
      } finally {
        setSaving(false);
      }
    },
    [user, refreshUser]
  );

  return { profile: user?.profile, saving, save };
}
