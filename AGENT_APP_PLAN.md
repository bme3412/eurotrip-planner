# Olivier, the actual travel agent — build plan

Successor to `CONCIERGE_PLAN.md` (whose platform items — scheduling, channels,
personas, materiality, web push, email — are now built) and to the closed-beta
launch work (invite gate, PWA, hardening). This plan covers the step from
**preview + scheduled broadcasts** to **an agent you talk to that can act on
your trip**.

The one-line thesis: the concierge today is a broadcast system. An actual agent
adds three organs to the same skeleton — **ears/mouth** (a persistent two-way
thread), **hands** (tools that modify the trip, behind a trust ladder), and
**senses** (watchers beyond weather) — wrapped around **memory**.

---

## STATUS — June 10, 2026

| Phase | State | Where |
|---|---|---|
| **T1 thread** | ✅ Built | PR #51 (`feat/agent-thread`) — migration 0012, `agentRuntime`-backed SSE turn, Trip Home, beats post into the thread |
| **T2 hands** | ✅ Built | PR #52 (`feat/agent-hands`) — `tripActions.js`, propose→Apply flow, `/agent/apply` |
| **T3 senses** | ✅ Hours watcher built; flight + strikes remain | PR #53 (`feat/agent-senses`) — migration 0013, `hoursCheck.js`, `conciergeHoursWatch` (5th Inngest fn), fix attached as proposal |
| **T4 channels** | ✅ Telegram built; WhatsApp later | `feat/agent-telegram` (PR pending gh re-auth) — migration 0014, webhook + signed link flow, beats mirror, inline Apply/Skip |
| **T5 commerce** | Not started | After retention signal |

PR stack merges top-down: **#50** (beta launch → main) ← **#51** ← **#52** ← **#53** ← T4.
614 tests green across the stack.

**Implementation deltas from the plan as written** (sections below kept for
rationale; trust these where they differ):
- The turn loop lives in `src/lib/concierge/agentRuntime.js` and Apply/Skip in
  `proposalDecision.js` — extracted in T4 so the SSE route, apply route, and
  Telegram webhook are thin adapters over one runtime.
- Proposals carry **intents, not row ids**, stored in the message row's
  `meta.proposal`; apply re-resolves against a fresh trip read and bumps
  `trips.updated_at` explicitly (activity edits don't cascade; brief caches
  key on it).
- Free-text memory got its own `concierge_memories` table (migration 0012) —
  `preferences_learned` is trip-scoped category ratings, not a fact store.
- The hours watcher sends deterministic copy with **no LLM**, and ships its fix
  as the same proposal card (closed → skip; opens later → move). New
  `hours_alert` kind needed migration 0013 (CHECK constraints + dedup index).
- Telegram links accounts via HMAC tokens in the `t.me` start payload
  (`telegram.js`), dedupes webhook retries by `update_id`, and went in before
  the remaining watchers (channel > more senses for beta feel).

