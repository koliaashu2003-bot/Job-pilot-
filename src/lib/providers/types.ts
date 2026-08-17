// Job-provider abstraction. Each provider knows its own API, what credentials
// it needs (if any), and how to normalize results into the shared Job schema.
import type { Job, JobSearchParams } from "@/lib/types";

export interface CredentialField {
  key: string; // machine name, e.g. "apiKey"
  label: string; // human label, e.g. "RapidAPI Key"
  type: "text" | "password";
  placeholder?: string;
  hint?: string;
}

export type Credentials = Record<string, string>;

export interface ProviderMeta {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  /** True when the provider needs no per-user credentials. */
  keyless: boolean;
  /** Credential fields the user must supply (empty when keyless). */
  fields: CredentialField[];
  /** Optional server env var that can supply a shared fallback key. */
  envFallbackKey?: string;
}

export interface ProviderSearchResult {
  jobs: Job[];
  error?: string;
}

export interface Provider extends ProviderMeta {
  search(params: JobSearchParams, creds: Credentials): Promise<ProviderSearchResult>;
}

/** Whether every required field has a non-empty value. */
export function hasAllCredentials(meta: ProviderMeta, creds?: Credentials | null): boolean {
  if (meta.keyless) return true;
  if (!creds) return false;
  return meta.fields.every((f) => (creds[f.key] || "").trim().length > 0);
}

export type { Job, JobSearchParams };
