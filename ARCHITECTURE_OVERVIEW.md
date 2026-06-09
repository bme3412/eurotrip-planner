# EuroTrip Planner — Architecture Overview

> Read-only map for the codebase. Env vars listed by **name only**.

## 1. Stack & runtime
- **Framework:** Next.js **15.1.11**, App Router (`src/app/**`), React **19** (`package.json`).
- **Language:** mostly JavaScript (`.js`/`.jsx`); TypeScript configured but lightly used. Path alias `@/* → src/*`.
- **Package manager:** npm. Husky + lint-staged on commit. **Node 20** (`.nvmrc`, CI).
- **Hosting:** Vercel (`@vercel/analytics`, ISR via `revalidate`). `output: 'standalone'`.
- **Notable deps:** `@supabase/supabase-js`, `@anthropic-ai/sdk`, `openai`, `inngest`, `web-push`, `@upstash/redis`, `mapbox-gl`, `framer-motion`, `date-fns`, `sharp`.
- **Legacy (do not extend):** `infra/` AWS SAM stack — superseded by Inngest concierge (see `infra/README.md`).

## 2. Repo map (trimmed)
```
src/
  app/
    page.js, HomeClient.jsx           Home (+ ConciergeTeaser)
    explore/page.js                   Unified Discover (map + list views)
    results/page.jsx                  Redirect → /explore?view=list
    city-guides/[city]/…              City guide pages
    plan/page.jsx, plan/[city]        Agentic conversational planner
    saved-trips/page.js               "My Trips"
    itineraries/[tripId]/…            Saved itinerary + concierge preview
    trips/[tripId]/page.js            Public/shared trip view
    auth/callback/page.jsx            OAuth code exchange
    api/**                            Route handlers (§5)
    api/inngest/route.js              Inngest function serve endpoint
  components/                         UI (planner-v2, itinerary, city-guides, home, auth, common)
  contexts/AuthContext.js             Supabase auth (session in localStorage)
  hooks/                              useTripPlannerAgent, useItineraryGeneration, …
  lib/
    supabase/                         client + service-role server + requestAuth
    trips/                            tripsRepository, tripAccess, requireTripAccess, tripLifecycle
    concierge/                        brief generation, notify, schedule, reactive scan
    planning/                         buildMultiCityItinerary, buildItinerary, agentTools, …
    scoring/v4/                       city ranking engine
    cache/suggestions.js              Upstash Redis (suggestions + optional brief cache)
    rateLimit.js                      Anonymous rate limits on expensive LLM routes
    conversation/                     planner agent tools + prompts
  inngest/functions/                  conciergeTick, conciergeSend, conciergeWeatherWatch, conciergeReactiveSend
  middleware.js                       security headers
public/data/{Country}/{city}/         GENERATED city-guide JSON
public/sw.js                          Web Push service worker
supabase/migrations/                  0001–0009 (concierge + push in 0008/0009)
infra/                                DEPRECATED AWS SAM (asset sync scripts still useful)
CONCIERGE_PLAN.md, CONCIERGE_RUNBOOK.md
```

## 3. Data & state
**Datastores:**
1. **Supabase Postgres** — trips, itinerary granularity, saved items, concierge state.
2. **Upstash Redis** — optional cache (suggestions, brief cache) + **anonymous API rate limits**.
3. **Browser `localStorage`** — guest drafts, wishlist, favorites; migrated on sign-in.
4. **Generated JSON** — city guides in `public/data/**` (build-time, not SQL).

**Concierge tables** (`0008`, `0009`):
- `concierge_preferences` — opt-in, channels, quiet hours, timezone override
- `concierge_notifications` — durable inbox (+ Supabase Realtime for live bell)
- `push_subscriptions` — Web Push device endpoints (**apply `0009` in prod**)

**Trip access model** (`src/lib/trips/tripAccess.js`):
- Private trips: owner-only via Bearer auth (API) or client-side loader (SSR pages).
- Public trips (`is_public: true`) or valid `?share=<share_token>`: readable without auth.
- Share flow sets `is_public` and distributes `/trips/{id}?share={token}`.

## 4. Auth & users
- **Supabase Auth + Google OAuth.** Session in **localStorage** (`sb-*`) — SSR pages cannot read it; private itinerary pages use `ItineraryPrivateLoader`.
- **Service-role** admin client bypasses RLS for server writes.
- **API auth:** `Authorization: Bearer <access_token>` verified in `requestAuth.js`.

