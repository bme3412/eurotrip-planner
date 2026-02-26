# EuroTrip Planner — Build Plan

*Created: February 20, 2026*

---

## Product Vision

### The gap no one owns

There is a dead zone in the traveler's journey. It starts the moment someone buys an airline ticket and ends when they board the return flight. During that window — often 2-8 weeks — travelers are doing scattered, anxious work across a dozen tabs: reading TripAdvisor reviews, saving Instagram posts, building Google Sheets itineraries, texting friends for restaurant tips, checking weather forecasts, and wondering if they should pre-book that museum.

No single product owns this window. Google Flights owns the purchase. Booking.com owns the hotel. TripAdvisor owns reviews. But the actual *planning and adapting* — deciding what to do each day, adjusting when it rains, finding the restaurant that's actually open on Monday — is still manual, fragmented labor.

**EuroTrip Planner's premise: own the entire lifecycle from ticket purchase to trip completion.**

### The three phases

```
Phase 1: DECIDE (before ticket purchase)
"Where should I go? When is the best time?"

Phase 2: PLAN (ticket purchased, weeks/months before trip)
"What should I do each day? What should I book? Where should I stay?"

Phase 3: LIVE (boots on the ground)
"It's raining tomorrow — what's the new plan? What's open near me right now?"
```

The app already does Phase 1 well (temporal scoring, city guides, visit calendars). The strategic move is to extend through Phase 2 and into Phase 3 — where no competitor has a strong foothold and where the monetization opportunities are richest.

### Why this matters commercially

Each phase maps to a different willingness to pay:

- **Phase 1** (deciding): Low willingness to pay. Discovery/content play. Monetize via SEO traffic and affiliate clicks. Keep it free.
- **Phase 2** (planning): Moderate willingness to pay. The user has already committed money (the ticket). They want confidence that their trip will be good. Natural paywall: AI-generated adaptive itineraries, calendar export, multi-city optimization.
- **Phase 3** (living it): High willingness to pay per transaction. The user is *in the city* making real-time spending decisions. Affiliate conversions here are highest — "book this restaurant," "skip the line at this museum." The nightly briefing email is the delivery vehicle.

### The value proposition

**EuroTrip Planner is the only travel tool that tells you where to go based on your exact dates, builds you an adaptive day-by-day plan, and adjusts it every night based on real conditions — weather, closures, events — so you never waste a day of your trip.**

---

## Data Architecture — Four Layers

### Layer 1: Proprietary City Data (220 cities, static but curated)

The existing `public/data/**` JSON architecture. Provides:

- **Temporal intelligence**: visit calendars, monthly weather/crowd/event data, seasonal scoring
- **City character**: neighborhood vibes, culinary identity, cultural significance
- **Structural skeleton**: attraction lists, categories, coordinates, transport connections

This layer is the **differentiator**. No API provides half-month-granularity scoring of 220 European cities by traveler type. This is proprietary data that was expensive to generate and is hard to replicate.

**Role**: Forms the skeleton of every recommendation and itinerary. Determines *which* cities to recommend, *when* to go, and the general shape of each day.

### Layer 2: Google Places API (New) (real-time, verified, rich)

Provides:

- **Verification**: Is this place actually open? What are the real hours today?
- **Social proof**: Ratings, review counts, AI-powered review summaries from Gemini
- **Visual richness**: High-quality photos from Google's database (millions of photos, no hosting cost)
- **Discovery**: Text Search and Nearby Search for finding new places the app's data doesn't cover
- **Freshness**: Data is as current as Google's database (updated continuously)
- **Accessibility**: Wheelchair access, payment options, parking — practical details

**Role**: Enriches and verifies the plan at execution time. Provides the "last mile" of data quality that static JSON cannot.

### Layer 3: Weather API (real-time, forecast)

7-day forecasts for the trip city. Used during Phase 3 (nightly briefing) and the trip countdown dashboard.

