"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

/** Connect / disconnect Telegram and send a test notification. */
export function TelegramLink() {
  const { user, getToken, refreshUser } = useAuth();
  const [code, setCode] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const botHandle = process.env.NEXT_PUBLIC_TELEGRAM_BOT || "@JobPilotBot";

  async function generateCode() {
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const { code } = await res.json();
      setCode(code);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate code");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const token = await getToken();
      await fetch("/api/telegram/link", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await refreshUser();
      setCode(null);
      toast.success("Telegram disconnected.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/telegram/notify", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Test notification sent!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send test");
    } finally {
      setBusy(false);
    }
  }

  if (user?.telegramLinked) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="success">
            <Check className="mr-1 h-3 w-3" /> Connected
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={sendTest} disabled={busy}>
            <Send className="h-4 w-4" /> Send test
          </Button>
          <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy}>
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!code ? (
        <Button size="sm" onClick={generateCode} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Connect Telegram
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4 text-sm">
          <p>
            Send this code to <span className="font-medium text-foreground">{botHandle}</span> on
            Telegram:
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded bg-background px-3 py-1.5 text-lg font-bold tracking-widest">
              {code}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Code expires in 5 minutes. After sending it, refresh this page.
          </p>
        </div>
      )}
    </div>
  );
}
