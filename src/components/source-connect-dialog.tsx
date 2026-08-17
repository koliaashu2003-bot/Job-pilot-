"use client";

import * as React from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { ProviderMeta } from "@/hooks/useSources";

interface SourceConnectDialogProps {
  provider: ProviderMeta | null;
  open: boolean;
  onClose: () => void;
  onConnect: (providerId: string, credentials: Record<string, string>) => Promise<void>;
}

/** Credential form for connecting a single BYOK job provider. */
export function SourceConnectDialog({
  provider,
  open,
  onClose,
  onConnect,
}: SourceConnectDialogProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setValues({});
  }, [open, provider?.id]);

  if (!provider) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setBusy(true);
    try {
      await onConnect(provider.id, values);
      toast.success(`${provider.name} connected.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold">Connect {provider.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{provider.description}</p>

      <a
        href={provider.docsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Where do I get these keys? <ExternalLink className="h-3 w-3" />
      </a>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {provider.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              type={field.type}
              required
              value={values[field.key] || ""}
              placeholder={field.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              autoComplete="off"
            />
            {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
          </div>
        ))}

        <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Your keys are encrypted (AES-256-GCM) before storage and never exposed to the browser.
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Connect
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