## 5. Server surface (`src/app/api/**`)
| Route | Purpose | Auth / limits |
|---|---|---|
| `conversation` | Planner agent (Claude SSE) | Anonymous rate limit; no auth required |
| `plan/agent` | Activity-swap agent (OpenAI SSE) | **Write access required** |
| `discover/command` | NL discovery commands | Anonymous rate limit |
| `trips/generate` | Anonymous full itinerary build | Anonymous rate limit |
| `trips/[id]/generate` | Persist itinerary for saved trip | Auth + write |
| `trips/[id]/concierge-brief`, `concierge-ask` | Concierge preview | Auth + read |
| `concierge/send-now`, `concierge/push/subscribe` | Manual send + push subs | Auth |
| `trips/[id]` | CRUD one trip | Auth + `tripAccess` |
| `trips/[id]/calendar` | `.ics` export | Auth + read |
| `suggestions`, `cities/*` | Ranking + city JSON | Public |
| `google-photos`, `place-photo` | Photo proxies | Public |
| `inngest` | Inngest serve (cron + events) | Inngest signing key |
| `admin/refresh` | Dev-only data refresh | Blocked in production |

**Rate limits** (`src/lib/rateLimit.js`): anonymous IPs only; Bearer present → exempt. Uses Upstash when configured, in-memory fallback otherwise. Limits: conversation 24/hr, trips/generate 8/hr, discover/command 60/hr.

## 6. External integrations (env **names** only)
- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN`
- **Anthropic** — `ANTHROPIC_API_KEY`
- **OpenAI** — `OPENAI_API_KEY`, `OPENAI_MODEL`
- **Inngest** — `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_DEV` (local)
- **Web Push** — `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Resend** — `RESEND_API_KEY`, `FROM_EMAIL`
- **OpenWeatherMap** — `OPENWEATHERMAP_API_KEY` (reactive concierge)
- **Mapbox** — `NEXT_PUBLIC_MAPBOX_TOKEN`
- **Google Places** — `GOOGLE_PLACES_API_KEY`
- **Upstash** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **CDN** — `NEXT_PUBLIC_CDN_URL`
- **Feature flags** — `ITINERARY_CLOCK_TIMES`, `ITINERARY_LLM_CURATE`, `ITINERARY_PLACES_FALLBACK`

## 7. Key workflows
**(a) Discover cities.** `/explore` (map or `?view=list`) → `/api/suggestions` → scoring v4 + cache. `/results?start&end` redirects to `/explore?mode=dates&…&view=list`. `/discover` redirects to `/explore`.

**(b) Plan + save.** `/plan` → `POST /api/conversation` → autosave `POST /api/trips/drafts` → `POST /api/trips/[id]/generate` → `trip_days`/`trip_activities`.

**(c) View itinerary.** `/itineraries/[id]` — public/share SSR; private → client auth loader. Edit agent: `POST /api/plan/agent` (auth required).

**(d) Concierge.** Opt-in → `concierge_preferences`. Inngest hourly `conciergeTick` → `conciergeSend` → `notify.js` (in-app + push + email). Reactive: `conciergeWeatherWatch` → `conciergeReactiveSend`.

## 8. Concierge (production path)
**Canonical:** Next.js + Inngest + Supabase + Claude (`src/lib/concierge/*`, `src/inngest/functions/*`).

- **Beats:** evening brief 20:00, morning 08:00, wind-down 21:00 local (`schedule.js`).
- **Channels:** in-app (Realtime bell), Web Push (`public/sw.js`), email (evening only, opt-in).
- **Reactive v3:** OWM forecast scan → materiality check → proactive alert.

**Not production:** `infra/` SAM `briefingOrchestrator` (Bedrock + Resend cron). See `infra/README.md`.

**Still placeholder:** `ConciergeWaitlist.jsx` on homepage — client-only, no persistence.

## 9. Integration seams
- **New DB** → `supabase/migrations/` + repository module + RLS.
- **New LLM route** → follow `conversation/route.js`; add `enforceAnonymousRateLimit` if public.
- **Scheduled work** → Inngest functions (not Vercel cron). Register in `api/inngest/route.js`.
- **Trip privacy** → extend `tripAccess.js`; never load private trips in SSR without gating.

## 10. Gotchas
- **Session is client-only** — SSR cannot verify owner; use API + `ItineraryPrivateLoader` for private trips.
- **Itinerary generation is synchronous** in Vercel functions — watch timeouts on multi-city + LLM curator.
- **Service-role everywhere on server** — audit new concierge/trip writes.
- **City content is JSON files** — not SQL-queryable.
- **Migrations are manual** — run `0008`/`0009` in Supabase SQL editor (`CONCIERGE_RUNBOOK.md`).
- **Rate limits need Upstash in prod** — in-memory fallback is per-instance only on serverless.

---

### TL;DR
Next.js 15 on Vercel, Supabase for trips + concierge state, Upstash for cache/rate-limits, city content as static JSON. **Olivier concierge is live in code** via Inngest scheduling + Claude generation + multi-channel `notify.js`. **`infra/` SAM is deprecated.** Trip privacy enforced via `tripAccess` (API + gated SSR). Discover lives at **`/explore`**, not `/discover`.
