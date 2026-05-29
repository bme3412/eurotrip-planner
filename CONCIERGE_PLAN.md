# White-glove concierge: implementation plan relative to current state

## 1. Inventory — what you already have that the concierge can stand on

| Asset | How the concierge uses it |
|---|---|
| Supabase auth + saved trips | Identity + the trip object the concierge wraps around |
| 220+ city guides (structured JSON) | Grounding data for every Claude prompt — recommendations, context, micro-moments |
| Scoring v4 + monthly + visit-calendar data | "Is this the right moment for this thing?" signal |
| Wishlist | Cheap proxy for preference until a real taste graph exists |
| Claude API integration | The reasoner — already wired |
| Google Places + Mapbox | Live venue data + maps in briefs |
| Next.js 15 + Supabase + Vercel | The whole runtime — no new platform needed |

This is more than most concierge-app startups start with. The grounding data alone is a moat.

## 2. Inventory — what's currently in flight

- `src/lib/constants/` reorg
- `src/lib/savedItems/wishlistMigration.js` (preference data hardening)
- New scoring v4 work
- Per-section lazy loading (`useCitySection`)
- Lots of new city data being added (~100+ untracked city dirs)

**Implication:** the data layer is mid-refactor. Don't graft the concierge onto a moving foundation. The first concierge work should *deliberately* be schema work — the same schema work that helps current planning anyway.

## 3. Net-new things the concierge needs

Grouped by "what it is" — not yet by order:

**A. Data / models**
- Trip lifecycle state machine (`draft → scheduled → active → completed`)
- Hour-level itinerary model (days → items with tz-aware times, durations, location refs, status)
- Concierge preferences (channel, quiet hours, tone, autonomy tier)
- Persistent message thread schema
- Taste graph (per-user durable preference store, starts trivial)
- Trip-state snapshot table (denormalized context bundle for fast prompt assembly)

**B. Platform**
- Job scheduling system (timezone-aware, retryable, observable)
- Signal monitors (weather, transit, Popular Times)
- Materiality decisioner ("did anything material change for tomorrow?")
- Channel adapter layer (push, email, SMS, in-app)
- Web Push setup (service worker + VAPID + subscription store)
- Email rendering pipeline (React Email + Resend)
- Realtime chat surface (Supabase Realtime)

**C. Agent / voice**
- Persona system (one universal concierge — pick the name)
- Prompt template library, one per message type
- Tone rule enforcement
- Context assembler module
- Token budget + cost controls
- LLM observability (Langfuse or Helicone)

**D. Commercial**
- Stripe billing
- Tier gating
- Onboarding flow (90-second setup)

**E. Ops / safety**
- Timezone correctness layer
- Quiet hours respecter
- Trust-breaking event classifier (what can override quiet hours)
- Cost dashboard per active trip

## 4. The architectural decisions that are expensive to reverse

Pick these now, before writing anything:

| Decision | Recommendation | Why |
|---|---|---|
| Job scheduler | **Inngest** | tz-aware schedules, retries, native Next.js, observable, generous free tier. Vercel Cron is too primitive; Trigger.dev is the close alternative |
| Email engine | **React Email + Resend** | Evening Brief is your hero artifact — needs full design control as a component, not an HTML string |
| Push | **Web Push API directly** | No vendor lock-in, cheap, fits your stack. Service worker + VAPID stored in Supabase |
| Realtime chat | **Supabase Realtime** | Already in stack, free at MVP volume, scales fine |
| LLM observability | **Langfuse** (self-hostable) **or Helicone** | Critical from day 1 — without it you cannot debug voice quality or cost |
| Context model | **Materialized trip-state snapshot** updated on writes | Cheaper, faster prompt assembly than rebuilding context from raw tables each call |
| Persona | **One universal concierge** with one name | The relationship that compounds across trips is the moat. Don't fragment it by city |
| Trip state | **Explicit state machine in DB**, not derived | Concierge fires conditional on `active`; needs to be unambiguous |
| Time zones | **Every itinerary item carries its own tz**; scheduled jobs compute in user's *current* tz | Mistakes here destroy trust; you can't bolt this on later |

## 5. Dependency-ordered plan

Five waves, in this order.

### Wave 0 — Foundation hardening
*Things that pay off for the existing planner too, before concierge work begins.*