**Role**: Triggers itinerary adaptations. "It's going to rain tomorrow" is the input; "swap outdoor activity X for indoor activity Y" is the output.

### Layer 4: User Data (Supabase, persistent)

User accounts, trip state, preferences, saved cities, past itineraries.

**Role**: Personalization and continuity. Trip state tracks which version of the itinerary is current (after nightly adaptations).

---

## City Data Enhancement Strategy

### Current State

Coverage breakdown (220 cities):

- **128 rich** (4-5 data sections: attractions, neighborhoods, culinary, calendar, monthly)
- **10 sparse** (1 section — have monthly but nothing else)
- **82 empty** (`index.json` exists but all sections are null)

Section coverage:

| Section | Coverage | Percentage |
|---------|----------|------------|
| Attractions | 127/220 | 58% |
| Neighborhoods | 127/220 | 58% |
| Culinary | 128/220 | 58% |
| Visit calendar | 127/220 | 58% |
| Monthly data | 138/220 | 63% |
| Experiences (Paris-style rich) | 13/220 | 6% |

Quality gap: Paris has 26 data files with attractions containing 15+ fields each (transit, opening hours, visit profiles, coordinates, booking tips). Berlin attractions have only 8 fields. 82 cities have zero populated data. This directly impacts itinerary quality, scoring accuracy, and user trust.

### Priority 1: Fill the 82 Empty Cities (Highest Impact)

These cities have `index.json` with all keys set to null. They include major destinations like Budapest, Warsaw, Krakow, Lisbon (Sintra), Riga, Vilnius, Bucharest, Glasgow, Liverpool, Manchester, Oxford, Cambridge, Bath.

**Approach A: AI-Powered Batch Generation**

Build `scripts/generateCityData.mjs` that calls an LLM API (OpenAI) to generate structured city data matching the existing schema.

For each empty city, generate:

- `overview` — brief description, nickname, coordinates, practical info (currency, language, visit duration), seasonal notes
- `attractions.sites[]` — 15-20 top attractions with: name, type, description, coordinates, price range, ratings, best time, booking tips, neighborhood
- `neighborhoods.neighborhoods[]` — 6-10 neighborhoods with: name, character, appeal, practical info, highlights, insider tips
- `culinaryGuide` — restaurants (fine dining, casual, street food), bars/cafes, food experiences with: name, cuisine type, price range, atmosphere, neighborhood, coordinates
- `visitCalendar.months` — 12 months of day-range scoring with crowd levels, traveler types, events, and considerations
- `seasonalActivities` — season-by-season activity recommendations
- `connections` — transport links (airports, trains, ferries)

Prompt engineering strategy:

- Use a structured JSON schema in the system prompt (derived from Paris/Berlin examples)
- Include the TypeScript interfaces from `src/types/city.ts` as the contract
- Generate one section at a time (attractions, then neighborhoods, etc.) to stay within token limits
- Validate output against the schema before writing to disk

Estimated cost: ~$0.10-0.30 per city with GPT-4.1-mini, ~$15-25 total for 82 cities.

**Approach B: Hybrid Web Scrape + AI**

For attractions specifically, scrape structured data from free sources (Wikipedia lists of landmarks, OpenStreetMap POIs) and use AI only for descriptions and scoring. Gives more accurate coordinates and names.

**Recommendation**: Use Approach A for speed, then run a validation pass. For the 10-15 highest-traffic empty cities (Budapest, Warsaw, Krakow, Riga, etc.), do a manual review pass to verify accuracy.

### Priority 2: Enrich the 128 Rich Cities (Quality Uplift)

Even the "rich" cities have gaps compared to Paris.

**2a: Add Missing Fields to Attractions**

Gap: Berlin's attractions have 8 fields. Paris has 15+ (transit, opening hours, visit profile, arrondissement, seasonal hours, closures).

Enhancement fields to add:

