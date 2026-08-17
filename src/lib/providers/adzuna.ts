import type { Job } from "@/lib/types";
import type { Provider } from "./types";

interface AdzunaJob {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url?: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  created?: string;
  category?: { label?: string };
}

function normalize(j: AdzunaJob): Job {
  const salary =
    j.salary_min && j.salary_max
      ? `${Math.round(j.salary_min).toLocaleString()} - ${Math.round(j.salary_max).toLocaleString()}`
      : undefined;
  return {
    id: `adzuna_${j.id}`,
    title: j.title || "Untitled role",
    company: j.company?.display_name || "Unknown",
    location: j.location?.display_name || "Unspecified",
    salary,
    type: j.contract_time === "part_time" ? "Part-time" : "Full-time",
    description: (j.description || "").replace(/<[^>]*>/g, " ").trim(),
    applyUrl: j.redirect_url || "",
    source: "adzuna",
    sourceLabel: "Adzuna",
    postedAt: j.created || new Date().toISOString(),
    tags: j.category?.label ? [j.category.label] : [],
  };
}

/** Adzuna — global aggregator. BYOK app_id + app_key. */
export const adzunaProvider: Provider = {
  id: "adzuna",
  name: "Adzuna",
  description: "Global job aggregator with salary data across 20+ countries.",
  docsUrl: "https://developer.adzuna.com/",
  keyless: false,
  fields: [
    { key: "appId", label: "App ID", type: "text", placeholder: "app id" },
    { key: "appKey", label: "App Key", type: "password", placeholder: "app key" },
    {
      key: "country",
      label: "Country code",
      type: "text",
      placeholder: "us",
      hint: "Two-letter code: us, gb, in, au, de …",
    },
  ],
  async search(params, creds) {
    const country = (creds.country || "us").toLowerCase();
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set("app_id", creds.appId);
    url.searchParams.set("app_key", creds.appKey);
    url.searchParams.set("results_per_page", "50");
    if (params.query) url.searchParams.set("what", params.query);
    if (params.location) url.searchParams.set("where", params.location);
    if (params.remoteOnly) url.searchParams.set("what_or", "remote");
    url.searchParams.set("content-type", "application/json");

    try {
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return { jobs: [], error: `Adzuna HTTP ${res.status}` };
      const json = (await res.json()) as { results?: AdzunaJob[] };
      return { jobs: (json.results || []).map(normalize) };
    } catch (e) {
      return { jobs: [], error: e instanceof Error ? e.message : "Adzuna request failed" };
    }
  },
};
