import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PROVIDERS, getProvider, hasAllCredentials } from "@/lib/providers";
import { loadCredentials } from "@/lib/sources";
import { calculateMatchScore, matchedSkills } from "@/lib/match";
import { formatJobMatch, sendTelegramMessage } from "@/lib/telegram";
import type { Credentials } from "@/lib/providers/types";
import type { Job, JobSearchParams, User } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MATCH_THRESHOLD = 60;
// Budget of paid/keyed (non-keyless) provider calls per cron run.
const MAX_EXTERNAL_CALLS = 50;
const TOP_N = 3;

/** Env-var fallback creds for a provider (shared platform key), if any. */
function envFallback(providerId: string): Credentials | null {
  const provider = getProvider(providerId);
  if (!provider?.envFallbackKey) return null;
  const value = process.env[provider.envFallbackKey];
  return value ? { apiKey: value } : null;
}

/**
 * Cron-triggered (every 6h via Vercel Cron). For each Pro user, fetch fresh
 * jobs, dedupe against previously seen ids, score, and Telegram-notify the top
 * new matches. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usersSnap = await adminDb()
    .collection("users")
    .where("plan", "==", "pro")
    .where("telegramLinked", "==", true)
    .get();

  let externalCalls = 0;
  let notified = 0;
  const processed: string[] = [];

  for (const doc of usersSnap.docs) {
    const user = { uid: doc.id, ...(doc.data() as Omit<User, "uid">) };
    const profile = user.profile;
    if (!profile || !user.telegramChatId) continue;
    if (user.notificationPrefs?.jobAlerts === false) continue;

    const query = [profile.targetRoles?.[0], profile.currentTitle]
      .filter(Boolean)
      .join(" ") || "";
    const location = profile.targetLocations?.[0];
    const params: JobSearchParams = {
      query,
      location,
      datePosted: "3days",
      skills: profile.skills || [],
    };

    // Search across the user's own connected providers (+ keyless + env
    // fallbacks), respecting the per-run budget for keyed providers.
    const searches: Promise<Job[]>[] = [];
    for (const provider of PROVIDERS) {
      let creds: Credentials | null = {};
      if (!provider.keyless) {
        const userCreds = await loadCredentials(user.uid, provider.id);
        creds = hasAllCredentials(provider, userCreds)
          ? userCreds
          : envFallback(provider.id);
        if (!creds) continue; // user hasn't connected this provider
        if (externalCalls >= MAX_EXTERNAL_CALLS) continue; // budget spent
        externalCalls++;
      }
      searches.push(
        provider
          .search(params, creds || {})
          .then((r) => r.jobs)
          .catch(() => [])
      );
    }

    let jobs: Job[] = (await Promise.all(searches)).flat();

    // Load seen ids.
    const seenRef = adminDb().collection("seenJobs").doc(user.uid);
    const seenSnap = await seenRef.get();
    const seenIds: string[] = seenSnap.exists ? (seenSnap.data()!.jobIds as string[]) || [] : [];
    const seenSet = new Set(seenIds);

    // Filter to new + above threshold.
    const matches = jobs
      .filter((j) => !seenSet.has(j.id))
      .map((j) => ({ ...j, matchScore: calculateMatchScore(j, profile) }))
      .filter((j) => (j.matchScore ?? 0) > MATCH_THRESHOLD)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    for (const job of matches.slice(0, TOP_N)) {
      const ok = await sendTelegramMessage(
        user.telegramChatId,
        formatJobMatch(job, matchedSkills(job, profile))
      );
      if (ok) notified++;
    }

    // Persist newly seen ids (cap history to avoid unbounded growth).
    const newSeen = [...seenIds, ...matches.map((m) => m.id)].slice(-500);
    await seenRef.set({ jobIds: newSeen, lastPollAt: new Date().toISOString() });
    processed.push(user.uid);
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: processed.length,
    notificationsSent: notified,
    externalCalls,
  });
}