- `opening_hours` — weekday/weekend hours, seasonal variations
- `transit` — closest metro/bus/tram with walk minutes
- `visit_profile` — min/max duration, ideal time block, weather fallback activity
- `booking_tips` — advance booking needed? skip-the-line available?
- `official_url` / `website` — for affiliate linking

Method: Run an enrichment script that reads each city's existing attractions, calls an LLM with the attraction name + city + country, and fills in missing fields. Only update fields that are currently null or absent.

**2b: Add Experiences Data (Currently 13/220)**

The `{city}-experiences.json` format (100 time-categorized experiences with scores, coordinates, booking URLs, cost estimates, themes) is the richest dataset but only exists for 13 cities. This data powers:

- The Experiences tab on city pages
- "Top 10 things to do" features
- Affiliate booking links

Target: Generate experiences for the top 50-80 most-visited cities.

**2c: Normalize Data Quality**

Issues found:

- Some attractions have coordinates, some don't (even within the same city)
- Price ranges are inconsistent: "Free", "free", "Budget", "Moderate to High", "€5-€15"
- Description quality varies: some are 200-word narratives, others are one-liners
- TypeScript interface names don't match `getCityData()` property names (`culinary` vs `culinaryGuide`, `transport` vs `connections`)

Fix: Build a validation/normalization script that:

- Flags attractions missing coordinates
- Standardizes price ranges to an enum: `Free` / `Budget` / `Moderate` / `Premium` / `Luxury`
- Ensures minimum description length (50 chars)
- Reports a per-city "data quality score" (0-100)

### Priority 3: New Data Dimensions (Feature Enablers)

**3a: Walking Routes / Itinerary Paths**

Currently the itinerary builder clusters attractions geographically but doesn't know actual walking routes.

```json
// city_walking_routes.json
{
  "routes": [
    {
      "name": "Historic Center Walk",
      "duration_hours": 2.5,
      "distance_km": 3.2,
      "waypoints": [{ "name": "...", "lat": 0, "lon": 0, "stop_minutes": 15 }],
      "theme": "History",
      "difficulty": "easy"
    }
  ]
}
```

This lets the itinerary builder create themed walking days instead of just proximity clusters.

**3b: Event Calendar (Recurring Annual Events)**

The visit calendar has some events, but a dedicated event dataset would improve scoring:

```json
// city_events.json
{
  "events": [
    {
      "name": "Oktoberfest",
      "city": "munich",
      "type": "festival",
      "start_month": 9, "start_day": 16,
      "end_month": 10, "end_day": 3,
      "recurring": true,
      "crowd_impact": "extreme",
      "price_impact": "high",
      "description": "...",
      "website": "https://..."
    }
  ]
}
```

**3c: Accommodation Zones**

To support the trip planner's "where to stay" feature, add neighborhood-level accommodation data:

```json
// neighborhoods[].accommodation
{
  "budget_range": "$80-$150/night",
  "hotel_density": "high",
  "best_for": ["first-time visitors", "nightlife"],
  "transit_access": "excellent",
  "safety_rating": "high"
}
```

**3d: Photo Spots with Golden Hour Data**

Currently PhotoSpots is Paris-only hardcoded. For each city:

```json
// city_photo_spots.json
{
  "spots": [
    {
      "name": "Hallgrimskirkja Viewpoint",
      "lat": 64.1417, "lon": -21.9267,
      "best_light": "golden_hour",
      "best_season": "summer",
      "crowd_tip": "Visit before 8am",
      "equipment": "wide_angle",
      "instagram_hashtag": "#hallgrimskirkja"
    }
  ]
}
```

**3e: Day Trip Connections**

For cities that serve as bases, add nearby day-trip destinations:

```json
// city_day_trips.json
{
  "trips": [
    {
      "destination": "Sintra",
      "from_city": "lisbon",
      "transport": "train",
      "duration_minutes": 40,
      "cost": "€4.50 round trip",
      "highlights": ["Pena Palace", "Moorish Castle"],
      "full_day": false
    }
  ]
}
```

