import { NextResponse } from "next/server";
import { z } from "zod";
import { searchJSearch } from "@/lib/jsearch";
import { searchRemoteOk } from "@/lib/remoteok";
import type { Job } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  remoteOnly: z.boolean().optional(),
  datePosted: z.enum(["today", "3days", "week", "month", "all"]).optional(),
  employmentType: z.string().optional(),
  page: z.number().int().min(1).optional(),
  skills: z.array(z.string()).optional(),
  sources: z.array(z.enum(["jsearch", "remoteok"])).optional(),
});

/** Deduplicate by normalized title+company. */
function dedupe(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const job of jobs) {
    const key = `${job.title}::${job.company}`.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sources = body.sources || ["jsearch", "remoteok"];
  const params = {
    query: body.query,
    location: body.location,
    remoteOnly: body.remoteOnly,
    datePosted: body.datePosted,
    employmentType: body.employmentType,
    page: body.page,
  };

  const tasks: Promise<Job[]>[] = [];
  if (sources.includes("jsearch")) tasks.push(searchJSearch(params));
  if (sources.includes("remoteok")) tasks.push(searchRemoteOk(params, body.skills || []));

  const results = await Promise.all(tasks);
  const jobs = dedupe(results.flat());

  return NextResponse.json({ jobs, count: jobs.length });
}
