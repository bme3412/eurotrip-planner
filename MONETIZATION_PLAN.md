## AI Subscription Monetization Plan

### Big picture
Offer a “Pro” tier that unlocks AI-powered planning, higher limits, and convenience features. Keep the free experience great (discovery, basic planner) and use lightweight paywalls/upsell moments right where users feel the value (e.g., after generating one itinerary, before exporting).

### What to sell (feature ideas)
- **AI itinerary generator (multi-city)**: Input dates, budget, interests; get a day-by-day plan with activities from `public/data/**`, travel times, and map pins.
- **Smart constraint solver**: Adjust plans around opening hours, weather seasonality (monthly JSONs), crowds, and budget.
- **RAG-powered city guide chat**: Q&A grounded in your `public/data/**` guides; suggest neighborhoods, restaurants, hidden gems.
- **Auto-reschedule**: One-click reflow when a museum is closed or weather turns.
- **Export & share**: PDF, Google Calendar, Apple Calendar, offline pack, sharable links.
- **Saved trips & collaboration**: Save multiple itineraries, invite a co-planner.
- **Credit-based media**: Unlock premium video walkthroughs from `public/videos/**` per city, downloadable offline.
- **Priority updates**: Alerts for strikes, closures, or seasonal events relevant to the trip.
- **Affiliate helper (optional hybrid)**: Embedded booking widgets (hotels, trains, experiences) with affiliate links.

### Pricing & packaging
- **Free**: 1 itinerary/day, basic chat (limited turns), no export, no save.
- **Pro Monthly**: Unlimited or high limits, full exports, save/share, collaboration, priority compute.
- **Pro Annual**: Discounted; maybe add exclusive “city packs”.
- **Credit add-ons**: Buy extra AI credits above plan.
- **Team/Family**: Shared trip workspaces.

### Auth, billing, and roles
- **Auth**: Add email+password or social login via a hosted service (Clerk, Auth0) or NextAuth. Store user profile + plan/usage.
- **Billing**:
  - Stripe (global standard) or Lemon Squeezy/Paddle (better EU VAT handling).
  - Use hosted Checkout + Customer Portal to minimize build surface.
- **Roles/entitlements**: `free` vs `pro`; store plan, renew date, and metered usage counters.

### Where it fits in this repo
- **API routes** (`src/app/api/**`):
  - `src/app/api/ai/generate/route.js`: itinerary generation
  - `src/app/api/ai/chat/route.js`: RAG chat
  - `src/app/api/usage/route.js`: read usage counters
  - `src/app/api/webhooks/{stripe|lemonsqueezy}/route.js`: subscription events
- **UI gating**:
  - Add `src/app/subscribe/page.js` and `src/app/account/**` for portal, saved trips.
  - Gate premium actions inside `src/components/EuroTripPlanner.js`, `src/components/DateSelector.jsx`, and map components with a `useUser()` + `useEntitlements()` hook.
- **Data use**:
  - Build your RAG index from `public/data/**` and monthly JSONs to ground AI answers.
  - Cache AI results per user inputs to control cost.

### Data and storage
- **DB**: Add a managed DB (Supabase, Neon/Postgres, or MongoDB Atlas).
  - Tables: `users`, `subscriptions`, `usage_counters`, `itineraries`, `chat_sessions`, `cache_entries`, `audit_logs`.
- **Caching**: Deduplicate identical prompts; short TTL cache for “explore” to keep UX snappy and reduce spend.
- **Embeddings/RAG**: Preprocess `public/data/**` into embeddings (nightly job). Store vectors in a vector DB (pgvector on Postgres, Pinecone, or Supabase Vector).

### Limits, metering, and abuse control
- **Rate limits**: Per-IP and per-user caps (middleware or API-level), burst + daily quotas.
- **Usage accounting**: Increment counters per generate/chat call; show a usage meter in Account.
- **Cost controls**: Streaming responses, smaller models for draft, upgrade to larger for “refine”; cache popular routes (e.g., Paris/4 days).
- **Observability**: Sentry for errors, PostHog/Amplitude for funnels and plan conversions.

### Billing flow
- Start free; let users try one premium action.
- Trigger upsell modal with benefits and CTA to `subscribe` page.
- Hosted checkout → webhook updates subscription → set `pro` entitlement → redirect to success.
- Customer portal for upgrades/cancellations.

### Compliance and trust (important for EU audience)
- **GDPR**: Clear privacy policy, data export/delete, DPA with vendors, cookie consent.
- **VAT**: Prefer Paddle/Lemon Squeezy if you want them to be MoR and handle VAT.
- **Security**: Store API keys in `.env`, never in client; server-only AI calls.

