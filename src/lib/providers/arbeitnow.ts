import type { Job } from "@/lib/types";
import type { Provider } from "./types";

interface ArbeitnowJob {
  slug?: string;
  title?: string;
  company_name?: string;
  location?: string;
  url?: string;
  description?: string;
  remote?: boolean;
  tags?: string[];
  job_types?: string[];
  created_at?: number; // unix seconds
}

function normalize(j: ArbeitnowJob): Job {
  return {
    id: `arbeitnow_${j.slug}`,
    title: j.title || "Untitled role",
    company: j.company_name || "Unknown",
    location: j.location || (j.remote ? "Remote" : "Unspecified"),
    type: j.job_types?.[0] || "Full-time",
    description: (j.description || "").replace(/<[^>]*>/g, " ").trim(),
    applyUrl: j.url || "",
    source: "arbeitnow",
    sourceLabel: "Arbeitnow",
    postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : new Date().toISOString(),
    tags: j.tags || [],
  };
}

/** Arbeitnow — free European/remote job board, no auth required. */
export const arbeitnowProvider: Provider = {
  id: "arbeitnow",
  name: "Arbeitnow",
  description: "Free job board (Europe + remote). No key required.",
  docsUrl: "https://www.arbeitnow.com/api",
  keyless: true,
  fields: [],
  async search(params) {
    try {
      const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
        headers: { "User-Agent": "JobPilot/1.0" },
        cache: "no-store",
      });
      if (!res.ok) return { jobs: [], error: `Arbeitnow HTTP ${res.status}` };
      const json = (await res.json()) as { data?: ArbeitnowJob[] };
      let jobs = (json.data || []).map(normalize);

      const needle = (params.query || "").toLowerCase().trim();
      const tags = (params.skills || []).map((t) => t.toLowerCase());
      if (needle || tags.length) {
        jobs = jobs.filter((job) => {
          const hay = `${job.title} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
          const queryHit = needle ? hay.includes(needle) : true;
          const tagHit = tags.length ? tags.some((t) => hay.includes(t)) : true;
          return queryHit && tagHit;
        });
      }
      if (params.remoteOnly) {
        jobs = jobs.filter((j) => /remote/i.test(j.location));
      }
      return { jobs: jobs.slice(0, 50) };
    } catch (e) {
      return { jobs: [], error: e instanceof Error ? e.message : "Arbeitnow request failed" };
    }
  },
};
