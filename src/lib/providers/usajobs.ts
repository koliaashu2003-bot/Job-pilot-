import type { Job } from "@/lib/types";
import type { Provider } from "./types";

interface UsaJobItem {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: {
    PositionTitle?: string;
    OrganizationName?: string;
    PositionURI?: string;
    ApplyURI?: string[];
    PositionLocationDisplay?: string;
    PositionRemuneration?: { MinimumRange?: string; MaximumRange?: string }[];
    PublicationStartDate?: string;
    PositionSchedule?: { Name?: string }[];
    QualificationSummary?: string;
    UserArea?: { Details?: { JobSummary?: string } };
  };
}

function normalize(item: UsaJobItem): Job {
  const d = item.MatchedObjectDescriptor || {};
  const pay = d.PositionRemuneration?.[0];
  const salary =
    pay?.MinimumRange && pay?.MaximumRange
      ? `$${Number(pay.MinimumRange).toLocaleString()} - $${Number(pay.MaximumRange).toLocaleString()}`
      : undefined;
  return {
    id: `usajobs_${item.MatchedObjectId}`,
    title: d.PositionTitle || "Untitled role",
    company: d.OrganizationName || "US Government",
    location: d.PositionLocationDisplay || "United States",
    salary,
    type: d.PositionSchedule?.[0]?.Name || "Full-time",
    description: (d.UserArea?.Details?.JobSummary || d.QualificationSummary || "").trim(),
    applyUrl: d.ApplyURI?.[0] || d.PositionURI || "",
    source: "usajobs",
    sourceLabel: "USAJobs",
    postedAt: d.PublicationStartDate || new Date().toISOString(),
    tags: [],
  };
}

/** USAJobs — US federal jobs. BYOK email (User-Agent) + API key. */
export const usajobsProvider: Provider = {
  id: "usajobs",
  name: "USAJobs (US Gov)",
  description: "Official US federal government job listings.",
  docsUrl: "https://developer.usajobs.gov/",
  keyless: false,
  fields: [
    {
      key: "email",
      label: "Registered Email",
      type: "text",
      placeholder: "you@example.com",
      hint: "The email you registered with USAJobs (sent as User-Agent).",
    },
    { key: "apiKey", label: "API Key", type: "password", placeholder: "your usajobs key" },
  ],
  async search(params, creds) {
    const url = new URL("https://data.usajobs.gov/api/search");
    if (params.query) url.searchParams.set("Keyword", params.query);
    if (params.location) url.searchParams.set("LocationName", params.location);
    url.searchParams.set("ResultsPerPage", "50");

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Host: "data.usajobs.gov",
          "User-Agent": creds.email,
          "Authorization-Key": creds.apiKey,
        },
        cache: "no-store",
      });
      if (!res.ok) return { jobs: [], error: `USAJobs HTTP ${res.status}` };
      const json = (await res.json()) as {
        SearchResult?: { SearchResultItems?: UsaJobItem[] };
      };
      return { jobs: (json.SearchResult?.SearchResultItems || []).map(normalize) };
    } catch (e) {
      return { jobs: [], error: e instanceof Error ? e.message : "USAJobs request failed" };
    }
  },
};
