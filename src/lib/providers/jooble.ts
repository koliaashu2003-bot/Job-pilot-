import type { Job } from "@/lib/types";
import { shortHash } from "@/lib/utils";
import type { Provider } from "./types";

interface JoobleJob {
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
  id?: number;
}

function normalize(j: JoobleJob): Job {
  return {
    id: `jooble_${j.id || shortHash((j.title || "") + (j.company || ""))}`,
    title: j.title || "Untitled role",
    company: j.company || j.source || "Unknown",
    location: j.location || "Unspecified",
    salary: j.salary || undefined,
    type: j.type || "Full-time",
    description: (j.snippet || "").replace(/<[^>]*>/g, " ").trim(),
    applyUrl: j.link || "",
    source: "jooble",
    sourceLabel: "Jooble",
    postedAt: j.updated || new Date().toISOString(),
    tags: [],
  };
}

/** Jooble — global aggregator. BYOK API key. */
export const joobleProvider: Provider = {
  id: "jooble",
  name: "Jooble",
  description: "Worldwide job aggregator spanning 70+ countries.",
  docsUrl: "https://jooble.org/api/about",
  keyless: false,
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "your jooble key",
      hint: "Request a free API key from jooble.org/api/about.",
    },
  ],
  async search(params, creds) {
    try {
      const res = await fetch(`https://jooble.org/api/${creds.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: params.query || "",
          location: params.location || "",
        }),
        cache: "no-store",
      });
      if (!res.ok) return { jobs: [], error: `Jooble HTTP ${res.status}` };
      const json = (await res.json()) as { jobs?: JoobleJob[] };
      return { jobs: (json.jobs || []).map(normalize) };
    } catch (e) {
      return { jobs: [], error: e instanceof Error ? e.message : "Jooble request failed" };
    }
  },
};
