import type { Job } from "@/lib/types";
import type { Provider } from "./types";

interface ReedJob {
  jobId?: number;
  jobTitle?: string;
  employerName?: string;
  locationName?: string;
  jobUrl?: string;
  jobDescription?: string;
  minimumSalary?: number;
  maximumSalary?: number;
  date?: string;
  contractType?: string;
}

function normalize(j: ReedJob): Job {
  const salary =
    j.minimumSalary && j.maximumSalary
      ? `£${j.minimumSalary.toLocaleString()} - £${j.maximumSalary.toLocaleString()}`
      : undefined;
  return {
    id: `reed_${j.jobId}`,
    title: j.jobTitle || "Untitled role",
    company: j.employerName || "Unknown",
    location: j.locationName || "United Kingdom",
    salary,
    type: j.contractType || "Full-time",
    description: (j.jobDescription || "").replace(/<[^>]*>/g, " ").trim(),
    applyUrl: j.jobUrl || "",
    source: "reed",
    sourceLabel: "Reed",
    postedAt: j.date || new Date().toISOString(),
    tags: [],
  };
}

/** Reed.co.uk — UK jobs. BYOK API key (used as HTTP basic-auth username). */
export const reedProvider: Provider = {
  id: "reed",
  name: "Reed (UK)",
  description: "One of the UK's largest job boards.",
  docsUrl: "https://www.reed.co.uk/developers",
  keyless: false,
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "your reed key",
      hint: "Register at reed.co.uk/developers for a free API key.",
    },
  ],
  async search(params, creds) {
    const url = new URL("https://www.reed.co.uk/api/1.0/search");
    if (params.query) url.searchParams.set("keywords", params.query);
    if (params.location) url.searchParams.set("locationName", params.location);
    url.searchParams.set("resultsToTake", "50");

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.apiKey}:`).toString("base64")}`,
        },
        cache: "no-store",
      });
      if (!res.ok) return { jobs: [], error: `Reed HTTP ${res.status}` };
      const json = (await res.json()) as { results?: ReedJob[] };
      return { jobs: (json.results || []).map(normalize) };
    } catch (e) {
      return { jobs: [], error: e instanceof Error ? e.message : "Reed request failed" };
    }
  },
};
