"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Paperclip, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import type { Job } from "@/lib/types";

interface ApplyModalProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onDrafted: (job: Job) => void;
}

export function ApplyModal({ job, open, onClose, onDrafted }: ApplyModalProps) {
  const { user, getToken } = useAuth();
  const [toEmail, setToEmail] = React.useState("");
  const [body, setBody] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Reset + auto-generate email when a new job opens.
  React.useEffect(() => {
    if (open && job) {
      setToEmail(job.contactEmail || "");
      setBody("");
      void generate(job);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.id]);

  async function generate(j: Job) {
    setGenerating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/apply/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // Generate-only: no toEmail yet → we call a preview path.
        body: JSON.stringify({ preview: true, job: pickJob(j), toEmail: "preview@example.com" }),
      });
      // Preview path may be unsupported server-side; fall back gracefully.
      if (res.ok) {
        const data = await res.json();
        if (data.emailBody) setBody(data.emailBody);
      }
    } catch {
      /* silent — user can still write manually */
    } finally {
      setGenerating(false);
    }
  }

  async function createDraft() {
    if (!job) return;
    if (!toEmail) {
      toast.error("Add a recipient email address.");
      return;
    }
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/apply/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ job: pickJob(job), toEmail, emailBody: body }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Draft failed" }));
        throw new Error(error);
      }
      toast.success("Gmail draft created — check your drafts folder.");
      onDrafted(job);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft creation failed");
    } finally {
      setCreating(false);
    }
  }

  if (!job) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold">Apply to {job.title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {job.company} · {job.location}
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="email"
            placeholder="hiring@company.com"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Company email not always available — add the recruiter/careers address.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">Email</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => generate(job)}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Regenerate
            </Button>
          </div>
          <Textarea
            id="body"
            rows={9}
            value={body}
            placeholder={generating ? "Generating a tailored email…" : "Write your application…"}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          {user?.cvUrl ? "Your CV will be attached." : "No CV on file — upload one in Profile to attach it."}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={creating}>
          Cancel
        </Button>
        <Button onClick={createDraft} disabled={creating || generating}>
          {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create Gmail Draft
        </Button>
      </div>
    </Dialog>
  );
}

function pickJob(j: Job) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    description: j.description,
    source: j.source,
  };
}
