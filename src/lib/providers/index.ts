// Provider registry. Add a provider here to make it available everywhere.
import type { Provider, ProviderMeta } from "./types";
import { remoteokProvider } from "./remoteok";
import { arbeitnowProvider } from "./arbeitnow";
import { jsearchProvider } from "./jsearch";
import { adzunaProvider } from "./adzuna";
import { joobleProvider } from "./jooble";
import { reedProvider } from "./reed";
import { usajobsProvider } from "./usajobs";

export const PROVIDERS: Provider[] = [
  remoteokProvider,
  arbeitnowProvider,
  jsearchProvider,
  adzunaProvider,
  joobleProvider,
  reedProvider,
  usajobsProvider,
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function getProvider(id: string): Provider | undefined {
  return BY_ID.get(id);
}

/** Client-safe metadata (no secrets). */
export function providerMeta(): ProviderMeta[] {
  return PROVIDERS.map(({ id, name, description, docsUrl, keyless, fields }) => ({
    id,
    name,
    description,
    docsUrl,
    keyless,
    fields,
  }));
}

/** Provider ids that are usable with no per-user credentials. */
export function keylessProviderIds(): string[] {
  return PROVIDERS.filter((p) => p.keyless).map((p) => p.id);
}

export type { Provider, ProviderMeta };
export * from "./types";