**Remaining to go live end-to-end:** apply migrations 0013 + 0014 · BotFather
bot + `scripts/telegram-setup.mjs` + Telegram env vars · re-sync Inngest (5
functions) · merge the stack · the real-trip dry run (link Telegram on a
preview deploy, watch a full day's beats land, reply, apply a fix).

**Remaining build:** flight watcher → strikes scan (clone the hours pattern) ·
WhatsApp Business adapter · T5 commerce (TheFork holds, "Olivier Pro").

---

## 0. What this stands on (do not rebuild)

| Asset | Where | Reuse as |
|---|---|---|
| Deterministic trip context | `src/lib/concierge/buildContext.js` | The grounding for every agent turn |
| Brief generation + personas | `src/lib/concierge/generateBrief.js`, `personas.js` | Scheduled beats (unchanged), persona voice rules for the thread |
| Scheduling + reactive pipeline | `src/inngest/functions/*`, `materiality.js`, `reactiveScan.js` | The pattern every new watcher clones |
| Delivery channels | `notify.js`, `webpush.js`, `email.js` | Become *pointers to the thread*, not the content itself |
| One-shot Q&A | `src/app/api/trips/[id]/concierge-ask/route.js` | The grounding/prompt seed for the thread agent (then retire it) |
| Streaming tool-loop pattern | `src/app/api/plan/agent/route.js` + `src/lib/planning/agentTools.js` | SSE event shape + tool-exec structure. **Note:** planner runs on OpenAI; the thread agent must run on Anthropic (Claude owns Olivier's voice) — port the loop, not the client |
| Memory + behavior tables | `preferences_learned`, `trip_progress` (Supabase) | The taste graph starts here, not from scratch |
| Trip lifecycle | `src/lib/trips/tripLifecycle.js` | planning-mode vs traveling-mode switch |
| Beta gate + cost instrumentation | `invites.js`, `[llm-usage]` logging | Every phase ships behind the existing invite gate; unit economics measured from day one |

---

## 1. Product shape: "Today + thread"

No second app, no fork. The installed PWA gets a **traveling mode**: when a trip
is active (or starts tomorrow), the experience centers on a mobile-first
**Trip Home** at `/trips/[tripId]/today`:

- **Today view** (top): tonight/tomorrow's plan — first stop, depart-by,
  schedule, weather line. All deterministic, renders instantly (the enriched
  day scaffold from the preview work already carries this).
- **The thread** (below, primary surface): one persistent conversation with
  Olivier per trip. Scheduled beats post *into* it; the user replies in it;
  reactive alerts land in it. Push and email become receipts that deep-link to
  the thread.

The preview page stays as the marketing artifact for non-active trips. The
itinerary page stays the planning surface. Trip Home is what the app *is*
while you travel.

---

## 2. Architecture: one agent runtime, many triggers

```
   Triggers                       Runtime (per trip)                Effects
──────────────────          ───────────────────────────       ──────────────────
beat due (Inngest)    ─┐    context assembler                 thread message
weather watch         ─┤    (buildConciergeContext            push/email receipt
hours/closure watch   ─┼──▶  + memory digest                  trip edits (via
flight watch          ─┤     + thread history)        ──▶      validated tools)
user message (thread) ─┤    Claude + tool loop                 memory writes
"I'm here" button     ─┘    (Anthropic, SSE)                   booking handoffs
```

Rules that keep it safe and cheap:
- **Code owns facts; model proposes; code applies.** Every write tool is
  validated deterministically (day exists, no time collisions, activity is
  real) before touching Supabase. A hallucination can never corrupt a trip.
- **Trust ladder** per action class: inform → suggest → propose with one-tap
  Apply → auto-apply with undo (lowest stakes only). v1 ships nothing above
  "propose with Apply".
- **Refuses to be ChatGPT.** Off-trip questions get a charming one-line
  deflection (guardrail in the system prompt, like `PERSONA_GUARDRAILS`).
- **Token discipline**: trip context block under `cache_control: ephemeral`
  (already the pattern), thread history windowed to ~last 20 messages +
  summary, Haiku for watcher classification, Sonnet for voice.

---

## 3. Phase T1 — The thread (ears + mouth) — ✅ BUILT (PR #51)

The conversion moment: beta users stop receiving briefs and start talking back.

**Schema** (`supabase/migrations/0012_concierge_thread.sql`):
```sql
concierge_threads   (id, trip_id, user_id, summary, created_at, updated_at)
concierge_messages  (id, thread_id, role 'user'|'olivier'|'system',
                     kind 'chat'|'evening_brief'|'morning'|'wind_down'|'reactive'|'action',
                     body text, meta jsonb,          -- brief payload, tool receipts
                     channel 'app'|'push'|'email'|'telegram'|'whatsapp',
                     created_at)
```
RLS: owner-read; writes via service role only. Realtime publication on
`concierge_messages` (same pattern as `concierge_notifications`).

**Beats → thread.** In `notify.js`, after the notification upsert, also insert
the brief into the thread (kind = beat type, meta = full day payload).
Notifications/push/email stay as delivery receipts; their click-through URL
becomes `/trips/[tripId]/today`.

**Agent endpoint** `POST /api/trips/[id]/agent` (SSE):
- Port the tool-loop/SSE skeleton from `plan/agent/route.js` to the Anthropic
  client (the messages-API tool-use loop already exists in `generateBrief.js`).
- System prompt = `concierge-ask`'s grounding (itinerary sketch, persona,
  personalization) + memory digest + "today is day N" temporal anchor.
- **Read-only tools v1**: `get_day_details(dayNumber)`, `get_weather(date)`,
  `get_city_tips(slug)` (city-guides JSON), `directions_link(stop)` (reuse
  `mapsLink.js`), `remember(fact)` → writes `preferences_learned` (the one
  permitted write — it's memory, not trip state).
- Persist both sides to `concierge_messages` after the stream completes.
- Rate limit: new `agentThread` preset (~30 msgs/hr signed-in); invite-gated
  via `isInvited` like send-now.

**Trip Home UI** `/trips/[tripId]/today`:
- Today card from the deterministic scaffold (instant), thread below, composer
  pinned to bottom, safe-area aware. Realtime subscription appends incoming
  beats live. Reuse `BriefCard` rendering for beat-kind messages so briefs look
  like briefs inside the thread.
- Entry points: navbar "My Trips" badge during active trips; push deep-link;
  redirect the installed-PWA start to Trip Home when a trip is active.

**Done when:** a beta user gets the 20:00 brief as a push → taps → lands in
the thread → asks "is the Louvre really open Tuesday?" → grounded answer in
Olivier's voice, and the whole exchange survives reload.

---

## 4. Phase T2 — Hands (agency) — ✅ BUILT (PR #52)

**Write tools** (each a thin wrapper over `tripsRepository.js` mutations, all
returning a deterministic diff for the confirmation card):
- `move_activity(dayNumber, activityRef, newTime|newDay)`
- `swap_days(dayA, dayB)`
- `remove_activity(dayNumber, activityRef)`
- `add_activity(dayNumber, query)` — candidates from city-guides data + Google
  Places (`execSearchNearby` logic), agent picks, user confirms
- `add_note(dayNumber, text)`

**Confirmation flow:** tools don't write directly. The agent emits a
`proposal` SSE event `{ tool, args, humanDiff }`; the thread renders an Apply /
Skip card (pattern: ConciergeOptIn's "Yes, hold it / Skip" buttons). Apply
POSTs to `/api/trips/[id]/agent/apply`, which validates and executes, then
posts an `action` message ("Done — Louvre moved to Thursday 10:00") and bumps
`trip.updated_at` (which correctly invalidates the brief cache, already keyed
on it).

**Reactive alerts gain hands:** the weather reactive's "swap the Marais walk
to the morning" becomes a proposal card in the thread — one tap applies it.

**Memory in the loop:** context assembler injects a digest of
`preferences_learned` + `trip_progress` skips ("they skipped both museums") into
every beat and thread turn. The `remember` tool plus implicit skip-signals
populate it.

**Done when:** "we're exhausted, push tomorrow's morning back" results in an
applied itinerary change visible on the itinerary page, and the next morning's
wake-up reflects it.

---

## 5. Phase T3 — Senses (watchers) — ✅ hours watcher built (PR #53); flight + strikes remain

Each clones the weather pattern: Inngest cron → scan → materiality check →
thread message (proposal card when there's an obvious fix).

1. **Closure/hours check** (first — highest value per effort): night-before
   cron pulls Google Places details (`google-places/client.js`) for tomorrow's
   stops; flags closures/hour mismatches against planned times. Catches the
   "closed Tuesdays" class of itinerary bugs.
2. **Flight watch** (travel days): bookings already in `trip_state`
   (`tripBookings.js`); poll AeroDataBox (or similar) on travel-day mornings;
   delay ≥45min → proposal to reflow the arrival day.
3. **Strikes/disruptions** (the Europe brand feature): daily per-active-city
   LLM scan with web search, strict materiality prompt ("metro strike in Paris
   tomorrow?"), Haiku-classified, only material hits reach the thread.

---

## 6. Phase T4 — Channels (where it lives) — ✅ Telegram built; WhatsApp later

Thread table is canonical; channels are mirrors.
1. **Telegram bot** (~days): webhook route → agent endpoint → reply;
   `concierge_preferences.telegram_chat_id` links accounts via a deep-link
   code. Beats mirror as Telegram messages. Gives beta users the real "agent
   texts you" feel with zero install friction.
2. **WhatsApp Business API** (the endgame for a Europe product, after thread
   retention proves out): Meta verification, template messages for
   business-initiated beats, 24-hour session window for replies. Same adapter
   interface as Telegram.

---

## 7. Phase T5 — Commerce (the business model)

- Booking handoffs as proposal cards: "Chez Janou fills early — hold 19:30?"
  → TheFork (Europe's OpenTable; partner API) for restaurants, GetYourGuide/
  Viator deep links (affiliate IDs already in env) for activities.
- Pricing experiment once T1–T3 retention is visible: briefs free; the acting
  agent + watchers + booking = "Olivier Pro" per-trip. `[llm-usage]` logs are
  the margin instrument (~$2–5/trip LLM cost at heavy usage vs $15–25 price).
- Stripe only enters here — not before.

---

## 8. Cross-cutting

- **Evals before scale:** golden-trip fixtures + judge prompts for beat and
  thread quality (extends the existing fallback-path tests in
  `tests/conciergeContext.test.mjs`). Gate persona/prompt changes on them.
- **Testing pattern:** all tool validators and the context assembler are pure
  modules (extract-and-inject, plain `node:test`) — same discipline as
  `invites.js`/`unsubscribe.js`.
- **Cost guards:** thread rate limits, windowed history, prompt caching,
  watcher classification on Haiku. Add per-user daily token budget check from
  `[llm-usage]` data if beta usage surprises.
- **Trip Home is invite-gated** end to end (reuse `isInvited`).

## 9. Explicitly not building (v1)

GPS tracking (an opt-in "I'm here" button later is 80% of the value), payments
or booking-on-behalf (holds + links only), group trips, voice, native app
wrappers, multi-channel before the in-app thread retains.

## 10. Sequence

```
T1 thread ✅ ──▶ T2 hands ✅ ──▶ T3 watchers (hours ✅ → flight → strikes)
                       └──────▶ T4 Telegram ✅ ──▶ WhatsApp
T5 commerce after retention signal
```

T1–T4 (first watcher, first channel) landed June 10, 2026 — see STATUS at the
top for the PR stack, implementation deltas, and what's left.

**Next milestone: the real-trip dry run, not more code.** Merge the stack,
apply migrations 0013/0014, register the bot, invite a trip that's actually
upcoming, and watch a full day's rhythm land in Telegram — evening brief,
morning wake-up, a reply that gets a grounded answer, an hours alert fixed
with one tap. What that run teaches decides whether flight watcher, strikes,
or WhatsApp comes next.
