# Sprint 3 Report: Planning, Search & First Revenue

**Date:** February 7, 2026
**Sprint Duration:** Single session
**Build Status:** Passing (exit code 0)

---

## Summary

Sprint 3 transforms the EuroTrip Planner from a content-heavy city guide into a **functional trip planning product** with instant search, generalized itinerary generation, affiliate monetization, and complete map coverage.

---

## Task 1: Global Search in Navbar

**Status:** Complete

### What was built
- **`src/components/common/SearchBar.js`** — Client-side search component integrated into the global Navbar
- Searches across **220 cities** by name, country, and region
- Debounced input (150ms) with instant dropdown results
- Results show country flag, city name, country, and color-coded region tag

### Behavior
| Action | Result |
|--------|--------|
| Type 2+ chars | Dropdown shows top 8 matches, scored by match quality |
| Click result | Navigates to `/city-guides/{citySlug}` |
| Press Enter | With selection: navigates to city. Without: goes to `/city-guides?search=query` |
| Press Escape | Closes dropdown |
| Arrow keys | Navigate through results |
| Click outside | Closes dropdown |

### Scoring algorithm
- Exact name start: 100 points
- Word-start match in name: 80
- Name contains: 60
- Country starts with: 40
- Country contains: 20
- Region contains: 10

### Performance
- Data source: `@/generated/cityIndex` (~80KB, already client-side)
- No API calls — pure client-side filtering
- Sub-5ms search time for 220 cities

---

## Task 2: Generalize Trip Planner

**Status:** Complete

### What was built

1. **`/plan/[city]` — Generic Trip Wizard** (`src/app/plan/[city]/page.js`)
   - Dynamic route works for any of the 220 cities
   - 4-step wizard: Dates → Travel Style → Preferences → Review & Generate
   - Loads city attractions dynamically for the must-see checklist
   - Posts to existing `/api/trips` endpoint and redirects to itinerary

2. **`src/lib/planning/buildItinerary.js` — Generic Itinerary Engine**
   - Works with whatever data exists in a city's `index.json`
   - Interest matching for 8 categories + legacy Paris categories
   - Geographic clustering using haversine distance
   - Pace-based scheduling (relaxed/moderate/active → 2-4 activities/day)
   - Culinary recommendations from city food data
   - Graceful fallback for data-sparse cities (neighborhood exploration)

3. **Updated Itinerary Display** (`src/app/itineraries/[tripId]/page.js`)
   - Detects city from trip data
   - Paris → uses specialized `buildParisRecommendations` (796 lines of domain logic)
   - All other cities → uses new `buildItinerary`
   - `GenericTimeBlock` component renders the new format alongside Paris's `DayCard`

4. **"Plan Your Trip" CTA** on every city guide page
   - Added to `CityPageClient.js` below the hero section
   - Links to `/plan/{citySlug}`
   - Gradient button matching app design language

5. **Redirect**: `/paris-trip` → `/plan/paris` (permanent 301)

### Cities with trip planning
- **220 cities** can now generate itineraries
- Quality varies by data richness — Paris has the best results, data-rich cities (Rome, Barcelona, etc.) produce good multi-day plans

### Wizard steps
| Step | Collects |
|------|----------|
| 1. Dates | Check-in / check-out via DateRangePopover |
| 2. Travel Style | Pace slider (0-100) + interest selection (8 categories) |
| 3. Preferences | Budget level (3 tiers) + must-see attractions (checkbox) |
| 4. Review | Summary display + "Generate My Itinerary" button |

---

## Task 3: Affiliate Integration

**Status:** Complete

### What was built

1. **`src/lib/affiliates/affiliateLinks.js`** — Affiliate link utility
   - `affiliateUrl(url)` — Detects provider from URL, applies tracking params
   - `searchUrl(platform, { city, country })` — Generates search URLs
   - `trackAffiliateClick()` — Event tracking via Vercel Analytics
   - Supports: GetYourGuide, Viator, Booking.com

2. **`src/components/city-guides/BookActivities.js`** — Booking CTA component
   - Shows "Book Activities in {City}" with platform search links
   - Added to the Attractions tab on every city guide page
   - External link icons, opens in new tabs
   - Affiliate disclaimer text

3. **Environment variables** (added to `.env.example`)
   - `NEXT_PUBLIC_GYG_PARTNER_ID`
   - `NEXT_PUBLIC_VIATOR_PARTNER_ID`
   - `NEXT_PUBLIC_BOOKING_AID`

### Affiliate link behavior
- If env vars are set: URLs include affiliate tracking parameters
- If env vars are NOT set: URLs work normally, just without tracking
- Zero impact on user experience either way

---

## Task 4: Enrich City Coordinates

**Status:** Complete

### Results

| Metric | Before | After |
|--------|--------|-------|
| Cities with coordinates | 131/220 | **220/220** |
| Coverage | 59.5% | **100%** |

### Enrichment sources
| Source | Cities enriched |
|--------|----------------|
| Attraction coordinate averaging | 18 |
| Static lookup table | 71 |
| **Total newly enriched** | **89** |

### Script: `scripts/enrichCoordinates.mjs`
- Strategy 1: Read city's `index.json`, average all attraction lat/lon
- Strategy 2: Static lookup table of 100+ European city coordinates
- Writes back to `scripts/cityMetadata.json`
- Run `npm run generate-cities` to propagate to `cities.json`

---

## Build & Bundle

```
Build: ✅ Passing (exit code 0)
Build time: ~37s (unchanged from Sprint 2)
```

### New files added
| File | Size | Purpose |
|------|------|---------|
| `src/components/common/SearchBar.js` | 6.1 KB | Global search component |
| `src/app/plan/[city]/page.js` | 9.8 KB | Generic trip wizard |
| `src/lib/planning/buildItinerary.js` | 8.9 KB | Generic itinerary engine |
| `src/lib/affiliates/affiliateLinks.js` | 3.1 KB | Affiliate link utilities |
| `src/components/city-guides/BookActivities.js` | 1.5 KB | Booking CTA component |
| `scripts/enrichCoordinates.mjs` | 4.2 KB | Coordinate enrichment script |

### Pre-existing issues (unchanged from Sprint 2)
- Malformed `february.json` for: Tirana, Mostar, Sofia, Varna (data quality issue)

---

## Known Limitations

1. **Itinerary quality varies by city data richness** — Cities with few attractions in `index.json` produce sparser itineraries. Paris remains the gold standard.

2. **No real-time attraction availability** — The planner doesn't check if attractions are open on specific dates. Calendar data helps but isn't used at the individual attraction level.

3. **Affiliate IDs not configured** — The infrastructure is ready but needs partner sign-ups (GetYourGuide Partner Program, Viator Partner API, Booking.com Affiliate Program).

4. **Trip storage requires Supabase** — The planner wizard requires a working Supabase connection to save trips. Without it, the "Generate" button will fail with a helpful error message.

---

## Suggested Sprint 4 Focus

1. **AI-powered itinerary enhancement** — Use OpenAI to generate richer day descriptions, restaurant recommendations, and local tips for data-sparse cities
2. **Saved trips dashboard** — Build out `/saved-trips` with trip management (edit, delete, share)
3. **Social sharing** — Generate shareable itinerary links and OG preview images
4. **Real-time weather integration** — Pull forecast data for upcoming trips
5. **Email capture / waitlist** — For users without auth, capture email for trip delivery
6. **A/B test affiliate placements** — Optimize conversion on booking links
