# Dataset Improvement & Fields Roadmap

_Last updated: 2026-05-30_

How to backfill the data the V4 scoring engine depends on, run a fresh batch for every
city, and which **new** fields to incorporate next — with sourcing, schema, and guardrails.

Companion to the May 2026 scoring audit. The scoring engine lives in `src/lib/scoring/v4`;
city data lives in `public/data/{Country}/{city}/` (built from `content/cities/{country}/{city}/`).

---

## 1. Current state

There are **two tiers of cities**:

- **222 "content" cities** — canonical source under `content/cities/{country}/{city}/*.json`,
  each with a `visit-calendar.json`. These are the ~220 that score on real data.
- **~106 legacy-only cities** — present only in `public/data/`, with **no content source and no
  `visitCalendar`**. They score entirely on fallbacks and rank near the bottom (the
  confidence-weighting added in the audit already demotes them).

### Coverage of fields the engine reads (denominator = 327 manifest cities)

| Field | Coverage | Factor it feeds | Cheapest real source |
|---|---|---|---|
| `tourismCategories` | 0% in `index.json` — **but ~227 sit in `scripts/cityMetadata.json`** | Culture (35%), beach detect | wire existing file |
| city `lat`/`lng` | 0% at city level — **but in `cityMetadata.json` + attraction sites + `src/generated/cities.json`** | gates weather backfill | wire existing file |
| `weatherHighC` / `weatherLowC` (per month) | ~34% of all / ~50% of content cities | Timing (40% of it) | Open-Meteo (free) |
| `tourismLevel` (per month) | ~39% | Crowds fallback, Timing | derive / LLM |
| `ranges[].crowdLevel` | ~67% (all content cities) | Crowds (primary) | already present |
| `connections.destinations` | ~39% | Logistics (13%) | Google Routes (already a dep) |
| `priceRange` / `costLevel` | 0% | Value (**disabled** in config) | Numbeo / Expedia MCP / heuristic |

### Two realizations that shape the work

1. **Don't source what you already have.** `scripts/cityMetadata.json` (227 cities) already
   carries `latitude`/`longitude`, `region`, `landmarks`, **and** `tourismCategories`. The first
   chunk of work is *propagating* it into the city data, not calling APIs.
2. **You already have the batch engine.** `scripts/refresh/index.mjs` (`npm run refresh`) runs a
   registered **generator** across every content city, writes to `content/`, version-stamps
   `_meta.json`, and rebuilds `public/data`. It is idempotent, has `--dry-run`, and
   `refresh stale --older-than 90d`. Each backfill = **one generator + one registry line +
   `refresh section <name>`**.

---

## 2. The vehicle: refresh generators

> ⚠️ **Phase A reality (verified):** the content build (`scripts/content/build.mjs` →
> `writeCanonical.mjs`) only writes `public/data/.../sections/*.json` + `_meta.json`. It
> deliberately does **not** own `index.json` ("must NOT modify any file the running site reads").
> **V4 scoring reads `index.json`.** So until Phase B switches the loader to canonical URLs, a
> backfill that must reach scoring has to **patch `index.json` directly** (as `enrichCoordinates.mjs`,
> `pipeline/enrich.mjs`, and the P0 script below already do). Refresh generators are still the right
> vehicle for the *content* layer; just don't assume a refresh → build reaches `index.json` yet.

