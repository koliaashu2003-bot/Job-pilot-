"use client";

import * as React from "react";
import { Plug, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useJobs } from "@/hooks/useJobs";
import { useSources, type ProviderMeta } from "@/hooks/useSources";
import { JobList } from "@/components/job-list";
import { ApplyModal } from "@/components/apply-modal";
import { SourceConnectDialog } from "@/components/source-connect-dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Job, JobSearchParams } from "@/lib/types";

type SortKey = "relevance" | "date" | "salary";

/** Parse a leading number out of a salary string for rough sorting. */
function salaryValue(s?: string): number {
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/\d+/);
  return m ? Number(m[0]) : 0;
}

export default function JobsPage() {
  const { user } = useAuth();
  const profile = user?.profile;
  const { jobs, loading, error, needsAccess, hasSearched, search } = useJobs(profile);
  const { providers, connected, connect } = useSources();

  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [remoteOnly, setRemoteOnly] = React.useState(false);
  const [datePosted, setDatePosted] = React.useState<JobSearchParams["datePosted"]>("week");
  const [employmentType, setEmploymentType] = React.useState("");
  const [selectedSources, setSelectedSources] = React.useState<Set<string>>(new Set());
  const [sort, setSort] = React.useState<SortKey>("relevance");

  const [activeJob, setActiveJob] = React.useState<Job | null>(null);
  const [connectProvider, setConnectProvider] = React.useState<ProviderMeta | null>(null);
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());

  // Select all providers by default once metadata loads.
  React.useEffect(() => {
    if (providers.length && selectedSources.size === 0) {
      setSelectedSources(new Set(providers.map((p) => p.id)));
    }
  }, [providers, selectedSources.size]);

  // Pre-fill from profile once loaded.
  React.useEffect(() => {
    if (profile) {
      setQuery((q) => q || profile.targetRoles?.[0] || profile.currentTitle || "");
      setLocation((l) => l || profile.targetLocations?.[0] || "");
    }
  }, [profile]);

  function runSearch() {
    search({
      query,
      location,
      remoteOnly,
      datePosted,
      employmentType: employmentType || undefined,
      skills: profile?.skills,
      sources: Array.from(selectedSources),
    });
  }

  function toggleSource(id: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const visible = React.useMemo(() => {
    let list = jobs.filter((j) => !skipped.has(j.id));
    if (sort === "date") {
      list = [...list].sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      );
    } else if (sort === "salary") {
      list = [...list].sort((a, b) => salaryValue(b.salary) - salaryValue(a.salary));
    } else {
      list = [...list].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }
    return list;
  }, [jobs, skipped, sort]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Find jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Searches every platform you&apos;ve connected, ranked by fit.
          </p>
        </div>
      </header>

      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Role or keywords"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
        </div>
        <Input
          className="sm:w-56"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <Button onClick={runSearch} disabled={loading}>
          <Search className="h-4 w-4" /> Find Jobs
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Filters */}
        <aside className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </div>

          <div className="space-y-1.5">
            <Label>Date posted</Label>
            <Select
              value={datePosted}
              onChange={(e) => setDatePosted(e.target.value as JobSearchParams["datePosted"])}
            >
              <option value="today">Today</option>
              <option value="3days">Last 3 days</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="all">Any time</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Job type</Label>
            <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              <option value="">Any</option>
              <option value="FULLTIME">Full-time</option>
              <option value="PARTTIME">Part-time</option>
              <option value="CONTRACTOR">Contract</option>
              <option value="INTERN">Internship</option>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Remote only
          </label>

          {/* Dynamic provider list */}
          <div className="space-y-2">
            <Label>Platforms</Label>
            {providers.map((p) => {
              const isConnected = p.keyless || connected.includes(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSources.has(p.id)}
                      onChange={() => toggleSource(p.id)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    {p.name}
                  </label>
                  {!isConnected && (
                    <button
                      type="button"
                      onClick={() => setConnectProvider(p)}
                      className="text-xs text-primary hover:underline"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label>Sort by</Label>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="salary">Salary</option>
            </Select>
          </div>
        </aside>

        {/* Results */}
        <div>
          {error && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {!profile && (
            <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
              Complete your profile to get personalized match scores.
            </div>
          )}

          {/* Blocked platforms → prompt to connect */}
          {needsAccess.length > 0 && (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plug className="h-4 w-4 text-primary" /> Unlock more jobs
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                These platforms need your own access to search. Connect them to widen your results.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {needsAccess.map((na) => {
                  const meta = providers.find((p) => p.id === na.id) || null;
                  return (
                    <Button
                      key={na.id}
                      variant="outline"
                      size="sm"
                      onClick={() => meta && setConnectProvider(meta)}
                    >
                      <Plug className="h-3.5 w-3.5" /> Connect {na.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {hasSearched && !loading && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{visible.length} results</Badge>
            </div>
          )}

          <JobList
            jobs={visible}
            loading={loading}
            onApply={(job) => setActiveJob(job)}
            onSkip={(job) => setSkipped((s) => new Set(s).add(job.id))}
          />
        </div>
      </div>

      <ApplyModal
        job={activeJob}
        open={!!activeJob}
        onClose={() => setActiveJob(null)}
        onDrafted={() => setActiveJob(null)}
      />

      <SourceConnectDialog
        provider={connectProvider}
        open={!!connectProvider}
        onClose={() => setConnectProvider(null)}
        onConnect={connect}
      />
    </div>
  );
}