### Priority 4: Data Pipeline Infrastructure

**4a: Generation Script**

Build `scripts/generateCityData.mjs` as a reusable pipeline:

- Reads manifest for target cities
- Checks existing data completeness
- Generates missing sections via OpenAI API
- Validates output against TypeScript schemas
- Writes to the correct file paths
- Generates a quality report

CLI interface:

```bash
# Generate all data for empty cities
node scripts/generateCityData.mjs --empty-only

# Enrich a specific city
node scripts/generateCityData.mjs --city budapest

# Enrich a specific section for all cities
node scripts/generateCityData.mjs --section attractions --enrich-missing-fields

# Dry run (shows what would be generated)
node scripts/generateCityData.mjs --dry-run
```

**4b: Validation Script**

Enhance `scripts/validateCityData.mjs`:

- Schema validation against TypeScript interfaces
- Coordinate bounds checking (is the city actually in Europe?)
- Description quality scoring (length, language, duplicates)
- Cross-reference: do attraction neighborhoods match the neighborhoods list?
- Per-city quality score with letter grades (A-F)

**4c: Data Quality Dashboard**

Add a `/admin/data-quality` page (dev-only) that shows:

- Per-city completeness heatmap
- Missing field counts by section
- Cities ranked by data quality score
- One-click regeneration trigger

---

## Product Architecture — The Three Phases

### Phase 1: DECIDE — Temporal Travel Intelligence (mostly built)

**What exists:**

- Date-based city scoring engine (127 cities with calendar data, 93 pending)
- Deep city guides with tabbed content (overview, best time, map, monthly, food, neighborhoods, photos)
- Interactive Mapbox map exploration
- Visit calendar heatmap visualization
- SEO infrastructure (metadata, sitemap, JSON-LD for 220 city pages)
- Global search across 220 cities
- Affiliate integration scaffolding (GetYourGuide, Viator, Booking.com)

**What's missing to complete Phase 1:**

- Visit calendar data for the remaining 93 cities
- Multi-city date optimizer ("I have 2 weeks, suggest 3 cities")
- "Best time to visit X" landing pages (SEO play targeting high-volume queries)
- City comparison mode (side-by-side for same dates)

Phase 1 is the acquisition engine. People Google "best time to visit lisbon 2026," land on the city guide, get impressed by the depth, enter their dates, and cross the threshold into Phase 2.

### Phase 2: PLAN — The Agentic Itinerary Builder

Today the trip planner wizard produces a static itinerary. The evolved version is an **agentic planner** — an AI system that builds, refines, and adapts a trip plan through conversation and real-world data.

**How it works:**

1. **Scaffolds the itinerary** using the app's own structured data — attractions, neighborhoods, seasonal activities, culinary guide, visit calendar scores for those specific dates. This is the existing `buildItinerary.js` engine, elevated.

2. **Enriches with live data from Google Places API (New)** — for each attraction and restaurant in the plan, fetch current opening hours, ratings, review summaries, photos, accessibility info, and payment options. This grounds the itinerary in reality rather than static JSON.

3. **Presents the plan conversationally** — the user can say "I don't want to go to Sagrada Familia, I've been before" or "add more food experiences on day 3" and the agent restructures. LLM-powered with structured city data and Google Places data as context.

4. **Resolves constraints** — travel time between attractions (Google Routes API or estimated), opening hours conflicts, reservation requirements, budget tracking. The plan is feasible, not just a list.

5. **Exports as a living document** — the itinerary is a persistent object in Supabase, tied to the user's account, with a shareable URL, calendar export (.ics), and the ability to be modified until (and during) the trip.

**What the agentic planner is NOT:**

It is not a generic ChatGPT wrapper that hallucinates restaurant names. The agent is constrained to:

