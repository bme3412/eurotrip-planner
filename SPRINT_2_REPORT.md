# Sprint 2 Report: Architecture & Core Functionality

**Completed**: February 7, 2026  
**Build Status**: PASS (zero errors)

---

## Summary

Sprint 2 transformed the app from an "impressive content site" to a "functional trip discovery tool" by replacing the two largest pieces of engineering debt — a 2,283-line hardcoded city data file and a mock suggestions API — with real, data-driven infrastructure. It also added persistent navigation and type safety foundations.

---

## Task 1: Replace Hardcoded cityData.js with Build-Generated Data

### What Changed
- **Deleted** `src/components/city-guides/cityData.js` (2,283 lines, 85KB)
- **Created** `scripts/generateCityList.mjs` — builds `src/generated/cities.json` at build time from:
  - `public/data/manifest.json` (authoritative city list)
  - `public/data/{Country}/{city}/index.json` (overview data, descriptions)
  - `scripts/cityMetadata.json` (bridge file with coordinates, regions, and categories extracted from the old cityData.js)
- **Created** `src/generated/cityIndex.js` — convenience module with `getCitiesData()`, `cityById`, `cityCount` exports
- **Migrated** all 4 consumers:
  - `src/app/page.js`
  - `src/app/city-guides/page.js`
  - `src/app/explore/page.js`
  - `src/components/map/DataPreloader.js`
- **Added** to build pipeline: `npm run generate-cities` runs before `next build` and `next dev`
- **Added** `src/generated/` to `.gitignore` (rebuilt at build time on Vercel)

### Key Decisions
- Used a bridge JSON file (`scripts/cityMetadata.json`) to preserve coordinates, regions, and categories from the old cityData.js for cities whose JSON data files don't contain those fields yet.
- Output is minified JSON (no whitespace).
- Sort order: alphabetical by city name.

### Bundle Size Comparison

| Metric | Before (cityData.js) | After (cities.json) |
|--------|---------------------|---------------------|
| Source file size | 85 KB | 79.5 KB |
| Client JS shared | 107 KB | 107 KB |
| Homepage First Load | 217 KB | 217 KB |

The generated file is smaller and will be further optimized by Next.js tree-shaking since individual pages only import what they need.

### Data Quality
- **220 cities** generated (matches manifest)
- **131/220** have coordinates (60%)
- **144/220** have descriptions (65%)
- **89 cities** missing coordinates — these were never in the old cityData.js either; coordinates will need to be added to their JSON data files over time

---

## Task 2: Make the Suggestions API Real

### What Changed
- **Created** `src/lib/scoring/cityScorer.js` — reads visit calendar data for 127 cities and scores them for any date range
- **Rewrote** `/api/suggestions` route:
  - Changed runtime from `edge` to `nodejs` (needs `fs` for calendar files)
  - Supports both GET (query params) and POST (backward compatible with homepage)
  - Removed artificial 450ms delay
  - Removed 5 hardcoded mock results
- **Enhanced** `src/components/ResultCard.jsx`:
  - Added score color badges (green/amber/gray)
  - Added crowd level indicator
  - Made cards link to city guide pages
  - Added hover states and better visual hierarchy

### Scoring Logic
For each day in the user's date range:
1. Look up the matching range in the city's visit calendar
2. Extract score (1-5), crowd level, traveler types, and events
3. Average all scores across the date range
4. Build a human-readable "why" reason

### Key Decisions
- **Option A** (runtime file reads with module-level caching) implemented per the sprint plan
- **TODO added** for Option B (pre-computed scoring index at build time)
- 127 of 220 cities have visit calendar data and will appear in scored results
- Response shape preserved: `{ items: [...] }` for backward compatibility with `ResultsGrid`

---

## Task 3: Add Persistent Global Navigation

### What Changed
- **Created** `src/components/common/Navbar.js`:
  - Sticky nav bar at top of every page
  - Links: City Guides, Explore, Plan Trip, My Trips (auth-only)
  - Auth section: Sign In button (signed out) / name + Sign Out (signed in)
  - Mobile: Headless UI `Disclosure` hamburger menu below `md` breakpoint
  - Active state highlighting via `usePathname()`
  - Visual consistency with existing design (gradient logo, blue accent)
