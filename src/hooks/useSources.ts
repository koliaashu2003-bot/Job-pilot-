"use client";

import * as React from "react";
import { useAuth } from "./useAuth";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
  hint?: string;
}

export interface ProviderMeta {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  keyless: boolean;
  fields: CredentialField[];
}

/** Fetch provider metadata + which providers the user has connected. */
export function useSources() {
  const { getToken, configured } = useAuth();
  const [providers, setProviders] = React.useState<ProviderMeta[]>([]);
  const [connected, setConnected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/sources", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = (await res.json()) as { providers: ProviderMeta[]; connected: string[] };
        setProviders(data.providers);
        setConnected(data.connected || []);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    if (configured) load();
    else setLoading(false);
  }, [configured, load]);

  const connect = React.useCallback(
    async (providerId: string, credentials: Record<string, string>) => {
      const token = await getToken();
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ providerId, credentials }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      await load();
    },
    [getToken, load]
  );

  const disconnect = React.useCallback(
    async (providerId: string) => {
      const token = await getToken();
      await fetch(`/api/sources?providerId=${encodeURIComponent(providerId)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await load();
    },
    [getToken, load]
  );

  return { providers, connected, loading, reload: load, connect, disconnect };
}