- The app's own structured city data (220 cities of curated content) as the primary source
- Google Places API (New) for live verification, enrichment, and discovery
- Deterministic scoring rules (visit calendar, interest matching, geographic clustering) for the plan skeleton
- LLM reasoning only for natural language interaction, constraint resolution, and personalization

The LLM generates the *conversation* and *decisions*. The data comes from structured sources.

**Agent tool access:**

- `score_city(city, dates)` — the existing visit calendar scorer
- `get_attractions(city, interests, limit)` — the app's attraction data, filtered
- `search_places(query, location, type)` — Google Text Search / Nearby Search
- `get_place_details(place_id)` — Google Place Details (hours, rating, reviews, photos)
- `get_weather_forecast(city, date)` — weather API
- `calculate_travel_time(origin, destination)` — estimated or via Routes API
- `update_itinerary(trip_id, changes)` — modify the persistent trip state

### Phase 3: LIVE — The Adaptive Daily Briefing

The feature that makes the app indispensable during the trip. The night before each day of the trip, the user receives an email with tomorrow's plan — adapted based on real conditions.

**Nightly briefing email (sent ~9 PM local time):**

- **Tomorrow's itinerary** — planned activities with times, addresses, and map links
- **Weather-driven adjustments** — "Rain expected 2-5 PM. We've swapped your afternoon park visit to the Picasso Museum (indoor, 4.6 stars, open until 8 PM). The park moves to Thursday when it's sunny."
- **Opening hours check** — "Heads up: the restaurant you planned for lunch is closed on Tuesdays. Here are 3 alternatives nearby, all rated 4.3+." (via Google Places `currentOpeningHours`)
- **Event alerts** — "There's a free jazz festival in Parc de la Ciutadella tomorrow evening. Fits your interests — want us to add it?"
- **Practical tips** — "Tomorrow's high is 22C. The metro strike is still ongoing — consider walking or using the Bicing bike share."
- **One-tap confirmations** — "Keep this plan" or "Adjust" links back to the app

**How weather adaptation works:**

1. Weather API provides 7-day forecast for the trip city
2. Each attraction is tagged as `indoor`, `outdoor`, or `weather_independent` (derivable from Google Places type + app data)
3. When rain/extreme heat/cold is forecasted for a time block, the system swaps outdoor activities for indoor alternatives
4. The swap respects: opening hours (Google Places), travel time, user interests, and day flow
5. The displaced outdoor activity gets rescheduled to the best weather window later in the trip

**How closure/change detection works:**

1. Before generating the nightly briefing, call Place Details (New) for each planned attraction/restaurant
2. Check `currentOpeningHours` (catches holiday closures, temporary shutdowns — not just regular hours)
3. If a place is closed, find alternatives using Nearby Search (New) with matching types and user preferences
4. User sees: "La Boqueria is closed tomorrow (holiday). Alternative: Mercat de Sant Antoni (4.4 stars, 12 min walk from your hotel, open 7AM-3PM)."

---

## Google Places API (New) — Integration Plan

### API surfaces and when to use each

| API | Use case | Billing tier |
|-----|----------|-------------|
| Place Details (New) | Enrich itinerary items, verify hours for nightly briefings | Cheapest (with place_id) |
| Text Search (New) | Initial place_id resolution, user-driven discovery | Moderate |
| Nearby Search (New) | Finding alternatives when a place is closed | Moderate |
| Place Photos (New) | Real photos in guides and itineraries | Per-request |
| Autocomplete (New) | Search-as-you-type in the planner | Session-based |
| AI-powered summaries | Place and review summaries for city guides | Included with Details |

### Cost optimization strategy

1. **Batch the initial place_id resolution.** One-time script: take every attraction across 220 cities, call Text Search to find the matching Google `place_id`. Store in city data JSON or a lookup table. One-time cost.
2. **Cache Place Details responses.** 24-hour TTL for active trips, 7-day TTL for city guide display.
3. **Use field masks aggressively.** Only request needed fields per call — billing scales with fields requested.
4. **Photo caching.** Cache photo URLs (not images, per TOS) and serve through CDN.
5. **Session tokens for Autocomplete.** Group keystrokes + selection into sessions.

