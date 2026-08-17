# JobPilot

> Find jobs globally. Apply in one click.

JobPilot is a full-stack web app where users upload their CV, get an auto-filled
profile, search live jobs worldwide, and apply via auto-generated Gmail drafts.
Pro users receive real-time Telegram alerts for new matching jobs.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API routes |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google + Email/Password) |
| Storage | Firebase Storage (CV uploads) |
| Job data | Pluggable providers: RemoteOK, Arbeitnow, JSearch, Adzuna, Jooble, Reed, USAJobs (bring-your-own-key) |
| CV parsing / emails | Anthropic Claude (`claude-sonnet-4-6`) |
| Email drafts | Gmail API (OAuth2) |
| Notifications | Telegram Bot API |
| Deploy | Vercel (+ Vercel Cron) |

## Features

- **CV → profile.** Upload a PDF; Claude extracts a structured, editable profile.
- **Multi-platform job search.** Aggregates every platform the user connects, deduped and normalized.
- **Bring-your-own-access.** Free sources are always on; keyed platforms are connected per user with their own API keys. When a platform is blocked for lack of access, the app prompts that user to connect it — right from the search page.
- **Match scoring.** Ranks jobs by skill (60%), target role (25%), and location (15%) overlap.
- **One-click apply.** Generates a tailored cold email and a Gmail draft with your CV attached.
- **Telegram alerts.** Link your account for application confirmations and (Pro) new-job alerts.
- **Automated polling.** A 6-hour cron notifies Pro users of new high-match jobs across their connected sources.
- **Applications tracker.** Table of every draft with editable status + stats.
- Dark-only, mobile-responsive UI.

## Job sources (bring your own access)

JobPilot ships a **provider registry** (`src/lib/providers/`). Each user connects
the platforms they have access to under **Settings → Job sources**; credentials
are encrypted (AES-256-GCM) with `TOKEN_ENCRYPTION_KEY` and stored per user in
`users/{uid}/sources/{providerId}` — never exposed to the browser.

| Provider | Access needed | Notes |
|---|---|---|
| RemoteOK | none | Free, always on |
| Arbeitnow | none | Free (Europe + remote), always on |
| JSearch (Google Jobs) | RapidAPI key | LinkedIn/Indeed/Glassdoor via Google for Jobs. Optional shared fallback via `JSEARCH_API_KEY` |
| Adzuna | app_id + app_key + country | Global, salary data |
| Jooble | API key | 70+ countries |
| Reed | API key | UK |
| USAJobs | email + API key | US federal jobs |

When a search includes a platform the user hasn't connected, `/api/jobs/search`
returns it in a `needsAccess` array instead of failing — the UI turns that into
a **“Connect {platform}”** prompt. To add a new platform, drop a file in
`src/lib/providers/` implementing the `Provider` interface and register it in
`src/lib/providers/index.ts`.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the values (see [Environment variables](#environment-variables)).

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

> The app renders without any keys, but auth, search, parsing, drafts, and
> notifications each require their respective services to be configured.

## Environment variables

All keys are documented in [`.env.local.example`](./.env.local.example).

| Group | Vars | Where to get them |
|---|---|---|
| Firebase (client) | `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project settings → Your apps |
| Firebase (admin) | `FIREBASE_ADMIN_SERVICE_ACCOUNT` | Project settings → Service accounts → Generate key (paste the JSON as one line) |
| Jobs | `JSEARCH_API_KEY` | [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) |
| Claude | `ANTHROPIC_API_KEY` | <https://console.anthropic.com> |
| Gmail OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google Cloud Console → Credentials → OAuth client |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | [@BotFather](https://t.me/botfather) |
| App | `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `TOKEN_ENCRYPTION_KEY` | Your domain + generated secrets |

Generate secrets:

```bash
# CRON_SECRET / TELEGRAM_WEBHOOK_SECRET
openssl rand -hex 32
# TOKEN_ENCRYPTION_KEY (base64-encoded 32 bytes)
openssl rand -base64 32
```

## Service setup

### Firebase

1. Create a Firebase project; enable **Authentication** (Google + Email/Password),
   **Firestore**, and **Storage**.
2. Deploy the security rules in this repo:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
3. Copy the web app config into the `NEXT_PUBLIC_FIREBASE_*` vars, and a service
   account key into `FIREBASE_ADMIN_SERVICE_ACCOUNT`.

### Gmail OAuth2

1. In Google Cloud Console, enable the **Gmail API**.
2. Create an OAuth client (Web application). Add the redirect URI
   `${NEXT_PUBLIC_APP_URL}/api/auth/gmail`.
3. Scope used: `https://www.googleapis.com/auth/gmail.compose`.
4. Refresh tokens are encrypted (AES-256-GCM) with `TOKEN_ENCRYPTION_KEY`
   before being stored in Firestore under `users/{uid}/tokens/gmail`.

### Telegram bot

1. Create a bot with [@BotFather](https://t.me/botfather); set `TELEGRAM_BOT_TOKEN`.
2. Register the webhook (once deployed):
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$NEXT_PUBLIC_APP_URL/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
3. Users link by generating a 6-digit code in Settings and sending it to the bot.

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Add all environment variables from `.env.local.example`.
3. `vercel.json` schedules the polling cron every 6 hours. Vercel automatically
   sends `Authorization: Bearer $CRON_SECRET` to `/api/jobs/poll`.
4. Set `NEXT_PUBLIC_APP_URL` and `GOOGLE_REDIRECT_URI` to your production domain,
   and re-register the Telegram webhook against it.

## Project structure

```
src/
├── app/
│   ├── (auth)/            # login, signup
│   ├── (dashboard)/       # jobs, profile, applications, services, settings
│   ├── api/               # cv/parse, jobs/{search,poll}, apply/draft,
│   │                      # auth/gmail, telegram/{webhook,notify,link}
│   ├── page.tsx           # landing
│   └── layout.tsx
├── components/            # UI primitives + feature components
├── hooks/                 # useAuth, useJobs, useProfile
└── lib/                   # firebase, claude, jsearch, remoteok, gmail,
                           # telegram, match, crypto, types
```

## Firestore collections

```
users/{uid}                        # profile, plan, telegram/gmail flags
users/{uid}/tokens/{provider}      # encrypted OAuth refresh tokens
users/{uid}/sources/{providerId}   # encrypted per-user job-provider API keys
applications/{uid}/items/{appId}   # tracked applications
seenJobs/{uid}                     # jobIds already notified + lastPollAt
linkCodes/{code}                   # short-lived Telegram link codes
jobs/{jobId}                       # optional cached listings
```

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # serve production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Roadmap (Phase 2)

- Payments (Razorpay + Stripe) for Pro upgrades
- Services tab functionality (CV review, LinkedIn optimization, interview prep)
- Admin panel and analytics

## Security notes

- All third-party API keys are server-side only.
- OAuth refresh tokens are encrypted at rest.
- Firestore/Storage rules scope every document and file to its owner.
- API routes verify Firebase ID tokens; the cron route is guarded by `CRON_SECRET`.
