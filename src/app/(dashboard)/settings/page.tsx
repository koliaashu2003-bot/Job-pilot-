"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { toast } from "sonner";
import { Check, Download, Loader2, Mail, Sparkles, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelegramLink } from "@/components/telegram-link";
import type { NotificationPrefs } from "@/lib/types";

const DEFAULT_PREFS: NotificationPrefs = {
  jobAlerts: true,
  applicationConfirmations: true,
  weeklyDigest: true,
};

export default function SettingsPage() {
  return (
    <React.Suspense fallback={null}>
      <SettingsInner />
    </React.Suspense>
  );
}

function SettingsInner() {
  const { user, firebaseUser, getToken, refreshUser, logout } = useAuth();
  const params = useSearchParams();
  const [busy, setBusy] = React.useState(false);
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(user?.notificationPrefs || DEFAULT_PREFS);

  React.useEffect(() => {
    if (user?.notificationPrefs) setPrefs(user.notificationPrefs);
  }, [user?.notificationPrefs]);

  // Surface Gmail OAuth redirect results.
  React.useEffect(() => {
    const gmail = params.get("gmail");
    if (gmail === "connected") {
      toast.success("Gmail connected!");
      refreshUser();
    } else if (gmail === "error") {
      toast.error("Gmail connection failed. Please try again.");
    }
  }, [params, refreshUser]);

  async function connectGmail() {
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/auth/gmail?action=connect", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start Gmail connect");
      setBusy(false);
    }
  }

  async function disconnectGmail() {
    setBusy(true);
    try {
      const token = await getToken();
      await fetch("/api/auth/gmail", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await refreshUser();
      toast.success("Gmail disconnected.");
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs(next: NotificationPrefs) {
    if (!user) return;
    setPrefs(next);
    await setDoc(
      doc(db, "users", user.uid),
      { notificationPrefs: next, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  async function exportData() {
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    const blob = new Blob([JSON.stringify(snap.data() || {}, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobpilot-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!user || !firebaseUser) return;
    if (!confirm("Delete your account and all data? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(firebaseUser);
      toast.success("Account deleted.");
      await logout();
    } catch (e) {
      toast.error(
        e instanceof Error ? `${e.message} (you may need to re-login first)` : "Delete failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage integrations, notifications, and your account.
        </p>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Edit your CV-extracted profile fields.
          </p>
          <Link href="/profile">
            <Button variant="outline" size="sm">
              Edit profile
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Gmail */}
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect Gmail so JobPilot can create application drafts on your behalf.
          </p>
          {user?.gmailLinked ? (
            <div className="flex items-center gap-3">
              <Badge variant="success">
                <Check className="mr-1 h-3 w-3" /> Connected
              </Badge>
              <Button variant="ghost" size="sm" onClick={disconnectGmail} disabled={busy}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={connectGmail} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Connect Gmail
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader>
          <CardTitle>Telegram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Link Telegram for job alerts and application confirmations.
          </p>
          <TelegramLink />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            label="New job alerts"
            hint="Get pinged when new matching jobs go live (Pro)."
            checked={prefs.jobAlerts}
            onChange={(v) => savePrefs({ ...prefs, jobAlerts: v })}
          />
          <Toggle
            label="Application confirmations"
            hint="A Telegram message each time a draft is created."
            checked={prefs.applicationConfirmations}
            onChange={(v) => savePrefs({ ...prefs, applicationConfirmations: v })}
          />
          <Toggle
            label="Weekly digest"
            hint="A weekly summary of matches and applications (Pro)."
            checked={prefs.weeklyDigest}
            onChange={(v) => savePrefs({ ...prefs, weeklyDigest: v })}
          />
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={user?.plan === "pro" ? "success" : "outline"}>
              {user?.plan === "pro" ? "Pro" : "Free"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {user?.plan === "pro" ? "You're on Pro." : "Upgrade for real-time alerts."}
            </span>
          </div>
          {user?.plan !== "pro" && (
            <Button size="sm">
              <Sparkles className="h-4 w-4" /> Upgrade
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4" /> Export data (JSON)
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteAccount} disabled={busy}>
            <Trash2 className="h-4 w-4" /> Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-emerald-500"
      />
    </label>
  );
}