### Field mask recommendations

**Itinerary enrichment** (most common call):
```
id,displayName,formattedAddress,rating,userRatingCount,
currentOpeningHours,regularOpeningHours,priceLevel,photos,
websiteUri,googleMapsUri,editorialSummary,reviews,
accessibilityOptions
```

**Nightly briefing verification** (lightweight):
```
id,currentOpeningHours,regularOpeningHours
```

**Discovery / alternatives** (richer):
```
places.id,places.displayName,places.formattedAddress,
places.rating,places.userRatingCount,places.currentOpeningHours,
places.priceLevel,places.photos,places.primaryType,
places.editorialSummary,places.generativeSummary
```

### Matching existing attractions to Google place_ids

The app has ~3,200+ attraction entries across 220 cities with names and coordinates.

1. For each attraction, call Text Search (New) with: `textQuery: "{attraction_name}, {city_name}"` and `locationBias` set to city coordinates
2. Take the top result's `place_id`
3. Store the mapping: `{ attractionName, citySlug, googlePlaceId }`
4. For low-confidence matches, flag for manual review

This creates a bridge between the app's curated data layer and Google's live data layer.

---

## How All the Pieces Connect

```
ACQUISITION (Phase 1 — free)
  SEO landing pages ("best time to visit lisbon") --> City guides
  City guides --> Date selector --> Scored recommendations
  "This looks great" --> Sign up to save / start planning

CONVERSION (Phase 2 — freemium/Pro)
  User enters trip dates + destination --> Agentic planner builds itinerary
  Planner enriches with Google Places (photos, hours, ratings, reviews)
  User refines conversationally --> Exports to calendar
  Free: 1 trip, basic plan. Pro: unlimited, multi-city, AI-enhanced

RETENTION (Phase 3 — active trip)
  Night before each day --> Adaptive briefing email
  Weather check + hours check + event check --> Adjusted plan
  "Book this" affiliate links --> Revenue at point of highest intent
  Post-trip --> Summary, photos, "plan your next trip" CTA

GROWTH LOOP
  Shareable trip URLs --> Friends discover the app
  "Best time to visit" SEO --> Organic traffic
  Post-trip satisfaction --> Repeat usage for next trip
```

---

## Build Phases

### Sprint 4: Data Foundation

**Goal**: Get 220 cities to baseline quality. Build the generation/validation pipeline.

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 4.1 | Build `scripts/generateCityData.mjs` — AI-powered batch generation pipeline with CLI | 1 day |
| 4.2 | Fill the 82 empty cities (attractions, neighborhoods, culinary, calendar, seasonal, connections) | 1 day (script + review) |
| 4.3 | Generate visit calendar data for the 93 cities currently missing it | 0.5 day |
| 4.4 | Enhance `scripts/validateCityData.mjs` — schema validation, coordinate bounds, quality scores | 0.5 day |
| 4.5 | Manual review pass on top 15 highest-traffic cities (Budapest, Warsaw, Krakow, Riga, Vilnius, Bucharest, Glasgow, Liverpool, Manchester, Oxford, Cambridge, Bath, Edinburgh, Prague, Vienna) | 1 day |
| 4.6 | Normalize data quality — standardize price ranges, ensure minimum description lengths, fix coordinate gaps | 0.5 day |

**Outcome**: 220/220 cities with complete data. Visit calendar coverage at 220/220. Scoring API returns results for all cities.

### Sprint 5: Google Places API Integration

