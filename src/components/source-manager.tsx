"use client";

import * as React from "react";
import { Check, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceConnectDialog } from "@/components/source-connect-dialog";
import { useSources, type ProviderMeta } from "@/hooks/useSources";

/** Grid of job providers with connect / disconnect controls. */
export function SourceManager() {
  const { providers, connected, loading, connect, disconnect } = useSources();
  const [active, setActive] = React.useState<ProviderMeta | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => {
        const isConnected = p.keyless || connected.includes(p.id);
        return (
          <div
            key={p.id}
            className="flex items-start justify-between gap-4 rounded-md border border-border bg-background/50 p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                {p.keyless ? (
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" /> Always on
                  </Badge>
                ) : isConnected ? (
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            </div>

            {!p.keyless && (
              <div className="shrink-0">
                {isConnected ? (
                  <Button variant="ghost" size="sm" onClick={() => disconnect(p.id)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setActive(p)}>
                    <Plug className="h-4 w-4" /> Connect
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <SourceConnectDialog
        provider={active}
        open={!!active}
        onClose={() => setActive(null)}
        onConnect={connect}
      />
    </div>
  );
}
