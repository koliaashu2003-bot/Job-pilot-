// Shared TypeScript types for JobPilot.

export type Plan = "free" | "pro";

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  yearsOfExperience: number;
  skills: string[];
  targetRoles: string[];
  targetLocations: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  summary: string;
  languages: string[];
  certifications: string[];
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: Plan;
  telegramChatId?: string;
  telegramLinked: boolean;
  gmailLinked?: boolean;
  cvUrl?: string;
  profile?: UserProfile;
  notificationPrefs?: NotificationPrefs;
  createdAt?: unknown; // Firestore Timestamp
  updatedAt?: unknown; // Firestore Timestamp
}

export interface NotificationPrefs {
  jobAlerts: boolean;
  applicationConfirmations: boolean;
  weeklyDigest: boolean;
}

// Provider id string (e.g. "remoteok", "jsearch", "adzuna"). Kept as a string
// so new BYOK providers can be added without changing this union.
export type JobSource = string;

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary?: string;
  type: string;
  description: string;
  applyUrl: string;
  source: JobSource;
  sourceLabel: string;
  postedAt: string;
  tags: string[];
  matchScore?: number;
  contactEmail?: string;
}

export type ApplicationStatus = "drafted" | "sent" | "replied" | "rejected";

export interface Application {
  jobId: string;
  jobTitle: string;
  company: string;
  source: string;
  appliedAt: unknown; // Firestore Timestamp
  emailDraft: string;
  status: ApplicationStatus;
  toEmail: string;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  remoteOnly?: boolean;
  datePosted?: "today" | "3days" | "week" | "month" | "all";
  employmentType?: string;
  page?: number;
  skills?: string[];
  sources?: JobSource[];
}

export const emptyProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  fullName: "",
  email: "",
  phone: "",
  location: "",
  currentTitle: "",
  yearsOfExperience: 0,
  skills: [],
  targetRoles: [],
  targetLocations: [],
  education: [],
  experience: [],
  summary: "",
  languages: [],
  certifications: [],
  ...overrides,
});
