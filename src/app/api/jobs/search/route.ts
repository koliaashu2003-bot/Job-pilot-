import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUid } from "@/lib/firebase-admin";
import { PROVIDERS, getProvider, hasAllCredentials } from "@/lib/providers";
import { loadCredentials } from "@/lib/sources";
import type { Credentials } from "@/lib/providers/types";
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
  // Provider ids to search. Defaults to all registered providers.
  sources: z.array(z.string()).optional(),
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

/** Env-var fallback creds for a provider (shared platform key), if any. */
function envFallback(providerId: string): Credentials | null {
  const provider = getProvider(providerId);
  if (!provider?.envFallbackKey) return null;
  const value = process.env[provider.envFallbackKey];
  return value ? { apiKey: value } : null;
}

interface NeedsAccess {
  id: string;
  name: string;
}

export async function POST(req: Request) {
  // Auth is optional: logged-out callers get keyless + env-fallback sources only.
  const uid = await verifyRequestUid(req);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const requestedIds = body.sources?.length
    ? body.sources
    : PROVIDERS.map((p) => p.id);

  const params = {
    query: body.query,
    location: body.location,
    remoteOnly: body.remoteOnly,
    datePosted: body.datePosted,
    employmentType: body.employmentType,
    page: body.page,
    skills: body.skills,
  };

  const runnable: { id: string; creds: Credentials }[] = [];
  const needsAccess: NeedsAccess[] = [];

  for (const id of requestedIds) {
    const provider = getProvider(id);
    if (!provider) continue;

    if (provider.keyless) {
      runnable.push({ id, creds: {} });
      continue;
    }

    // Prefer the user's own stored credentials.
    const userCreds = uid ? await loadCredentials(uid, id) : null;
    if (hasAllCredentials(provider, userCreds)) {
      runnable.push({ id, creds: userCreds! });
      continue;
    }

    // Fall back to a shared platform key when configured.
    const fallback = envFallback(id);
    if (fallback) {
      runnable.push({ id, creds: fallback });
      continue;
    }

    // Blocked: ask the user to connect their own access.
    needsAccess.push({ id, name: provider.name });
  }

  const settled = await Promise.all(
    runnable.map(async ({ id, creds }) => {
      const provider = getProvider(id)!;
      try {
        return await provider.search(params, creds);
      } catch (e) {
        return { jobs: [], error: e instanceof Error ? e.message : `${id} failed` };
      }
    })
  );

  const jobs = dedupe(settled.flatMap((r) => r.jobs));
  const errors = settled
    .map((r, i) => (r.error ? { id: runnable[i].id, error: r.error } : null))
    .filter(Boolean);

  return NextResponse.json({ jobs, count: jobs.length, needsAccess, errors });
}
