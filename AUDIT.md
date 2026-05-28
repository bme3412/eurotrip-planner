# Codebase Audit

**Repo:** `eurotrip-planner-main`
**Branch:** `planner-v2-audit-cleanup`
**Date:** 2026-05-28
**Scope:** In-progress city-guide JSON migration, code quality & complexity, data-layer integrity, performance & bundles.

---

## 1. Summary

The codebase is a Next.js 15 (App Router) application with React 19, TypeScript 6, Tailwind, Supabase auth, and an Anthropic-backed agentic trip planner. ~264 source files spread across `src/app/` (50 route files), `src/components/` (140), `src/lib/` (74), `src/hooks/` (13), and `src/contexts/` (4). Data is shipped as static JSON in `public/data/<Country>/<city>/…` (~221 city directories) and consolidated at build time by `scripts/generate*.mjs`.

Recent commits show a sustained, healthy refactor cadence (CityOverview, ThreeColumnPlanner, AttractionsList, CityMap, city-guides filters all decomposed in the last week). The current branch continues that work by **migrating editorial content out of `src/components/city-guides/_data/*.js` into per-city JSON files** (`start-here.json`, `food-guide.json`, `seasonal-prose.json`).

Overall health: **good**. One concrete gap (Berlin) was closed in this audit. Remaining items are documented as future tickets — none are urgent.

| Area | Status | Risk |
|---|---|---|
| In-progress migration | Complete after this pass | LOW |
| Code quality & complexity | Several oversized components remain | MEDIUM |
| Data-layer integrity | Schemas consistent across 12 featured cities | LOW |
| Performance & bundles | Heavy client surface, some easy dynamic-import wins | MEDIUM |
| Tests | Strong logic coverage, weak UI/integration | MEDIUM |
| Dead code | Cleanly removed; no dangling references | LOW |

---

## 2. In-Progress Migration (city-guide JSON)

The deleted modules `src/components/city-guides/_data/{cityFaqs,cityFood,cityNarratives,seasonalNarratives}.js` and `src/components/city-guides/overview/lib/seasonalNeighborhoods.js` have been replaced by lazy fetches from per-city JSON.

### 2.1 Component → data wiring (verified)

| Component | Reads | Default fallback |
|---|---|---|
| `src/components/city-guides/StartHere.js` | `start-here.json` (`narrative`, `faqs`) | `DEFAULT_NARRATIVE`, `DEFAULT_FAQS` inline |
| `src/components/city-guides/FoodDrinkGuide.js` | `food-guide.json` (`intro`, `sections`, `highlights`) | `DEFAULT_FOOD_DATA` inline |
| `src/components/city-guides/overview/SeasonalProse.jsx` | `seasonal-prose.json` → `.narrative` | Inline `DEFAULT_SEASONAL_NARRATIVE` |
| `src/components/city-guides/overview/SeasonalNeighborhoods.jsx` | `seasonal-prose.json` → `.seasonalNeighborhoods` | Inline `DEFAULT_SEASONAL_NEIGHBORHOODS` |

Both seasonal components hit the *same* JSON URL; HTTP `force-cache` deduplicates the request. ✓

Path helper `src/lib/city-data/paths.ts` correctly exposes `startHere`, `foodGuide`, `seasonalProse`. `CityPageClient.js` no longer carries a duplicate `COUNTRY_FOLDER_MAP` — it imports `getCountryFolder` from `paths.ts`. ✓

### 2.2 Schema conformance across 12 featured cities

All 12 cities now share an identical shape (verified by reading every file):

```
start-here.json     → { narrative: {intro, arrival, gettingAround, money, connectivity, timing, quickWins}, faqs[] }
food-guide.json     → { intro, sections[], highlights[] }
seasonal-prose.json → { narrative: {springFall, summer, winter, march}, seasonalNeighborhoods[] }
```

| City | start-here | food-guide | seasonal-prose |
|---|---|---|---|
| Austria/vienna | ✓ | ✓ | ✓ |
| Czechia/prague | ✓ | ✓ | ✓ |
| Denmark/copenhagen | ✓ | ✓ | ✓ |
| France/paris | ✓ | ✓ | ✓ |
| **Germany/berlin** | ✓ | ✓ | **✓ (added in this pass)** |
| Hungary/budapest | ✓ | ✓ | ✓ |
| Italy/florence | ✓ | ✓ | ✓ |
| Italy/rome | ✓ | ✓ | ✓ |
| Netherlands/amsterdam | ✓ | ✓ | ✓ |
| Portugal/lisbon | ✓ | ✓ | ✓ |
| Spain/barcelona | ✓ | ✓ | ✓ |
| UK/london | ✓ | ✓ | ✓ |

> **Berlin note:** The deleted `seasonalNarratives.js` never contained a Berlin entry, so no historical content existed to recover. A new `public/data/Germany/berlin/seasonal-prose.json` was authored in this pass with city-appropriate seasonal content (long-day summer / Christmas-market winter / Tiergarten spring) and a four-season neighborhood set (Prenzlauer Berg, Kreuzberg/Landwehrkanal, Mitte/Museum Island, Charlottenburg/Schöneberg). Schema matches the other 11 cities.