### Rollout plan
- **Phase 1**: Auth + Stripe/Lemon Squeezy + Pro flag + paywall; ship one standout AI feature (multi-city itinerary).
- **Phase 2**: Save/share itineraries, exports, usage meter, portal.
- **Phase 3**: RAG chat over your city data; auto-reschedule; collaboration.
- **Phase 4**: Annual plan, teams, affiliate integrations.

### Growth loops
- **Shareable trip links** with light branding.
- **“Get this exact itinerary” CTA** on public pages.
- **Email sequences**: trip reminders, refine prompts, seasonal city highlights.

### Risks and how to de-risk
- **Model cost spikes**: strong caching, tiered models, usage caps.
- **Low conversion**: test sharp paywalls after a “wow” moment, add annual plan, bundle exports.
- **Support load**: canned answers, in-product tips, limits visible upfront.

—

Implement minimally: add auth + billing + a single premium API route (`/api/ai/generate`) gated by `pro` entitlement, with a checkout page and basic usage counter. Expand from there.

### Enterprise vendor matrix (enterprise-ready on Vercel)

| Area | Primary choice | Alternatives | Key actions/notes |
|---|---|---|---|
| Hosting/CDN | Vercel Pro/Enterprise | Cloudflare in front | Enable ISR, Edge Middleware, regions; Analytics |
| Auth (B2C/B2B-ready) | Clerk | Auth0, WorkOS | Email/social now; orgs; SSO later; session revocation |
| Billing (EU VAT) | Lemon Squeezy (MoR) | Stripe + Stripe Tax | Hosted checkout + portal; entitlements; refunds; invoices |
| Webhooks | Svix | Native with retries | Signed events, replay, observability |
| DB | Neon Postgres (EU) + Prisma | Supabase Postgres | pgvector extension; PITR/backups; read replicas later |
| Cache/rate limit | Upstash Redis (EU) | Vercel Edge Config | Token bucket per IP/user; usage counters; AI cache |
| Vector DB | pgvector (in Neon) | Pinecone | Nightly embeddings job; compact index; HNSW |
| AI models | Azure OpenAI (EU) / OpenAI | Anthropic, Mistral | Tier models; streaming; evals; safety filters |
| AI tracing | Langfuse | Helicone | Track latency, cost, prompts; per-feature dashboards |
| Search | Algolia | Typesense Cloud | Index cities/regions/experiences; synonyms; A/B relevance |
| Analytics | PostHog | Amplitude + GA4 | Funnels (paywall, checkout), retention, attribution |
| Error/Perf | Sentry | Datadog | Release tracking, source maps, user feedback |
| Consent/GDPR | OneTrust | Cookiebot | Block trackers until consent; DPA; CMP logs |
| Emails | Resend | Postmark | DMARC/SPF/DKIM; branded templates; webhook events |
| A/B + Flags | LaunchDarkly | GrowthBook | Price/paywall/CTA experiments; kill switches |
| Jobs/Workflows | Inngest | Trigger.dev, Vercel Cron | RAG indexing, sitemap refresh, emails, retries |
| WAF/DDoS | Cloudflare | Fastly | Bot mitigation, Turnstile on critical forms |
| Affiliate | Booking.com, GetYourGuide, Trainline via Impact/CJ | Viator, Omio | Server-side deep-link redirector; UTM governance |
| Exports | DocRaptor | PDFMonkey | PDF/ICS server-side; rate-limit |

### Stepwise rollout checklist

- Phase 0 (1 week): Foundations
  - Vercel envs (dev/stage/prod), Sentry, PostHog, Cloudflare Turnstile
  - Neon (EU) + Prisma; Upstash Redis; enable pgvector
  - Choose Billing (Lemon Squeezy or Stripe + Tax); set up Svix sandbox

- Phase 1 (2–3 weeks): Monetization MVP
  - Clerk auth integration (profiles, orgs later)
  - Affiliate: Impact/CJ approvals; server redirector; CTAs on city cards
  - City landing template + sitemap + JSON-LD; publish top 30 cities
  - Soft paywall for exports and multi-day AI planning

- Phase 2 (2 weeks): Subscriptions live
  - Hosted checkout + customer portal; success/cancel routes
  - Webhooks via Svix → entitlement table; admin override
  - Usage counters + in-app meter; receipts/invoices emails

- Phase 3 (2–3 weeks): AI + RAG
  - Embeddings pipeline from `public/data/**`; store in pgvector
  - AI endpoints (itinerary, chat) with caching and rate limits
  - Langfuse tracing; cost limits; fallbacks to smaller models