- Finalize hour-level itinerary schema (used by both planning UI and concierge)
- Introduce trip state machine
- Decide and migrate preferences table
- Wire LLM observability (Langfuse) into existing Claude usage
- Pick + install Inngest

**Exit criterion:** any saved trip has a well-formed `itinerary` JSONB, a `state`, a `current_timezone`, and you can run a scheduled Inngest function against it.

### Wave 1 — Concierge primitives ("the platform")
*The reusable layer everything else stands on.*

- Context assembler module
- Prompt template registry
- Persona + voice rule system
- Channel adapter abstraction (push + in-app first; email second)
- Web Push subscription flow
- React Email scaffold

**Exit criterion:** a single test function can take `trip_id` → assemble context → call Claude with a template → render to push + in-app thread → record the message.

### Wave 2 — The MVP message rhythm
*The shippable, demo-able product.*

- Evening Brief generator (the hero — invest disproportionately here)
- Morning Wake-up generator
- Wind-down generator
- Scheduled Inngest jobs per active trip, computed in user's tz
- Quiet hours respecter
- In-app persistent chat thread (Supabase Realtime)

**Exit criterion:** a real trip, when toggled to "concierge on", receives a beautiful Evening Brief at 8pm local on day 0 and every subsequent night, plus morning and wind-down beats.

### Wave 3 — Signals + reactivity
*The "agent" comes alive.*

- Weather monitor (OpenWeather, free)
- Transit monitor — start with **one provider in your strongest market** (RATP or SNCF for France; Navitia covers more if you want breadth)
- Popular Times monitor (Google Places — careful with rate limits)
- Materiality decisioner (cheap classifier first: "did anything matter?")
- Reactive trigger pipeline
- Quiet-hours override rules ("trip-breaking" classification)

**Exit criterion:** tomorrow's forecast flips, the concierge sends a short proactive message before the user wakes up.

### Wave 4 — Personalization, billing, polish
*Turning a feature into a service people pay for.*

- Taste graph schema + feedback loop (loved/skipped on items)
- Onboarding flow (5 questions)
- Stripe + tier gating
- Email channel polish (the brief as the screenshot-worthy artifact)
- Post-trip recap email

**Exit criterion:** a paying user, onboarded in 90 seconds, receives a personalized brief that references something they liked yesterday.

### Wave 5 — Execution + expansion
*Higher-cost integrations once the agent has earned trust.*

- One reservation provider (OpenTable or Resy, pick the one with better EU coverage — OpenTable)
- One transit booking provider (Trainline for cross-EU rail is the leverage move)
- SMS / WhatsApp via Twilio (premium tier feel)
- Multi-traveler / companion mode (Supabase Realtime makes this cheap)

## 6. The smallest end-to-end slice to ship first

A "demo concierge" for **one hand-curated trip you control**:

1. Pick a real Paris itinerary already in your saved-trips system
2. Build only: context assembler, one prompt template (Evening Brief), one channel (email via React Email + Resend), one Inngest schedule (8pm Europe/Paris)
3. Fix the persona ("Olivier") and the tone rules in the prompt
4. Send yourself the Evening Brief for 7 nights

This proves:
- The hero artifact (email)
- The persona voice
- The scheduling primitive
- The context bundle shape
- The cost per night

It also gives you marketing-grade screenshots before the platform is built. Everything else compounds on this.

## 7. The risks worth surfacing now