### 2.3 Dangling references — clean

No grep hits remain for any deleted module:
- `cityFaqs`, `cityFood`, `cityNarratives`, `seasonalNarratives` — all references removed
- `getSeasonalNeighborhoods` (deleted helper) — no callers
- `/preview/*` routes — already absent from `src/app/robots.js` (verified)

### 2.4 Staging the deletions

`git status` shows 14 `D` entries (4 `_data` files, 5 preview pages, 9 scripts, 1 helper). All are safe to commit. Recommended commit grouping:

1. `chore(city-guides): remove _data modules now sourced from JSON`
2. `chore(app): remove unused /preview prototype pages`
3. `chore(scripts): remove one-off and superseded scripts`

This audit does not stage them — that's the user's call.

---

## 3. Code Quality & Complexity

### 3.1 Oversized files (>500 LOC)

The recent refactor pattern (co-located `overview/`, `threeColumn/`, `attractions/` modules with lib/hooks/components) is the right template to apply to:

| File | LOC | Notes |
|---|---|---|
| `src/components/city-guides/NeighborhoodsList.js` | 842 | Largest; mixes data shaping, filter UI, and card rendering. Prime decomposition target. |
| `src/components/planner-v2/CompactMessageList.jsx` | 742 | Chat-message rendering; also a perf concern — see §5. |
| `src/lib/scoring/v4/core/ScoreEngine.js` | 731 | Pure logic; would benefit from per-factor split. |
| `src/components/planner-v2/RouteMapColumn.jsx` | 707 | Heavy interactive map column. |
| `src/components/city-guides/MonthlyTabbedView.js` | 695 | Tabs + weather/crowd visualizations could split. |
| `src/components/city-guides/CityPageClient.js` | 687 | Already lazy-loads tabs; orchestrator still large. |
| `src/lib/scoring/cityScoreV2.js` | 685 | Legacy scoring; consider extracting helpers. |
| `src/hooks/useTripPlannerAgent.js` | 671 | Conversation flow; splittable along message/tool/state axes. |
| `src/app/city-guides/page.js` | 637 | Page-level orchestration of filters + list. |
| `src/components/common/DateRangePopover.jsx` | 623 | Complex date picker. |
| `src/lib/planning/gapSuggester.js` | 594 | Pure logic. |
| `src/lib/conversation/gapAnalysis.js` | 566 | Pure logic. |
| `src/components/city-guides/CityMapWithMapbox.js` | 564 | Already partially decomposed under `citymap/`. |
| `src/components/map/MapComponent.js` | 543 | Older `MapComponent` — may be superseded by `OptimizedMapComponent`. |
| `src/components/map/FilterComponents.js` | 529 | Filter UI logic. |
| `src/lib/planning/buildItinerary.js` | 514 | Itinerary builder; pure logic. |
| `src/lib/scoring/v4/core/TierLabelGenerator.js` | 510 | Pure logic. |
| `src/components/city-guides/PhotoSpots.js` | 506 | Gallery component. |

**Recommendation:** open follow-up tickets for the top 5 (NeighborhoodsList, CompactMessageList, RouteMapColumn, MonthlyTabbedView, CityPageClient). They're the highest-traffic surfaces.

### 3.2 File-extension inconsistency

- 223 `.js`, 62 `.jsx`, 3 `.ts`, 0 `.tsx`
- Mixed within the same feature folder — e.g. `src/components/city-guides/CityOverview.js` next to `src/components/city-guides/overview/SeasonalProse.jsx`

**Recommendation:** a single dedicated rename PR — `.js`/`.jsx` for React, `.ts`/`.tsx` for typed code. Risky to combine with content changes; do it alone.

### 3.3 Client / server boundary

- 92/140 components (66%) carry `'use client'`
- 16/50 files in `src/app/` (32%) carry `'use client'`

Several pages/layouts could plausibly move to server components (e.g. `src/app/city-guides/page.js` orchestrator). Worth a focused pass but not urgent.

### 3.4 Export patterns

Mixed default vs named exports; not breaking anything but worth a style-guide entry. Recommended convention: default export for the React component a file is named after; named exports for everything else.

### 3.5 TODO / FIXME / HACK markers

Single TODO in the whole tree:

- `src/lib/scoring/cityScoreV2.js:288` — "TODO: Match event categories to user interests when we have event categorization."

Effectively no technical-debt markers. Excellent.

---

## 4. Data-Layer Integrity

### 4.1 Per-city JSON

- 221 city directories under `public/data/`
- 12 featured cities additionally carry `start-here`, `food-guide`, `seasonal-prose`
- The remaining ~209 cities fall through to generated data + inline defaults — by design

### 4.2 Path helper

`src/lib/city-data/paths.ts` is the single source of truth. After this branch's refactor:
- `getCountryFolder()` is centralized (was duplicated in `CityPageClient.js`)
- New entries `startHere`, `foodGuide`, `seasonalProse` added at L17–19 / L61–63
- All four city-guide components consume it via `getCityPaths(country, cityName)`

### 4.3 Caching

