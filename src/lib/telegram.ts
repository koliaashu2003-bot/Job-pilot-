// Telegram Bot API client.
import type { Job } from "./types";

const API_BASE = "https://api.telegram.org";

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set.");
  return t;
}

/** Send a Markdown message to a chat. Returns true on success. */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  disablePreview = true
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bot${token()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: disablePreview,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Register the webhook URL with Telegram. */
export async function setTelegramWebhook(url: string, secret?: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/bot${token()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret }),
  });
  return res.ok;
}

/** Format a job match notification (Telegram Markdown). */
export function formatJobMatch(job: Job, matchedSkillNames: string[]): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jobpilot.app";
  const lines = [
    `🔔 *New Job Match (${job.matchScore ?? 0}% fit)*`,
    "",
    `*${job.title}*`,
    `🏢 ${job.company} — ${job.location}`,
  ];
  if (job.salary) lines.push(`💰 ${job.salary}`);
  lines.push(`📍 Source: ${job.sourceLabel}`);
  if (matchedSkillNames.length) {
    lines.push("", `Skills matched: ${matchedSkillNames.slice(0, 5).join(", ")}`);
  }
  lines.push("", `[View & Apply](${appUrl}/jobs)`);
  return lines.join("\n");
}

/** Format the "draft created" confirmation. */
export function formatDraftCreated(jobTitle: string, company: string): string {
  return `✅ Draft created for *${jobTitle}* at *${company}*. Check your Gmail drafts.`;
}