- **Integrated** into `src/app/layout.js` inside `<Providers>` wrapper
- **Removed** duplicate navigation from:
  - Homepage: removed full header with logo, nav links, and AuthButton
  - City guides index: removed standalone `AuthButton` (breadcrumbs kept)

### Key Decisions
- Used `sticky top-0` (not `fixed`) to avoid padding issues across all pages — the nav takes up normal flow space
- Auth-aware via existing `useAuth()` hook from `AuthContext`
- "My Trips" only shows when user is authenticated

---

## Task 4: Add TypeScript Interfaces for Data Schemas

### What Changed
- **Created** `src/types/city.ts` — 25 interfaces covering:
  - `CityListItem` (generated list), `CityData` (full index.json)
  - `CityOverview`, `Attraction`, `Neighborhood`, `CulinaryGuide`
  - `TransportConnections`, `SeasonalActivities`
  - `VisitCalendar`, `VisitCalendarMonth`, `VisitCalendarRange`
  - `MonthlyData`, `MonthHalf`, `MonthWeather`, `MonthTourism`
- **Created** `src/types/api.ts` — `SuggestionsResponse`, `ScoredCity`, `Trip` types
- **Created** `src/types/index.ts` barrel export
- **Added** JSDoc example in `src/app/city-guides/[city]/page.js`

### Key Decisions
- Types derived from actual JSON file inspection, not guessed
- Optional fields marked with `?` where not all cities have the data
- Can be incrementally adopted via JSDoc `@type` annotations in .js files

---

## Task 5: Quick Wins

### 5.1: Fix City Coordinates Fallback

**Before**: Hardcoded `CITY_COORDINATES` object with 20 cities, all others fell back to central Europe `[9.19, 48.66]`.

**After**: Dynamic `getCityCenter()` function with priority chain:
1. Overview coordinates from city data
2. Average of attraction coordinates (when individual sites have lat/lon)
3. Generated city list data
4. Central Europe fallback (only if all else fails)

**Result**: 131 cities now get correct coordinates from data. Cities with attractions data but no overview coords get averaged attraction coordinates.

### 5.2: OG Images for City Pages

**Added** to `generateMetadata()`:
- Checks for hero image at `/images/city-page/{country}/{slug}-hero.jpeg`
- Falls back to thumbnail at `/images/city-thumbnail/{country}/{slug}-thumbnail.jpeg`
- Only adds OG image when file actually exists on disk (checked at build time)

---

## Build Output

```
Route (app)                              Size     First Load JS
┌ ○ /                                    7.32 kB         217 kB
├ ○ /city-guides                         9.57 kB         219 kB
├ ● /city-guides/[city]                  10.3 kB         173 kB
├ ○ /explore                             1.85 kB         126 kB
├ ○ /start-planning                      53.2 kB         163 kB
└ + others...

+ First Load JS shared by all            106 kB
```

---

## Items Requiring Manual Follow-Up

1. **89 cities missing coordinates** — need lat/lon added to their `index.json` overview data or `cityMetadata.json` bridge file
2. **76 cities missing descriptions** — need `brief_description` in their overview data
3. **93 cities without visit calendar** — won't appear in date-based suggestions until calendar data is generated
4. **Pre-existing malformed JSON** in monthly files (february.json for several cities) — documented in Sprint 0+1 report
5. **Option B scoring index** — pre-compute scoring data at build time for faster API responses (marked as TODO in cityScorer.js)

---

## Suggested Focus for Sprint 3

1. **Trip Builder / Planner** — the `/start-planning` page links exist but the trip builder UX needs real functionality (multi-city itinerary, day-by-day planning)
2. **Search** — add a global search bar to the Navbar for finding cities by name, country, or category
3. **Coordinate data enrichment** — run a script to geocode the 89 cities missing coordinates from their data files
4. **Performance** — implement Option B scoring index, consider ISR for city pages, optimize bundle splitting
5. **Image optimization** — many city thumbnails are missing or use placeholder; generate consistent thumbnails

---

## Commit History

| Commit | Description |
|--------|-------------|
| `30dbb51` | feat: replace hardcoded cityData.js with build-generated city list |
| `daad300` | feat: replace mock suggestions API with real scoring engine |
| `37488f0` | feat: add persistent global navigation bar |
| `1a4b290` | feat: add TypeScript interfaces for all data schemas |
| `97b67e2` | fix: dynamic city coordinates + OG images for city pages |