- Phase 4 (3–4 weeks): Scale and SEO
  - Expand to 100–218 city pages; internal linking; breadcrumbs
  - Algolia search with synonyms; A/B CTA positions and copy
  - PDF/ICS export; saved trips; shareable links

- Phase 5 (ongoing): Enterprise hardening
  - OneTrust CMP; DPAs; data retention policy; audit logs
  - Cloudflare WAF; uptime/status page; error budgets
  - SSO (Auth0/WorkOS/Clerk enterprise), SLAs, org workspaces

### KPIs to track from day 1

- Paywall view → checkout → paid; churn; ARPU
- Affiliate click → booking; EPC by vertical
- AI cost/request; cache hit rate; latency p95
- SEO: indexed pages, impressions, CTR, top city rankings

### Guardrails

- Rate limits per user/IP; monthly AI budget caps
- Webhook retries/alerts; checkout failure recovery
- Privacy: block trackers pre-consent; clear data export/delete

### Team ops

- On-call via Sentry alerts; incident runbook
- Release checklist (migrations, feature flags, rollbacks)
- Vendor access/audit (secrets in Doppler or 1Password Secrets)

### Budget (typical monthly at launch)

- Vercel Pro/Edge: €50–200; Neon: €50–150; Upstash: €20–100
- Clerk/Auth: €0–200; Billing MoR/Stripe: % fees
- AI usage: €500–3,000 (cap via caching/tiers)
- Sentry/PostHog/Algolia/Langfuse: €100–600 combined

### Hand-off artifacts

- Architecture diagram, vendor matrix, DPA list
- Entitlements schema + webhook event map
- Runbooks: AI cost control, webhook recovery, affiliate QA

## Addendum – 2025-08-12: Rankings Engine and Vector DB Integration Compliance

### Alignment with plan
- The proposed deterministic rankings engine (date/window scoring using `public/data/**` weather/crowd/events) aligns with the plan’s core AI itinerary feature and data use guidance.
- RAG over `public/data/**` for itinerary composition and chat is in scope; vector DB usage is supported (primary: pgvector; Pinecone as an alternative at scale).
- Caching and per‑query keys, server‑only AI calls, and explainable outputs match plan guardrails.

### Adjustments to remain compliant
- Vector DB choice: start with pgvector on Neon Postgres; add Pinecone adapter later if scale/latency requires.
- Pro gating: place itinerary generation and advanced AI features behind `pro` entitlements; keep a limited free trial.
- Security: keep model keys and vector DB creds in server env; no client exposure.
- Limits/cost: implement per‑IP/per‑user rate limits, usage counters, streaming responses, and caching for popular queries.
- Observability: add tracing (Langfuse) and error monitoring (Sentry); track latency/cost.
- Compliance: GDPR/VAT via chosen billing provider; consent banner; privacy policy.

### Minimal delivery checklist (rankings + RAG)
- API surface:
  - `/api/ai/generate` (Pro‑gated itinerary generator, cached)
  - `/api/ai/chat` (already present; add RAG grounding)
  - `/api/usage` (usage counters)
  - `/api/webhooks/{stripe|lemonsqueezy}` (subscription events → entitlements)
- Rankings engine:
  - Deterministic composite score per city for user dates/months
  - Factors: base day/month scores, events bonus, weather comfort, crowds penalty, interest match; user‑tunable weights
  - Explainability payload (why this city) and data‑coverage guardrails
- Embeddings/RAG:
  - Nightly embeddings job over `public/data/**` (attractions, neighborhoods, seasonal activities, visit calendars)
  - Store vectors in pgvector; include metadata filters (`city_id`, `country`, `category`, `months[]`, `tags[]`)
  - Retrieval → rerank with deterministic signals → compose itinerary modules
- Ops:
  - Rate limits + usage counters; cache by (dates, interests, candidate cities) hash
  - Tracing/analytics; error monitoring; server‑only secrets

### Vector DB notes
- Start: pgvector (Neon) to reduce vendor surface; keep Pinecone as a drop‑in for larger indices/latency SLAs.
- Retrieval pattern: hybrid (metadata filters + vector similarity), MMR for diversity, deterministic rerank with rankings engine outputs.

### Data privacy and content scope
- Ground only on `public/data/**`; avoid personal data in embeddings.
- Provide citations/snippets for itinerary justifications.

### Future extensions (non‑blocking)
- Add value proxies (`priceIndex`, `connectivityScore`) to `overview.meta` to refine rankings.
- Itinerary path optimization using routing APIs with travel‑time penalties; keep results explainable.
