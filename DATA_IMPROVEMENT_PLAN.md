# Data Completeness & Consistency Plan

## Problem Summary

The 220-city dataset has significant gaps:

| Issue | Count | Impact |
|-------|-------|--------|
| Empty cities (0-2 sections filled) | **92 / 220** (42%) | These cities are unusable for planning |
| Missing `tourismCategories` | **220 / 220** (100%) | Scoring factors (Beach, Culture) can't classify cities |
| Missing `priceRange` | **220 / 220** (100%) | Value scoring falls back to guesses |
| Missing coordinates | **93 / 220** (42%) | Can't plot on map, can't cluster attractions |
| Missing calendar weather data | **108 / 220** (49%) | Timing scoring has no temperature data |
| Total attractions | 2,497 across 220 cities (avg 11.3) | Sparse cities have 0 |

The enrichment pipeline (`scripts/pipeline/enrich.mjs`) already knows how to derive `tourismCategories`, `coordinates`, and `_meta` — but has **never been run** against the data.

The generation script (`scripts/generateCityData.mjs`) can fill empty cities via LLM — it supports `--empty-only` mode.

---

## Part 1: Run the enrichment pipeline on all cities

**What it does:** Adds `tourismCategories`, `coordinates` (derived from attraction centroids), and `_meta` versioning to every city's index.json.

**Files:**
- `scripts/pipeline/enrich.mjs` — the enrichment script
- `scripts/generateCityIndex.mjs` — regenerates index.json from component files

**Steps:**
1. Run `node scripts/pipeline/enrich.mjs --verbose` to enrich all 220 cities
2. Run `node scripts/generateCityIndex.mjs` to rebuild index.json files
3. Run `node scripts/build-manifest.js` to update manifest.json
4. Verify: spot-check 5 cities for `tourismCategories` and `coordinates`

**Expected result:** 127 cities (those with attractions) gain `tourismCategories` and `coordinates`. The 93 empty cities won't benefit yet (no attractions to derive from).

---

## Part 2: Generate data for the 92 empty cities

**What it does:** Uses the existing LLM generation pipeline to fill empty cities with attractions, neighborhoods, culinary guides, connections, and seasonal activities.

**Files:**
- `scripts/generateCityData.mjs` — LLM-based city data generation

**Steps:**
1. Run `node scripts/generateCityData.mjs --empty-only --dry-run` to preview what would be generated
2. Run `node scripts/generateCityData.mjs --empty-only --batch 5 --concurrency 3` to generate data
3. Run `node scripts/generateCityIndex.mjs` to rebuild index.json
4. Run `node scripts/pipeline/enrich.mjs` to enrich newly generated cities
5. Run `node scripts/build-manifest.js` to update manifest

**Note:** This requires `OPENAI_API_KEY` in `.env.local` and will make LLM calls. Cost estimate: ~92 cities x ~$0.02/city = ~$1.84. The script has retry logic and rate limiting built in.

---

## Part 3: Add `priceRange` to all cities

**Problem:** No city has `priceRange` at the root level. The ValueFactor checks 3 different field names and gets nothing.

**Files:**
- `scripts/pipeline/enrich.mjs` — add a new enrichment step

**Steps:**
1. Add a `derivePriceRange(data)` function to `enrich.mjs` that:
   - Checks `data.overview?.practical_info?.budget_level` or similar existing fields
   - Falls back to attraction `price_range` values (aggregate "Free"/"Budget"/"Moderate"/"Premium"/"Luxury")
   - Falls back to a hardcoded lookup for well-known cities (Paris=expensive, Budapest=budget, etc.)
   - Sets `data.priceRange` at root level
2. Re-run enrichment pipeline

**Hardcoded fallback map (representative examples):**
```
luxury: monaco, zurich, geneva, reykjavik
expensive: paris, london, amsterdam, copenhagen, oslo, stockholm, dublin
moderate: rome, barcelona, berlin, vienna, prague, lisbon
budget: budapest, krakow, sofia, bucharest, belgrade, tallinn, riga
```

---

## Part 4: Normalize visitCalendar.months shape

**Problem:** `visitCalendar.months` is an object `{January: {...}, ...}` in some cities and an array `[{name: "January", ...}, ...]` in others. Scoring factors must handle both.

**Files:**
- `scripts/pipeline/enrich.mjs` — add normalization step

**Steps:**
1. Add a `normalizeVisitCalendar(data)` function to `enrich.mjs` that:
   - If `visitCalendar.months` is an object with month-name keys, convert to array format: `[{name: "January", ...monthData}, ...]`
   - Ensure each month entry has consistent fields: `name`, `ranges`, `weatherHighC`, `weatherLowC`, `crowdLevel`, `tourismLevel`
   - Fill `weatherHighC`/`weatherLowC` from `ranges[].weather` string if available (parse "12-18 C" -> highC=18, lowC=12)
2. Re-run enrichment pipeline

---

## Part 5: Normalize field naming conventions

**Problem:** Mix of `snake_case` and `camelCase` across the dataset. The code already handles both (`price_range` vs `priceRange`), but the data should be consistent.

**Files:**
- `scripts/pipeline/enrich.mjs` — add normalization step

**Steps:**
1. Add a `normalizeFieldNames(data)` function that standardizes:
   - Attractions: ensure `price_range` (keep snake_case since that's what 100% of cities use)
   - Root fields: use `camelCase` (matching JS convention): `culinaryGuide`, `visitCalendar`, `seasonalActivities`
   - Overview: keep `snake_case` for internal fields (`city_name`, `brief_description`) since that's the existing pattern
2. Remove Paris-only fields from base schema (document as extensions, don't delete -- just don't expect them in standard attractions)

---

## Part 6: Rebuild generated artifacts

After all enrichment:

1. `node scripts/generateCityIndex.mjs` — rebuild all index.json
2. `node scripts/pipeline/enrich.mjs` — final enrichment pass
3. `node scripts/build-manifest.js` — update manifest
4. `node scripts/generateMonthlyScores.mjs` — regenerate pre-computed scores (now with better data)

---

## Verification

1. Run `node scripts/validateCityData.mjs --json` and confirm:
   - 0 F-grade cities (was 92)
   - All cities have `tourismCategories`, `coordinates`, `priceRange`
2. Run `node scripts/_audit_gaps.mjs` and confirm all gap counts are 0 or near-0
3. Run `npm test` — all existing tests pass
4. Start the dev server and test:
   - `/api/suggestions` returns improved scoring (all 6 factors have data)
   - City guides pages load correctly for previously-empty cities
   - Map explorer shows all 220 cities with markers

## Critical Files

- `scripts/pipeline/enrich.mjs` — main file to modify (add derivePriceRange, normalizeVisitCalendar, normalizeFieldNames)
- `scripts/generateCityData.mjs` — run for empty cities (no changes needed)
- `scripts/generateCityIndex.mjs` — run to rebuild (no changes needed)
- `scripts/generateMonthlyScores.mjs` — run to regenerate (no changes needed)
- `scripts/build-manifest.js` — run to update (no changes needed)
- `scripts/validateCityData.mjs` — run to verify (no changes needed)
