"use client";

import * as React from "react";
import { useAuth } from "./useAuth";
import { calculateMatchScore } from "@/lib/match";
import type { Job, JobSearchParams, UserProfile } from "@/lib/types";

interface UseJobsResult {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  search: (params: JobSearchParams) => Promise<void>;
}

/** Fetch jobs from the search API and attach match scores from the profile. */
export function useJobs(profile?: UserProfile): UseJobsResult {
  const { getToken } = useAuth();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const search = React.useCallback(
    async (params: JobSearchParams) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch("/api/jobs/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Search failed");
        const data = (await res.json()) as { jobs: Job[] };
        const scored = profile
          ? data.jobs.map((j) => ({ ...j, matchScore: calculateMatchScore(j, profile) }))
          : data.jobs;
        setJobs(scored);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setJobs([]);
      } finally {
        setLoading(false);
      }
    },
    [getToken, profile]
  );

  return { jobs, loading, error, search };
}
