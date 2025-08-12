## Rankings Engine Blueprint (2025-08-12)

### Purpose
Rank European destinations for a user’s travel window and interests using deterministic, explainable scoring over `public/data/**`, producing a composite score per city and human-readable reasons. Outputs seed candidates for itinerary generation.

### Scope
- Modes: exact dates, flexible months, duration-only scanning
- Outputs: ranked cities with scores, breakdown, top date window(s), notable events
- Integrates with Pro itinerary generation and AI RAG (separate layer)

## Inputs and Modes
- User inputs
  - dates: { mode: dates | month | duration, start, end, month, amount, unit }
  - interests: high-level categories (e.g., beach, culture, nightlife, hiking, museums, food)
  - preferences (weights): weather tolerance, crowd aversion, budget sensitivity, event-seeking
  - constraints (optional): max hops, target countries/regions, mobility constraints
- Modes
  - Exact dates: roll up daily calendar scores across the window
  - Flexible months: average month-level features over selected months
  - Duration only: scan rolling windows to find best contiguous block by city

## Data Inventory (what we have now)
- `public/data/manifest.json`
  - Cities index: `slug → { country, directoryName }`
- City folders: `public/data/{Country}/{city}/`
  - `*-overview.json` or `overview.json`: name, description, practical info (sometimes), meta (sometimes)
  - `*-(visit-)calendar.json`: per-month `ranges` with `{ days[], score, special?, event?, notes? }`, plus `weatherHighC`, `weatherLowC`, `tourismLevel`
  - `*_seasonal_activities.json`: curated activities by season (varying coverage)
  - `*_attractions.json`/`attractions.json`/`sites.json`: POIs (coverage varies)
  - `*_connections.json`/`connections.json`: transport notes (varies)
  - `monthly/*.json`: monthly detail (some cities)
- Existing code already reads these files and exposes utilities
  - `src/lib/data-utils.js` loads overview/attractions/neighborhoods/culinary/transport/seasonal/monthly
  - Map layer (`components/map/mapUtils.js`) already computes date/month-based ratings from visit calendars, weather highs/lows, and tourism level

### Observed gaps/variance
- File name variance (`kebab` vs `underscored`), missing files for some cities
- Inconsistent presence of: neighborhoods, culinary, connections
- Calendar coverage: some cities lack monthly files; tourism/weather fields may be missing

## Data Needed (to improve accuracy and personalization)
- City-level signals (add to `overview.meta` without breaking current readers)
  - `priceIndex` (1–5 or normalized vs EU average)
  - `safetyIndex` (1–5)
  - `connectivityScore` (train/air access; 1–5)
  - `nightlifeScore`, `familyFriendly`, `accessibility`
- Month-level enrichments (can live in calendar or separate `monthly_features.json`)
  - `precipDays`, `daylightHours`, `seaTempC` (coastal experiences), `windiness`
  - `avgHotelPriceIndex`, `flightDealIndex` (optional now)
- Events normalization
  - Standardize `event` objects: `{ id, title, category, importance (1–3), date(s) }`
- POI metadata (optional, fuels itinerary quality)
  - Category tags, typical duration, opening hours, cost tier, geo coordinates
- Inter-city travel
  - Travel time/cost matrix (on-demand from routing APIs; cached per month)

## Feature Extraction (per city)
- Per-month features (precomputed nightly)
  - `baseMonthScore`: weighted avg of `ranges[].score` across the month
  - `weatherComfortScore`: map `(weatherHighC+weatherLowC)/2` into 1–5
  - `crowdScore`: invert `tourismLevel` into 1–5
  - `eventDensity`: count of `special` days (weighted by event importance)
  - `dataCoverage`: proportion of days covered by ranges; boolean flags for missing weather/tourism
  - `interestTags`: derived from seasonal activities and attractions
- Per-trip-window features (computed at query time)
  - `baseWindowScore`: day-level rollup across D1..Dn (exact dates) or mean across selected months
  - `eventsInWindow`: events touching the window
  - `coverageInWindow`: percent of days with explicit scores; fallback strength used

