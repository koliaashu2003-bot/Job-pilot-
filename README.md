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
| Job data | JSearch (RapidAPI) + RemoteOK |
| CV parsing / emails | Anthropic Claude (`claude-sonnet-4-6`) |
| Email drafts | Gmail API (OAuth2) |
| Notifications | Telegram Bot API |
| Deploy | Vercel (+ Vercel Cron) |

## Features

- **CV → profile.** Upload a PDF; Claude extracts a structured, editable profile.
- **Global job search.** Aggregates JSearch (Google for Jobs) + RemoteOK, deduped and normalized.
- **Match scoring.** Ranks jobs by skill (60%), target role (25%), and location (15%) overlap.
- **One-click apply.** Generates a tailored cold email and a Gmail draft with your CV attached.
- **Telegram alerts.** Link your account for application confirmations and (Pro) new-job alerts.
- **Automated polling.** A 6-hour cron notifies Pro users of new high-match jobs.
- **Applications tracker.** Table of every draft with editable status + stats.
- Dark-only, mobile-responsive UI.

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
