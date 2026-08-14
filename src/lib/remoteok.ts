// RemoteOK API client (free, no auth). Returns a JSON array of jobs.
import type { Job, JobSearchParams } from "./types";

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  company_logo?: string;
  location?: string;
  description?: string;
  url?: string;
  date?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
}

/** Normalize a RemoteOK entry into the shared Job schema. */
function normalize(j: RemoteOkJob): Job {
  const salary =
    j.salary_min && j.salary_max
      ? `$${j.salary_min.toLocaleString()} - $${j.salary_max.toLocaleString()}/yr`
      : undefined;
  return {
    id: `remoteok_${j.id || j.slug}`,
    title: j.position || "Untitled role",
    company: j.company || "Unknown",
    companyLogo: j.company_logo,
    location: j.location || "Remote",
    salary,
    type: "Full-time",
    description: (j.description || "").replace(/<[^>]*>/g, " ").trim(),
    applyUrl: j.url || `https://remoteok.com/remote-jobs/${j.slug || j.id}`,
    source: "remoteok",
    sourceLabel: "RemoteOK",
    postedAt: j.date || new Date().toISOString(),
    tags: j.tags || [],
  };
}

/**
 * Fetch RemoteOK jobs and filter client-side by query text / skill tags.
 * Returns [] on error (never throws).
 */
export async function searchRemoteOk(
  params: JobSearchParams,
  skillTags: string[] = []
): Promise<Job[]> {
  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "JobPilot/1.0 (+https://jobpilot.app)" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as RemoteOkJob[];
    // First element is API legal/metadata — skip entries without a position.
    let jobs = json.filter((j) => j && j.position).map(normalize);

    const needle = (params.query || "").toLowerCase().trim();
    const tags = skillTags.map((t) => t.toLowerCase());

    if (needle || tags.length) {
      jobs = jobs.filter((job) => {
        const hay = `${job.title} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
        const queryHit = needle ? hay.includes(needle) : true;
        const tagHit = tags.length ? tags.some((t) => hay.includes(t)) : true;
        return queryHit && tagHit;
      });
    }
    return jobs.slice(0, 50);
  } catch {
    return [];
  }
}

/** Lightweight count of live RemoteOK jobs for the landing page. */
export async function remoteOkCount(): Promise<number> {
  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "JobPilot/1.0 (+https://jobpilot.app)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as RemoteOkJob[];
    return json.filter((j) => j && j.position).length;
  } catch {
    return 0;
  }
}
