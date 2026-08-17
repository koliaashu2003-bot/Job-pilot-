// Claude API client: CV parsing + application-email generation.
import Anthropic from "@anthropic-ai/sdk";
import { emptyProfile, type Job, type UserProfile } from "./types";

const MODEL = "claude-sonnet-4-6";

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  return new Anthropic({ apiKey });
}

const CV_PARSER_SYSTEM = `You are a CV/resume parser. Extract the following fields from the uploaded CV and return ONLY valid JSON, no markdown, no preamble:

{
  "fullName": "",
  "email": "",
  "phone": "",
  "location": "",
  "currentTitle": "",
  "yearsOfExperience": 0,
  "skills": [],
  "targetRoles": [],
  "targetLocations": [],
  "education": [
    {
      "degree": "",
      "institution": "",
      "year": ""
    }
  ],
  "experience": [
    {
      "title": "",
      "company": "",
      "duration": "",
      "description": ""
    }
  ],
  "summary": "",
  "languages": [],
  "certifications": []
}

For targetRoles and targetLocations: infer from their experience and current role if not explicitly stated. For skills: extract both technical tools and domain skills.`;

/** Strip markdown fences and parse the first JSON object in a string. */
function parseJsonObject(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Send a base64-encoded PDF to Claude and return a normalized UserProfile. */
export async function parseCvPdf(base64Pdf: string): Promise<UserProfile> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: CV_PARSER_SYSTEM,
    messages: [
      {
        role: "user",
        // PDF document blocks are supported by the API; cast to satisfy the
        // SDK's content-block union in this version.
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
          },
          { type: "text", text: "Parse this CV and return the JSON." },
        ] as unknown as Anthropic.MessageParam["content"],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const parsed = parseJsonObject(raw);
  return normalizeProfile(parsed);
}

/** Coerce arbitrary parsed JSON into a well-formed UserProfile. */
export function normalizeProfile(data: Record<string, unknown>): UserProfile {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  return emptyProfile({
    fullName: String(data.fullName || ""),
    email: String(data.email || ""),
    phone: String(data.phone || ""),
    location: String(data.location || ""),
    currentTitle: String(data.currentTitle || ""),
    yearsOfExperience: Number(data.yearsOfExperience) || 0,
    skills: arr(data.skills),
    targetRoles: arr(data.targetRoles),
    targetLocations: arr(data.targetLocations),
    education: Array.isArray(data.education)
      ? (data.education as Record<string, unknown>[]).map((e) => ({
          degree: String(e.degree || ""),
          institution: String(e.institution || ""),
          year: String(e.year || ""),
        }))
      : [],
    experience: Array.isArray(data.experience)
      ? (data.experience as Record<string, unknown>[]).map((e) => ({
          title: String(e.title || ""),
          company: String(e.company || ""),
          duration: String(e.duration || ""),
          description: String(e.description || ""),
        }))
      : [],
    summary: String(data.summary || ""),
    languages: arr(data.languages),
    certifications: arr(data.certifications),
  });
}

const EMAIL_SYSTEM = `You are a professional job application email writer. Write a concise, compelling cold application email.

Rules:
- Max 150 words
- First line: specific to the job and company (not generic)
- Mention 2-3 relevant skills/experiences from the applicant's profile
- End with a clear call-to-action
- Professional but not stiff
- No "I am writing to express my interest" or similar clichés
- Return ONLY the email body, no subject line, no greeting, no signature`;

/** Generate a cold application email body for a job + profile. */
export async function generateApplicationEmail(
  job: Pick<Job, "title" | "company" | "location" | "description">,
  profile: UserProfile
): Promise<string> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 512,
    system: EMAIL_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Applicant profile: ${JSON.stringify(profile)}
Job: ${job.title} at ${job.company}, ${job.location}
Job description: ${(job.description || "").slice(0, 500)}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text.trim() : "";
}
