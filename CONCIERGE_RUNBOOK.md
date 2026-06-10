# Concierge — production runbook

How to take the concierge ("Olivier") from built → live. The code is done; what
remains is **configuration**: DB migrations and three integrations (Inngest,
Web Push, Resend). Work top-to-bottom; each section is independent and degrades
gracefully if skipped.

> **Closed beta:** sends are invite-only. Enforcement is server-side
> (`src/lib/concierge/invites.js`, applied in `getConciergeWindowTrips()` and
> `/api/concierge/send-now`): a user is invited when their email is on
> `CONCIERGE_ALLOWLIST` or their `concierge_waitlist` row has `invited_at` set.
> Manage invites with:
>
> ```bash
> node --env-file=.env.local scripts/concierge-invite.mjs --list           # see the waitlist
> node --env-file=.env.local scripts/concierge-invite.mjs alice@x.com     # invite (+ sends "you're in" email)
> ```
>
> Put your own email in `CONCIERGE_ALLOWLIST` so you're never locked out.
> Waitlist signups notify `CONCIERGE_OPERATOR_EMAIL` (needs Resend).

---

## What's built (so you know what you're turning on)

```
Inngest hourly cron (conciergeTick)
  └─ for each active/arriving trip, each beat due THIS hour in local tz
     (opt-in + quiet hours)  → emits concierge/brief.due
        └─ conciergeSend (retried, concurrency 5, idempotent)
              → generateConciergeDay()  [Claude]  → notify pipeline:
                   1. in-app   → concierge_notifications row → live navbar bell (Realtime)
                   2. web push → all of the user's push_subscriptions
                   3. email    → Resend (evening brief only, if opted in)
```

- **Beats (local time):** evening brief **20:00** (sets up tomorrow), morning wake-up **08:00**, wind-down **21:00**. Defaults live in `src/lib/concierge/schedule.js`.
- **Model:** `claude-sonnet-4-6`. Briefs are cached per (trip, day, trip-version) in Redis (optional).
- **Durability:** the in-app row is the source of truth; push/email are best-effort. Double idempotency (Inngest key + a DB unique key) means no double-sends.

---

## Environment variables (full reference)

| Var | Where | Purpose | Required? |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | server | brief generation | ✅ (already set) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | both | Supabase client | ✅ (already set) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | server writes (notify, scheduler) | ✅ (already set) |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | server | scheduling (prod) | ✅ for autonomy |
| `INNGEST_DEV` | server | `=1` for local dev only | local only |
| `VAPID_SUBJECT` | server | `mailto:you@domain` | for Web Push |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | server | push signing | for Web Push |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | client | push subscribe | for Web Push |
| `RESEND_API_KEY` | server | email delivery | for email |
| `FROM_EMAIL` | server | e.g. `Olivier <briefing@yourdomain.com>` | for email |
| `OPENWEATHERMAP_API_KEY` | server | reactive forecast monitor (v3) | for reactive alerts |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | server | brief cache + cross-instance rate limits | recommended in prod |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | client | route map thumbnails | optional |
| `CONCIERGE_ALLOWLIST` | server | comma-separated always-invited emails (put yours here) | ✅ for beta |
| `CONCIERGE_OPERATOR_EMAIL` | server | where waitlist-signup alerts go | recommended |
| `CONCIERGE_UNSUBSCRIBE_SECRET` | server | signs email unsubscribe links (falls back to service-role key) | optional |
| `NEXT_PUBLIC_SITE_URL` | server | absolute origin in emails (unsubscribe/invite links) | ✅ for email |

> A local VAPID keypair is already in `.env.local` (gitignored). Generate fresh keys for prod or reuse those.

---

## Go-live checklist

### 1. Database — apply migrations
Run in order in the Supabase SQL editor (or `supabase db push`). Idempotent.

- `supabase/migrations/0007_trips_client_dedup_key.sql` — if not already applied (check first)
- `supabase/migrations/0008_concierge_notifications.sql` — preferences + inbox + Realtime
- `supabase/migrations/0009_push_subscriptions.sql` — Web Push device subs (**required for push**)
- `supabase/migrations/0010_concierge_waitlist.sql` — early-access signups
- `supabase/migrations/0011_concierge_waitlist_invites.sql` — `invited_at` beta gate (**required — without it only allowlisted emails get briefs**)
- `supabase/migrations/0012_concierge_thread.sql` — agent thread + memories (**required for Trip Home** at `/trips/[tripId]/today`; beats post into the thread, push deep-links there)
- `supabase/migrations/0013_hours_alert_kind.sql` — `hours_alert` kind for the opening-hours watcher (`concierge-hours-watch`, daily 16:00 UTC; needs `GOOGLE_PLACES_API_KEY`, already set)
- `supabase/migrations/0014_telegram_channel.sql` — Telegram chat link on preferences

### Telegram channel (optional)
1. Create a bot with @BotFather (`/newbot`) → set `TELEGRAM_BOT_TOKEN` + a random `TELEGRAM_WEBHOOK_SECRET`.
2. `node --env-file=.env.local scripts/telegram-setup.mjs https://<your-domain>` — registers the webhook and prints the bot username → set `TELEGRAM_BOT_USERNAME`.
3. Users tap **Connect Telegram** on Trip Home → signed `t.me` deep link → `/start <code>` links the chat. Beats then mirror to Telegram; replies run the same agent; hours-alert fixes arrive as inline Apply/Skip buttons.
4. Local dev: Telegram can't reach localhost — use a tunnel (`ngrok http 3000`) or test on a preview deploy.

Verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('concierge_preferences', 'concierge_notifications', 'push_subscriptions');
```
Also confirm RLS is on and `concierge_notifications` is in the `supabase_realtime` publication.

### 2. Inngest — the scheduler (makes it autonomous)
1. Create a free account at inngest.com → new app.
2. Copy the **Event Key** and **Signing Key** → set `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel (Production).
3. Deploy, then in the Inngest dashboard **Sync** the app at `https://<your-domain>/api/inngest`. It should register **4 functions** (`concierge-tick`, `concierge-send`, `concierge-weather-watch`, `concierge-reactive-send`).
4. Done — the hourly cron now runs in Inngest's infra and calls your app. **No Vercel Pro needed** (Inngest owns the schedule; Vercel just serves the function).

### 3. Web Push (optional channel)
1. Generate a VAPID keypair: `node -e "console.log(require('web-push').generateVAPIDKeys())"`.
2. Set in Vercel: `VAPID_SUBJECT` (`mailto:…`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (= the public key).
3. The service worker (`public/sw.js`) + manifest are already served. **iOS only delivers push once the site is installed as a PWA** — email + in-app are the durable surfaces.

### 4. Email (optional channel)
1. Create a Resend account, **verify your sending domain** (DNS records).
2. Set `RESEND_API_KEY` + `FROM_EMAIL` (e.g. `Olivier <briefing@yourdomain.com>`) in Vercel.
3. Email fires for the **evening brief only**, and only for users with `email_enabled` (set when they toggle the concierge on).

---

## Verification (after config)

0. **Health + gate:** `curl https://<domain>/api/health` returns `ok: true` with the expected integrations `true`. A signed-in but uninvited account sees the waitlist form (not the toggle) on `/concierge`; after `concierge-invite.mjs`, the toggle appears.
2. **In-app + Realtime:** click **Send tonight's brief now** → within ~20s the **navbar bell** lights up live (no refresh) with the brief.
3. **Web Push:** enabling shows "Push on for this device"; a send delivers a real OS notification that opens the concierge page on click.
4. **Email:** with Resend live, the evening-brief send delivers a styled email.
5. **Autonomy (Inngest):** in the Inngest dashboard, invoke `concierge-tick` or send a test `concierge/brief.due` event → watch `concierge-send` run (retries, logs) and a notification land. (This is exactly what the smoke test did locally.)
6. **Mobile (real phones):** iPhone — Safari → Share → **Add to Home Screen** → open the installed app → enable Olivier → push permission prompt → "Send tonight's brief now" lands on the lock screen; tapping a Directions link opens **Apple Maps**. Android Chrome — push works in-browser; the opt-in card offers a one-tap **Install** when Chrome allows it; Directions opens Google Maps.
7. **Unsubscribe:** the brief email footer's Unsubscribe link flips `email_enabled=false` and shows a confirmation page; in-app + push unaffected.

---

## Operations

- **Tune send times:** edit `BEAT_HOURS` in `src/lib/concierge/schedule.js` (currently 20/08/21 local). Quiet-hours default 21:30–07:30 lives in `concierge_preferences` (`quiet_start`/`quiet_end`).
- **Who gets briefs:** trips with `status='active'` (within dates) or starting tomorrow, whose owner has `concierge_preferences.enabled=true`. See `getConciergeWindowTrips()`.
- **Timezone:** derived from the trip's country via `resolveTimeZone()`; the cron runs hourly UTC and computes each trip's local hour. No tz column needed.
- **Cost control:** briefs are cached 7 days per (trip, day, trip-version); the concurrency cap (5) throttles Anthropic; only the evening brief emails. Watch Anthropic + Inngest dashboards.
- **Observability:** the Inngest dashboard shows every run, retry, and failure — **turn on its failure alerts** (Settings → Notifications). Point an uptime monitor (UptimeRobot/Checkly) at `/api/health` (200 = DB up; the JSON shows which integrations are configured). App logs prefix concierge errors with `[concierge/…]`; every LLM call logs a `[llm-usage]` JSON line (tokens per brief — grep these for unit economics). Full error tracking (Sentry) is deliberately deferred until after the beta proves out — add `@sentry/nextjs` when there are strangers in the system.
- **Unit economics:** in Vercel logs, filter `[llm-usage]` → `input_tokens`/`output_tokens` per `concierge_brief`/`concierge_reactive`, keyed by tripId. Briefs cache for 7 days, so cost ≈ one generation per trip-day.
- **Disable for a user:** they toggle off (sets `enabled=false`), or set it in `concierge_preferences`. **Kill switch:** unset `INNGEST_SIGNING_KEY` (scheduler stops) — manual "send now" still works.

---

## Local development

```bash
# terminal 1 — app in Inngest dev mode
INNGEST_DEV=1 npm run dev
# terminal 2 — Inngest dev server (discovers /api/inngest)
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```
Open the Inngest dev UI (http://localhost:8288) to invoke functions and watch runs. VAPID/Resend keys in `.env.local` are optional locally (those channels no-op without them).

---

## Reactive layer (v3)

**Weather reactivity is built.** `conciergeWeatherWatch` (Inngest cron, twice daily)
scans each active trip's *tomorrow*; a conservative materiality check
(`src/lib/concierge/materiality.js` — rain ≥60% in a daytime window that's a
departure from the month's norm, or severe weather) fires `concierge/reactive.due`,
and `conciergeReactiveSend` generates a schedule-aware "the day changed" alert.
**To enable: set `OPENWEATHERMAP_API_KEY`** (without it the scan no-ops). Delivers
in-app + push (no email).

Still future: transit/strike monitors, popular-times signals, and a smarter
materiality classifier. The event-driven Inngest substrate makes these additive.