**Goal**: Build the bridge between proprietary data and live Google data.

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 5.1 | Set up Google Cloud project, enable Places API (New), generate API key | 0.5 day |
| 5.2 | Build `src/lib/google-places/` — server-side utilities for Place Details, Text Search, Nearby Search, Place Photos, Autocomplete | 1 day |
| 5.3 | Build caching layer (Supabase or in-memory) for Place Details responses and place_id mappings | 0.5 day |
| 5.4 | Run batch place_id resolution script — match ~3,200 attractions to Google place_ids | 0.5 day |
| 5.5 | Enrich city guide attraction display with live Google data (ratings, photos, hours) | 1 day |
| 5.6 | Add Google Place Photos to city guides (hero images, attraction cards) | 0.5 day |

**Outcome**: City guides show live Google ratings, real photos, and current opening hours alongside proprietary content.

### Sprint 6: Persistent Trip State + Expanded Supabase Schema

**Goal**: Itineraries become mutable, persistent objects — not one-shot generations.

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 6.1 | Design and implement expanded Supabase schema: `trips`, `trip_days`, `trip_activities` (each with place_id, time_block, status, indoor/outdoor tag), `user_preferences` | 1 day |
| 6.2 | Migrate existing trip creation flow to new schema | 0.5 day |
| 6.3 | Build trip state API: CRUD for trips, days, activities with optimistic updates | 1 day |
| 6.4 | Shareable trip links (public read-only view of itinerary with map) | 0.5 day |
| 6.5 | Calendar export (.ics) for trips | 0.5 day |

**Outcome**: Trips are living objects that can be modified, shared, and exported. Foundation for agentic planner and nightly briefings.

### Sprint 7: Agentic Itinerary Planner

**Goal**: Replace the static wizard with a conversational, tool-using planner.

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 7.1 | Design agent tool interface: `score_city`, `get_attractions`, `search_places`, `get_place_details`, `get_weather_forecast`, `calculate_travel_time`, `update_itinerary` | 1 day |
| 7.2 | Build the agent orchestration layer (Gemini or OpenAI function calling with structured outputs) | 2 days |
| 7.3 | Build the conversational planner UI (chat interface alongside itinerary view) | 1.5 days |
| 7.4 | Integrate Google Places enrichment into the plan generation flow (live hours, ratings, photos per activity) | 1 day |
| 7.5 | Add constraint resolution: opening hours conflicts, travel time feasibility, weather tagging (indoor/outdoor) | 1 day |
| 7.6 | Wire up itinerary persistence — agent writes to Supabase trip state, user sees live updates | 0.5 day |

**Outcome**: Users can conversationally plan a trip with an AI that uses real data. Every place in the plan is verified, has real photos and ratings, and respects opening hours.

### Sprint 8: Nightly Adaptive Briefing

**Goal**: The app adapts the plan every night based on real conditions.

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 8.1 | Set up email infrastructure (Resend) with React Email templates | 1 day |
| 8.2 | Integrate weather API (OpenWeatherMap or WeatherAPI) — 7-day forecast per trip city | 0.5 day |
| 8.3 | Build the nightly adaptation engine: weather check → swap outdoor/indoor, hours check → detect closures, find alternatives via Nearby Search | 2 days |
| 8.4 | Build the briefing email template: tomorrow's plan, adjustments with reasons, alternatives, one-tap actions | 1 day |
| 8.5 | Set up cron job (Vercel Cron or Inngest) to trigger nightly at ~9 PM local time per trip | 0.5 day |
| 8.6 | Add "Keep this plan" / "Adjust" action links from email back to app | 0.5 day |

**Outcome**: Users on active trips get a nightly email with tomorrow's adapted plan. Rain triggers indoor swaps. Closures trigger alternatives. The plan stays grounded in reality.

### Sprint 9: Data Enrichment + New Dimensions

