"use client";

import * as React from "react";
import { toast } from "sonner";
import { CvUpload } from "@/components/cv-upload";
import { ProfileForm } from "@/components/profile-form";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, saving, save } = useProfile();
  const [draft, setDraft] = React.useState<UserProfile | undefined>(profile);

  React.useEffect(() => {
    if (profile) setDraft(profile);
  }, [profile]);

  async function onSave(p: UserProfile) {
    try {
      await save(p);
      toast.success("Profile saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your CV to auto-fill everything, then review and edit.
        </p>
      </header>

      {!user?.cvUrl && !draft && (
        <div className="mb-8">
          <CvUpload onParsed={setDraft} />
        </div>
      )}

      {(user?.cvUrl || draft) && (
        <div className="mb-8 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {user?.cvUrl ? (
            <>CV on file. Upload a new one anytime to re-extract.</>
          ) : (
            <>Review the extracted details below and save.</>
          )}
          <div className="mt-3">
            <CvUpload onParsed={setDraft} />
          </div>
        </div>
      )}

      <ProfileForm initial={draft} saving={saving} onSave={onSave} />
    </div>
  );
}