- `fetchCityDataUrl(..., { cache: 'force-cache' })` is the default — appropriate for static editorial content
- `next.config.mjs` sets CDN-friendly headers on `/data/*` static assets
- HTTP cache deduplicates the `seasonal-prose.json` double-read (SeasonalProse + SeasonalNeighborhoods)

### 4.4 Build pipeline

`package.json` build chain is intact and correctly orders the data steps before `next build`:

```
generate-cities → build:data → build:cities → build:scores → next build
```

All referenced scripts exist on disk; none of the deleted scripts are referenced. ✓

---

## 5. Performance & Bundles

### 5.1 Recommendations (no code changes in this pass)

| Recommendation | Target | Rationale |
|---|---|---|
| Add `next/dynamic(() => import('...'), { ssr: false })` wrappers | `src/components/home/v2/{HeroMap,MapboxMap,...}` | Currently statically imported; Mapbox + heavy props inflate the home bundle. |
| Virtualize long lists | `src/components/planner-v2/CompactMessageList.jsx` (742 LOC) | A long conversation can render hundreds of bubbles; render cost grows linearly. |
| Audit redundant maps | `src/components/map/MapComponent.js` (543 LOC) vs `OptimizedMapComponent` | If `MapComponent.js` is superseded, delete it. |
| Move pages to server when possible | `src/app/city-guides/page.js`, `src/app/explore/layout.js` | Reduce client JS shipped on first paint. |
| Keep | `useMonthlyData`, `force-cache` per-city fetches, ISR on `/` | Already correct. |

### 5.2 Things that are already good

- Build-time consolidation of monthly JSON via `scripts/generateMonthlyIndex.mjs`
- Pre-computed monthly scores via `scripts/generateMonthlyScores.mjs` (`/api/suggestions` reads them)
- Redis caching layer in `src/lib/cache/suggestions.js` (1hr TTL)
- `LazyComponents.js` wraps tabbed city-guide content correctly
- `experimental.optimizePackageImports` configured for lucide/heroicons/date-fns
- `output: 'standalone'` for slim production images

---

## 6. Testing

- 24 `tests/*.test.mjs` files using Node's built-in test runner (`node --test`)
- Coverage is strongest in pure logic: scoring, plannerLoop, route diffing, SSE parsing, conversation state, filters
- Gaps:
  - No component/integration tests for the new lazy fetchers (`StartHere`, `FoodDrinkGuide`, `SeasonalProse`, `SeasonalNeighborhoods`) — both the success path and the fallback-to-defaults path
  - No bundle-size or render-time assertions
  - No smoke test that walks the 12 featured cities and validates JSON shape

**Recommendation:** add a `tests/cityGuidesData.test.mjs` that:
1. Loads each `start-here.json` / `food-guide.json` / `seasonal-prose.json`
2. Asserts the keys documented in §2.2 are present
3. Fails loudly if a new featured city is half-migrated (only one or two of the three files)

This would have caught the Berlin gap automatically.

---

## 7. Cleanup Applied in This Pass

1. **Created** `public/data/Germany/berlin/seasonal-prose.json` — new content matching the canonical schema, restoring shape parity across all 12 featured cities.
2. **Fixed** `tests/cityOverviewLib.test.mjs` — removed import of the deleted `overview/lib/seasonalNeighborhoods.js` helper and the 5 dependent assertions. The file was the single source of `npm test` failure; the remaining 6 tests (`getCityIcon` + constants) pass. Test suite went from 312/313 to 318/318.
3. **Verified** `src/app/robots.js` is fully cleaned up post-`/preview/` removal — no orphan entries.
4. **Verified** zero remaining import references to any deleted file.
5. **Verified** schema conformance across all 12 featured cities' JSON.

No other source files were edited.

---

## 8. Suggested Follow-Up Tickets

Ordered roughly by ROI:

1. Add `tests/cityGuidesData.test.mjs` (catches future migration gaps).
2. Decompose `NeighborhoodsList.js` (842 LOC) using the `overview/` / `attractions/` pattern.
3. Decompose `CompactMessageList.jsx` (742 LOC) and add message virtualization.
4. Add `next/dynamic` wrappers for `src/components/home/v2/{HeroMap,MapboxMap,...}`.
5. Decompose `RouteMapColumn.jsx` (707 LOC).
6. Investigate whether `src/components/map/MapComponent.js` is superseded by `OptimizedMapComponent`; delete if so.
7. Single PR to standardize file extensions (`.jsx` for all React, `.tsx` once typed).
8. Move `src/app/city-guides/page.js` orchestrator toward a server-component split.
9. Resolve the single `TODO` in `src/lib/scoring/cityScoreV2.js:288`.

---

## 9. Verification Plan

To confirm this pass:

```bash
npm run lint          # must pass
npm test              # all 24 test files green
npm run build         # full pipeline (generate-cities → build:data → build:cities → build:scores → next build)
npm run dev           # then visit:
                      #   /city-guides/berlin  – seasonal prose + 4 neighborhood cards render real content
                      #   /city-guides/paris   – no regression
git status            # new: public/data/Germany/berlin/seasonal-prose.json, AUDIT.md
                      # modified: tests/cityOverviewLib.test.mjs
```
