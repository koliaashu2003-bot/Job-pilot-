import type { Job, UserProfile } from "./types";

/**
 * Score how well a job matches a user's profile (0-100).
 * Skills 60% · target role 25% · target location 15%.
 */
export function calculateMatchScore(job: Job, profile: UserProfile): number {
  let score = 0;
  const jobText = `${job.title} ${job.description} ${job.tags.join(" ")}`.toLowerCase();

  if (profile.skills.length > 0) {
    const skillMatches = profile.skills.filter((s) =>
      jobText.includes(s.toLowerCase())
    );
    score += (skillMatches.length / profile.skills.length) * 60;
  }

  const titleMatch = profile.targetRoles.some((r) =>
    r.trim() ? jobText.includes(r.toLowerCase()) : false
  );
  if (titleMatch) score += 25;

  const locationMatch = profile.targetLocations.some((l) =>
    l.trim() ? job.location.toLowerCase().includes(l.toLowerCase()) : false
  );
  if (locationMatch) score += 15;

  return Math.round(Math.min(100, score));
}

/** Return the profile skills that appear in the job text, for display. */
export function matchedSkills(job: Job, profile: UserProfile): string[] {
  const jobText = `${job.title} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
  return profile.skills.filter((s) => s.trim() && jobText.includes(s.toLowerCase()));
}
