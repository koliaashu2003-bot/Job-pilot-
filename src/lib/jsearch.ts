// JSearch API client (RapidAPI — Google for Jobs aggregator).
import { shortHash } from "./utils";
import type { Job, JobSearchParams } from "./types";

const JSEARCH_HOST = "jsearch.p.rapidapi.com";

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string;
  job_city?: string;
  job_country?: string;
  job_employment_type?: string;
  job_description?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_publisher?: string;
  job_required_skills?: string[];
  job_highlights?: { Qualifications?: string[] };
}

export const jsearchConfigured = () => Boolean(process.env.JSEARCH_API_KEY);

function formatSalary(j: JSearchJob): string | undefined {
  if (!j.job_min_salary && !j.job_max_salary) return undefined;
  const cur = j.job_salary_currency || "";
  const period = j.job_salary_period ? `/${j.job_salary_period.toLowerCase()}` : "";
  const fmt = (n?: number) => (n ? n.toLocaleString() : "");
  if (j.job_min_salary && j.job_max_salary)
    return `${cur} ${fmt(j.job_min_salary)} - ${fmt(j.job_max_salary)}${period}`;
  return `${cur} ${fmt(j.job_min_salary || j.job_max_salary)}${period}`;
}

function mapDatePosted(d?: JobSearchParams["datePosted"]): string {
  switch (d) {
    case "today":
      return "today";
    case "3days":
      return "3days";
    case "week":
      return "week";
    case "month":
      return "month";
    default:
      return "all";
  }
}

/** Normalize a raw JSearch job into the shared Job schema. */
function normalize(j: JSearchJob): Job {
  const location =
    [j.job_city, j.job_country].filter(Boolean).join(", ") || "Remote / Unspecified";
  return {
    id: `jsearch_${j.job_id || shortHash(j.job_title + j.employer_name)}`,
    title: j.job_title,
    company: j.employer_name,
    companyLogo: j.employer_logo,
    location,
    salary: formatSalary(j),
    type: j.job_employment_type || "Full-time",
    description: j.job_description || "",
    applyUrl: j.job_apply_link || "",
    source: "jsearch",
    sourceLabel: j.job_publisher ? `${j.job_publisher} via Google Jobs` : "Google Jobs",
    postedAt: j.job_posted_at_datetime_utc || new Date().toISOString(),
    tags: j.job_required_skills || j.job_highlights?.Qualifications?.slice(0, 6) || [],
  };
}

/** Search JSearch. Returns [] when unconfigured or on error (never throws). */
export async function searchJSearch(params: JobSearchParams): Promise<Job[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) return [];

  const query = [params.query, params.location].filter(Boolean).join(" in ") || "software";
  const url = new URL(`https://${JSEARCH_HOST}/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(params.page || 1));
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("date_posted", mapDatePosted(params.datePosted));
  if (params.remoteOnly) url.searchParams.set("remote_jobs_only", "true");
  if (params.employmentType) url.searchParams.set("employment_types", params.employmentType);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": JSEARCH_HOST,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: JSearchJob[] };
    return (json.data || []).map(normalize);
  } catch {
    return [];
  }
}
