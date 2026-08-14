"use client";

import * as React from "react";
import { Briefcase } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@/lib/types";

interface JobListProps {
  jobs: Job[];
  loading: boolean;
  onApply: (job: Job) => void;
  onSkip: (job: Job) => void;
  pageSize?: number;
}

export function JobList({ jobs, loading, onApply, onSkip, pageSize = 10 }: JobListProps) {
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [jobs]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <Briefcase className="h-8 w-8 text-muted-foreground" />
        <p className="mt-4 font-medium">No jobs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust your search or filters and hit &ldquo;Find Jobs&rdquo;.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(jobs.length / pageSize);
  const start = (page - 1) * pageSize;
  const pageJobs = jobs.slice(start, start + pageSize);

  return (
    <div className="space-y-4">
      {pageJobs.map((job) => (
        <JobCard key={job.id} job={job} onApply={onApply} onSkip={onSkip} />
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {jobs.length} jobs
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