| Risk | Mitigation |
|---|---|
| **LLM cost runaway** | Cheap classifier before expensive reasoner; cache context snapshots; per-trip cost budget alert |
| **Timezone bugs destroying trust** | Every item carries its own tz; one canonical "current trip tz" function; integration tests for multi-leg trips |
| **iOS Web Push reliability** | Email + in-app thread as the durable surface; push as an enhancement |
| **Voice quality drift across prompts** | Langfuse-backed eval set; manual review of 10 sample briefs before any prompt change ships |
| **Signal provider outage** | Per-provider retry + fallback; concierge degrades gracefully (skips signal mention, doesn't lie) |
| **Mid-trip itinerary edits while agent is monitoring** | Optimistic locking on trip-state snapshot; agent always reads from snapshot, never from raw plan |
| **Multi-traveler split decisions** | First version is explicitly per-account; concierge knows only what's in the app |
| **Trip editing UX gap** | Hour-level editing UX is a Wave 0 dependency, not a concierge-only one — also helps the existing planner |
| **GDPR / data residency** | Supabase EU region; message retention policy declared upfront |

## 8. What the concierge does *not* need yet

Deliberately deferred — don't get distracted:

- Native app (PWA + Web Push covers 80% of trip cases; native later for offline maps + background)
- Voice notes / multimodal (Phase 6+)
- Auto-execution of paid bookings (Wave 5; never default-on)
- Multi-language locale (the concierge always speaks the user's language but doesn't yet need to fluently *translate* menus — that's later)
- White-label / B2B (great long-term play; product-market fit first)

## 9. The one operational mindset shift

Concierge is the first product surface in the app that is **not stateless**.

Until now: user opens app, gets data, leaves.
With concierge: trips are *running processes* with state, timers, costs, and a service expectation 24/7 across time zones. That changes how you think about deploys (a bad migration can break an in-flight Evening Brief), on-call (an outage on a Friday night fails a Paris trip), and observability (cost per trip is now a real number you need to monitor like a SaaS bill).

No real on-call rotation needed at MVP — but the system should be designed *as if* you do. Treat every trip as a tiny live service.

---

## TL;DR

**Wave 0** locks the data model (also helps existing planner).
**Wave 1** builds reusable primitives.
**Wave 2** ships the three-touches-a-day MVP — Evening Brief is the hero.
**Wave 3** wires real-time signals + reactivity.
**Wave 4** adds personalization and billing.
**Wave 5** adds execution APIs and multi-traveler.

Pick **Inngest, React Email + Resend, Web Push, Supabase Realtime, Langfuse** now to avoid expensive reversals. Ship the demo Evening Brief on a real trip first — it'll prove or break the whole thesis in under a week of work, and the screenshot becomes a marketing asset.

The hardest parts won't be the agent — they'll be the **itinerary schema, the timezone math, and the prompt voice**. Spend disproportionate effort there.

---

## Appendix A — Product framing (the white-glove concierge model)

### What "white-glove" means as a product

| Agent | Concierge |
|---|---|
| App you open | Service that finds you |
| Reactive when invoked | Proactive on a schedule |
| Optimizes for efficiency | Optimizes for *feeling* taken care of |
| Tool voice | Persona voice |
| Sells features | Sells presence |

The product is **the rhythm of contact**, not the surface area.

### The daily rhythm

Three scheduled touches + one reactive, all timezone-aware to the user's *current* city:

**1. Evening Brief — ~8pm local, night before**
- One-sentence overview of the day's shape
- Weather + light (sunrise/golden hour if relevant)
- First activity logistics (depart-by time, recommended route)
- One small delight ("the bakery two doors from your hotel opens at 7")
- Anything that needs a decision before bed

**2. Morning Wake-up — 60–90 min before first activity**
- "Good morning."
- Current conditions vs forecast
- Live status on first item (line length, transit, weather pivot)
- Updated depart-by time if anything shifted overnight

**3. Evening Wind-down — around 9pm, end of day**
- Quiet acknowledgment of the day
- Optional journal/photo prompt
- One-line tease of tomorrow

**Reactive — only when material**
- Forecast pivots >30% precip in tomorrow's window
- Transit strike announced
- Closure / opening of a planned item
- A nearby moment worth surfacing

### The voice (half the product)

> Generic AI: *"Your Louvre visit is at 10am tomorrow."*

> White-glove: *"Tomorrow's Louvre slot is 10am — I'd leave the hotel by 9:25. The walk over Pont des Arts is lovely in morning light; that's the route I'd take. There's a Boulangerie Utopie a few doors from your hotel if you want coffee on the way."*

Three tone rules enforced in every prompt template:
1. **Specific over generic** — "the kouign-amann" not "a pastry"
2. **Opinionated, not encyclopedic** — recommend *one* thing, not a list of five
3. **Quietly knowing** — the voice of someone who lives there, not someone who Googled it

### The single sentence that should guide every product decision

> *"Would a human concierge at the Ritz do this, and would the guest feel cared for, or sold to?"*

If yes and cared for → ship it. If no or sold to → cut it.
