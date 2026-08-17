"use client";

import { Building2, ExternalLink, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
  onApply: (job: Job) => void;
  onSkip: (job: Job) => void;
}

/** Colored badge per source platform. */
function sourceBadge(job: Job) {
  const label = job.sourceLabel;
  const l = label.toLowerCase();
  const purple = "border border-purple-500/30 bg-purple-500/15 text-purple-400";
  const cyan = "border border-cyan-500/30 bg-cyan-500/15 text-cyan-400";
  const orange = "border border-orange-500/30 bg-orange-500/15 text-orange-400";

  if (job.source === "remoteok" || job.source === "arbeitnow")
    return <Badge variant="success">{label}</Badge>;
  if (job.source === "adzuna") return <Badge className={cyan}>{label}</Badge>;
  if (job.source === "usajobs") return <Badge className={orange}>{label}</Badge>;
  if (l.includes("linkedin") || job.source === "reed") return <Badge variant="info">{label}</Badge>;
  if (l.includes("indeed") || job.source === "jooble" || job.source === "jsearch")
    return <Badge className={purple}>{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-muted-foreground";
}

export function JobCard({ job, onApply, onSkip }: JobCardProps) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {sourceBadge(job)}
              {typeof job.matchScore === "number" && (
                <span className={`text-xs font-semibold ${scoreColor(job.matchScore)}`}>
                  {job.matchScore}% match
                </span>
              )}
            </div>
            <h3 className="mt-2 truncate text-base font-semibold">{job.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {job.company}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </span>
            </div>
          </div>
        </div>

        {job.salary && <div className="mt-3 text-sm font-medium text-primary">{job.salary}</div>}

        {job.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.tags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {job.type} · {timeAgo(job.postedAt)}
          </span>
          <div className="flex items-center gap-2">
            {job.applyUrl && (
              <a href={job.applyUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" title="Open original listing">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => onSkip(job)}>
              <X className="h-4 w-4" /> Skip
            </Button>
            <Button size="sm" onClick={() => onApply(job)}>
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
