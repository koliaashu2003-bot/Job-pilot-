"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  title?: string;
  description?: string;
}

/** Upgrade prompt shown to free users on Pro-only surfaces. */
export function PremiumGate({
  title = "This is a Pro feature",
  description = "Upgrade to unlock real-time Telegram job alerts, automated polling, and weekly digests.",
}: PremiumGateProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button className="mt-4" size="sm">
        Upgrade to Pro
      </Button>
    </div>
  );
}