Build content-layer backfills as refresh generators — that path is content-sourced, versioned, and
survives a rebuild. (`generateCityData.mjs`, `upgradeVisitCalendars.mjs`, and the Python
`scripts/enrich/` are useful **prior art to copy logic from** — concurrency, retries, API calls —
but don't fork a parallel pipeline.)

A generator is a module exposing:

```js
// scripts/refresh/generators/<name>.mjs
export const meta = { section: 'visit-calendar', kind: 'script' | 'llm', source: 'open-meteo' };
export async function generate({ city, current, ctx }) {
  // read city.{citySlug, countrySlug, contentPath}; merge into `current`; return payload (or null to skip)
}
```

Register it in `scripts/refresh/registry.mjs`, then:

```bash
npm run refresh -- section visit-calendar --dry-run   # preview
npm run refresh -- section visit-calendar             # write content/, rebuild public/data
npm run build:scores                                  # recompute monthlyScores.json
```

Generators **merge** into existing payloads (never clobber hand edits); the CLI skips writes when
the checksum is unchanged.

> **Gap to close before a 327× external-API run:** the refresh CLI is sequential and aborts the
> whole run on first error with no resume. Add a per-city checkpoint file (copy the pattern in
> `scripts/enrich/.enrichment_checkpoint.json`) so a mid-batch API failure resumes.

---

## 3. Design principles for adding fields

1. **Date-varying curves beat static scalars.** The product promise is "ranked for your exact
   dates." The four levers travelers trade on by date are **weather, crowds, price,
   events/holidays** — we have weather (partial) and crowds (coarse) and are missing the two that
   swing hardest (price, precise events/holidays). Fill those before any static field. Every new
   field should ideally be a 12-point curve, not one number.
2. **Derive/reuse before sourcing.** Daylight (lat/lng+date), walkability (attraction coords),
   heat-risk (climate data), highlights (attractions) are free transforms of data we already hold.
3. **Separate scoring signal from display content.** Tag each field's role; never let guide copy
   (tipping, currency) silently gain scoring weight.
4. **Decorrelate.** holidays → crowds → price is one causal chain. Score the *outcomes* (crowds,
   price); treat holidays/events as *explainers*, not three independent score inputs.
5. **Coverage honesty.** A field present for 30% of cities will invert rankings (cities that have
   it look "better"). Backfill to high coverage or down-weight by coverage — the trap the audit
   caught with weather.
6. **Surface it or skip it.** If a field changes neither a rank nor a displayed decision, it is
   just storage cost.

---

## 4. The envelope schema

Don't add bare scalars. Wrap every enriched field so provenance and role travel with the value:

```jsonc
"precip": {
  "byMonth": [/* 12 values, Jan..Dec */],
  "source": "open-meteo",      // open-meteo | cityMetadata | numbeo | google-routes | expedia | llm:<model> | derived | curated
  "confidence": 0.9,           // feeds the engine's confidence-weighting
  "role": "score"              // score | display
}
```

- `source` + `confidence` feed the confidence-weighting added in the audit, so guessed values
  can't masquerade as measured.
- `role` keeps display content out of the ranking.
- `byMonth[12]` enforces principle #1 (curves, not scalars).

---

## 5. Backfill plan (phases)

| Phase | Work | Vehicle | Effort | Cost |
|---|---|---|---|---|
| **P0** ✅ done | Wire `cityMetadata.json` → `tourismCategories`, `region`, `coordinates` into **`index.json`** (222 cities) | `scripts/backfillCityMetadata.mjs` (`npm run backfill:metadata`) | ½ day | $0 |
| **P1** | Weather normals → `weatherHighC/Low` (+ precip, sunshine) per month, via Open-Meteo by lat/lng | script generator (`weather`) | 1 day | free |
| **P2** | Derive `tourismLevel`, `highlights[]`, real daylight from data already present | script generator | ½ day | ~$0 |
| **P3** | `connections` (Google Routes), `priceRange`/cost components (Numbeo or Expedia MCP), then re-enable Value | script + API generators | 1–2 days | low $ |
| **P4** | The 106 legacy cities — migrate (`migrate-to-content.mjs`) or generate (`generateCityData.mjs`) then run P0–P3 | migration | 1–2 days | LLM $ |
| **P5** | `npm run build:scores`; cache auto-busts (key includes `scoringConfig.version`); re-tune Value | — | minutes | $0 |

**P0 is pure upside, no external dependency** — start there. P1 (weather) is the single biggest
ranking lever (weather is 40% of Timing and is a flat fallback for half the catalog).

---

## 6. Fields roadmap (what to incorporate next)

### Tier A — add first (date-varying, decisive, cheap)

| Field | Why | Plugs into | Source | Role |
|---|---|---|---|---|
| **Precipitation** (rainy days + mm/month) | As decisive as temperature; a wet 22°C < a dry 19°C | Timing weather | Open-Meteo | score |
| **Real daylight hours** (per city/date) | Honest daylight badge + "Most daylight" sort | badge, sort, Timing | **derive** (lat/lng+date) | score+display |
| **Public + school-holiday overlays** | Explains crowd/price spikes for exact dates (Ferragosto, half-terms, Ascension) | Crowds + "heads-up" banner | Nager.Date (free) + curated school calendars | explainer |
| **Dated real events** (start/end, not "dates vary") | Fixes the weakest content today; precise Timing event score | event strip, Timing | curated / LLM-seeded → verified | score+display |
| **Sea temperature** (coastal, per month) | Turns BeachFactor from a season guess into "swimmable" | BeachFactor | Open-Meteo Marine (free) | score |
| **Recommended length of stay** | Powers the itinerary half (`dayAllocator`) + "worth my N nights?" | planner | LLM / curation | display |

### Tier B — high value, harder/softer

| Field | Why | Source |
|---|---|---|
| **Price seasonality** (hotel/airfare index by month) | #1 budget-by-date signal | **Expedia MCP `search_hotels`/`search_flights`** to sample real prices → relative index; or Numbeo |
| **Cost components** (meal, transit pass, avg hotel, €/day) | Substantive Value factor + €/day display + "Cheapest" sort | Numbeo |
| **Traveler-type fit** | **Already stored as `ranges[].travelerTypes`, unread by V4** — surface + UI toggle | already in data |
| **Schengen/visa + Eurozone/currency flags** | Border + budget friction for multi-city routing | static |
| **Airport access** (nearest hub, # long-haul routes, transfer time) | "Can a non-European get here easily?" — Logistics only scores intra-Europe today | curated / flights data |

### Tier C — derived or niche (cheap wins + judgment calls)

- **Walkability/compactness** — derive from existing attraction coords (bounding box / mean pairwise distance) → itinerary feasibility + "walkable" tag.
- **Extreme-heat-risk flag** (days >35°C in peak summer) — derive from climate data; relevant for southern Europe in Jul/Aug.
- **Tourist tax / overtourism level** — real per-night cost (Venice fee, city taxes) + ethical peak nudge.
- **Sunshine hours / "feels-like" temp** — Open-Meteo; secondary complements to precip.
- **Safety index** — static; surface as guide content, keep out of the headline score.

### Skip (noise / low ROI)

UV, wind, pollen/mosquito season, live/real-time crowds — add scoring noise without changing
decisions for a seasonal planner.

### Already have but unused

- **`ranges[].travelerTypes`** `{families, couples, solo, business, budget, luxury}` — in every
  content city's calendar, ignored by V4. Highest-ROI "new" field: personalization for free.
- **`weatherDetails` slot** the V2 `dateScorer` reads (`rainfallMm`, `sunshineHours`) — the schema
  already anticipated precipitation; V4 stopped consuming it.

**First wave recommendation:** precipitation + real daylight + holiday/event overlays + sea-temp +
traveler-type fit. Four genuine date-curves plus a free personalization lever — all cheap, all from
Open-Meteo / public holidays / data already stored, each one changes a rank *and* something the
user sees.

---

## 7. What this unlocks in the UI

New honest sorts/filters once the data exists: **Driest**, **Cheapest / €-budget**, **Warmest
sea**, **Best for couples/families/solo**; a real dated event + holiday strip; "~€X/day"; "ideal
stay: 3 nights"; a "school-holiday week — expect crowds" heads-up.

---

## 8. Guardrails (bake into the generators)

- **Provenance + confidence per field** (the envelope schema, §4) so "measured" vs "guessed" is
  visible to both humans and the confidence-weighting.
- **Idempotent + non-destructive merge** — never clobber hand edits.
- **Validate before build** — `npm run pipeline:validate` / `pipeline:quality-check`; enforce
  enums (crowdLevel) and ranges (temps) in the generator.
- **No silent caps** — log how many cities each generator skipped (no coords, API miss) instead of
  quietly leaving them on fallback.
- **Recompute + cache-bust** — `npm run build:scores` after any batch; bump `scoringConfig.json`
  `version` whenever scoring inputs/weights change (the suggestions cache key keys off it).

---

## 9. Open decisions

1. **Scope** — backfill the 220 content cities only, or all 327 (migrate/generate the 106 legacy
   cities in P4)?
2. **Source strategy** — APIs where possible (Open-Meteo / Google Routes / Numbeo / Expedia MCP),
   or LLM-generate for speed? Recommended: APIs for weather + connections, existing-file for
   categories/coords, LLM only for soft fields (`tourismLevel`, recommended-days).
3. **Value factor** — backfill prices now (P3) to re-enable it, or leave disabled?
