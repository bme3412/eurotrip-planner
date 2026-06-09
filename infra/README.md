# AWS SAM stack (`infra/`) — legacy / deprecated

> **Do not deploy this stack for new concierge work.** The production concierge path
> lives in the Next.js app + **Inngest** (`src/inngest/functions/*`, served at
> `/api/inngest`). See [`CONCIERGE_RUNBOOK.md`](../CONCIERGE_RUNBOOK.md).

## What this folder is

An early scaffold for Olivier's nightly briefing:

- `handlers/briefingOrchestrator.js` — EventBridge cron → Bedrock Briefing Agent → Resend email
- Action-group Lambdas (`cityData`, `googlePlaces`, `weather`, `itinerary`) for Bedrock tools
- `sync-*.sh` — S3/CloudFront asset sync (still useful independently of the SAM app)

## Why it's deprecated

The in-app concierge now handles:

| Concern | Canonical location |
|---------|-------------------|
| Scheduling | Inngest (`conciergeTick`, `conciergeWeatherWatch`) |
| Brief generation | `src/lib/concierge/generateBrief.js` (Claude) |
| Delivery | `src/lib/concierge/notify.js` (in-app, Web Push, Resend) |
| Reactive weather | `conciergeReactiveSend` + `src/lib/concierge/reactiveScan.js` |
| State | Supabase `0008`/`0009` migrations |

Running **both** SAM and Inngest against the same trips risks duplicate emails and split observability.

## Still useful here

- `sync-images.sh` / `sync-city-data.sh` — CDN asset pipeline (referenced in root `README.md`)
- `events/*.json` — sample Bedrock tool payloads (reference only)

## If you need to retire the stack

1. Disable/remove the EventBridge rule in AWS for `briefingOrchestrator`.
2. Delete the SAM stack (`sam delete`) once Inngest + Vercel env vars are live.
3. Keep `sync-*.sh` in the repo for asset publishing.