## Scoring Model (composite, explainable)
- Normalize each factor into 1–5; combine with weights, then clamp to 1–5 (or scale to 0–100 for UI)
- Default weights (tunable per user):
  - `baseTimeMatch` 0.55
  - `weatherComfort` 0.15
  - `crowdLevel` 0.15
  - `eventBonus` 0.10
  - `interestMatch` 0.05
  - Optional: `valueScore` (from priceIndex) 0.05 (rebalance if enabled)
- Guardrails
  - Low coverage dampening: if coverage < 30%, lean to neutral (≥ 3.0)
  - Missing features fallback: use regional medians; mark as low-confidence in explanation
  - Trip-length adjustment: small boost for short trips (≤ 3 days) to favor high-intensity windows

## Interest Matching
- Inputs: user-selected themes
- Mapping
  - Use tags from `seasonal_activities`, `attractions`, `overview` categories
  - Curated sets (e.g., coastal cities) can augment coverage
- Score
  - Jaccard or weighted overlap between user interests and city tags (map to 1–5)

## Explainability Payload
For each city, return a compact “why” object:
- `score`: final composite (e.g., 4.3/5)
- `breakdown`: `{ base, weather, crowds, events, interests, value? }`
- `topReasons`: strings like “Ideal temps 16–24°C”, “2 special events in your window”, “Shoulder-season crowds”
- `confidence`: high/medium/low (based on coverage and missing features)
- `bestWindow` (optional): for duration-mode scan, a suggested start–end subrange

## Precomputation and Caching
- Nightly job (CI/cron) builds per-city per-month features and stores compact JSON (e.g., `monthly_features.json`)
- Cache query results keyed by hash of inputs: `(mode, dates/months, interests, weights)`
- Store top-N ranked lists in Redis with TTL; invalidate on data version bump

## API Contract (proposed)
- Endpoint: `POST /api/rankings` (or extend existing `/api/suggestions`)
- Request
  - `{ dates, interests?: string[], weights?: object, constraints?: object }`
- Response
  - `{ items: [{ id, name, country, score, breakdown, reasons[], bestWindow?, events[] }], version, tookMs }`
- Notes
  - Pro-gate advanced fields (events list, bestWindow) per entitlements

## Integration with Itinerary Generator
- Use top-K (e.g., 10–20) ranked cities as candidate set
- Anchor around fixed-date events; penalize long hops via routing API signals
- Keep itinerary logic separate; feed it the scores and rationales for explainability

## Evaluation & QA
- Unit tests: date range slicing, month mapping, coverage fallback, weight application
- Sanity dashboards: seasonal curves per city (does summer ≈ higher for beach cities?)
- Offline eval: small labeled set (city × month → expected rank order)
- Online A/B: tweak weights via config version; monitor engagement (clicks, saves)

## Versioning & Flags
- `scoringConfig.version`: included in API responses and caches
- Feature flags: enable/disable new factors (e.g., priceIndex) safely

## Risks & Mitigations
- Sparse data → neutral dampening + clear confidence labels
- Inconsistent files → robust loaders with fallbacks and logging
- Performance → precompute monthly features; cache results; stream partials if needed

## Roadmap (phased)
1) MVP: deterministic scoring using visit calendars (base, weather, crowds, events), explainability, caching
2) Interests: derive tags from activities/attractions, add interestMatch factor
3) Value: introduce `priceIndex`, `connectivityScore` into scoring
4) Duration scanning + bestWindow output
5) Data enrichments: precipitation, daylight, sea temperature; normalize events

## Appendix A — Feature Schema (proposed)
City monthly features (precomputed):
```
{
  "cityId": "lisbon",
  "country": "Portugal",
  "months": {
    "june": {
      "baseMonthScore": 4.4,
      "weatherComfortScore": 4.5,
      "crowdScore": 3.0,
      "eventDensity": 2,
      "dataCoverage": 0.95,
      "interestTags": ["beach", "food", "nightlife"]
    }
    // ...other months
  },
  "meta": { "version": "1.0.0", "generatedAt": "ISO-8601" }
}
```

## Appendix B — Default Weights (v1)
```
{
  "baseTimeMatch": 0.55,
  "weatherComfort": 0.15,
  "crowdLevel": 0.15,
  "eventBonus": 0.10,
  "interestMatch": 0.05,
  "valueScore": 0.05
}
```