**Goal**: Deepen content quality and add feature-enabling data.

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 9.1 | Enrich attractions for 128 rich cities — add missing fields (transit, opening_hours, visit_profile, booking_tips, official_url) | 1 day |
| 9.2 | Generate experiences data for top 50 cities (Paris-style rich dataset with scores, coordinates, booking URLs, themes) | 1 day |
| 9.3 | Generate walking routes for top 30 cities | 0.5 day |
| 9.4 | Generate recurring event calendar for top 50 cities | 0.5 day |
| 9.5 | Add accommodation zone data to neighborhoods | 0.5 day |
| 9.6 | Generate photo spots data for top 30 cities | 0.5 day |
| 9.7 | Generate day trip connections for top 30 cities | 0.5 day |

**Outcome**: The richest city travel dataset in existence. 220 cities at baseline quality, top 50 with deep content, feature-enabling data for walking routes, events, accommodation, photo spots, and day trips.

### Sprint 10: Phase 1 Completion + SEO Growth

**Goal**: Complete the acquisition engine. Maximize organic traffic.

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 10.1 | Build "Best time to visit X" landing pages (`/best-time-to-visit/[city]`) — auto-generated from visit calendar data | 1 day |
| 10.2 | Multi-city date optimizer — input dates + city count, output optimal combinations with day splits | 2 days |
| 10.3 | City comparison mode — side-by-side for same dates (score, weather, crowds, events, costs) | 1 day |
| 10.4 | Submit expanded sitemap to Google Search Console | 0.5 day |

**Outcome**: 220 additional SEO landing pages. The "multi-city optimizer" becomes the marquee feature. Comparison mode helps users choose.

---

## Data Pipeline Infrastructure Summary

### Scripts to build

```bash
# Generation pipeline
scripts/generateCityData.mjs        # AI-powered batch generation
  --empty-only                       # Fill 82 empty cities
  --city budapest                    # Enrich a specific city
  --section attractions              # Enrich a specific section
  --enrich-missing-fields            # Add missing fields to existing data
  --dry-run                          # Preview what would be generated

# Validation pipeline
scripts/validateCityData.mjs         # Schema + quality validation
  --report                           # Generate full quality report
  --fix-normalize                    # Auto-fix normalizable issues

# Google Places bridge
scripts/resolveGooglePlaceIds.mjs    # Batch match attractions to place_ids
  --city paris                       # Resolve for one city
  --all                              # Resolve all cities
  --confidence-threshold 0.8         # Min match confidence

# Build pipeline (existing, extended)
npm run build:data                   # generateMonthlyIndex.mjs
npm run build:cities                 # generateCityIndex.mjs
npm run generate-cities              # generateCityList.mjs
npm run validate-data                # validateCityData.mjs
```

### Quality targets

| Metric | Current | Sprint 4 target | Sprint 9 target |
|--------|---------|-----------------|-----------------|
| Cities with all sections | 128/220 | 220/220 | 220/220 |
| Visit calendar coverage | 127/220 | 220/220 | 220/220 |
| Attractions with coordinates | ~60% | 90% | 98% |
| Attractions with 15+ fields | Paris only | Top 15 cities | Top 50 cities |
| Experiences data | 13/220 | 13/220 | 63/220 |
| Google place_id mapped | 0/220 | 0/220 | 128/220 |
| Data quality score A-B | ~50 cities | ~150 cities | ~200 cities |

---

## Execution Order Summary

```
Sprint 4:  Data foundation — fill 82 empty cities, validation pipeline
Sprint 5:  Google Places API — integration layer, place_id mapping, live enrichment
Sprint 6:  Trip state — persistent Supabase schema, shareable links, calendar export
Sprint 7:  Agentic planner — conversational, tool-using, Google Places-enriched
Sprint 8:  Nightly briefing — weather adaptation, closure detection, email delivery
Sprint 9:  Data enrichment — deep content for top 50, new data dimensions
Sprint 10: SEO + growth — "best time to visit" pages, multi-city optimizer, comparison
```

Sprints 4-6 are foundational (must be sequential). Sprints 7-8 depend on 5-6 but can partially overlap. Sprint 9 can run in parallel with 7-8. Sprint 10 can run anytime after Sprint 4.
