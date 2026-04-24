# EuroTrip Planner — Codebase Walkthrough

*Generated: February 7, 2026 | Updated: March 1, 2026*

---

## 1. Architecture Overview

### Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.1.11 |
| Language | JavaScript (mostly), 3 TypeScript files in `src/lib/city-data/` | ES2024+ |
| UI Library | React | 19.0.0 |
| Styling | Tailwind CSS | 3.4.1 |
| Maps | Mapbox GL JS + react-map-gl | 3.11.0 / 8.0.2 |
| Animation | Framer Motion | 12.4.10 |
| Auth | NextAuth (Google) + Supabase Auth (Google, email/password) — **both coexist** | 4.24.11 / 2.75.0 |
| AI | OpenAI (GPT-4.1 mini) + AWS Bedrock (Claude 3.5 Sonnet v2) — **multi-provider** | 6.3.0 / 3.1000.0 |
| Places API | Google Places API (live attraction data, photos, reviews) | — |
| Icons | Heroicons + Lucide React | 2.2.0 / 0.475.0 |
| UI Primitives | Headless UI | 2.2.0 |
| PDF Export | html2pdf.js | 0.12.1 |
| Image Processing | Sharp (server-side) | 0.33.0 |
| Analytics | Vercel Analytics | 1.5.0 |
| Monitoring | Sentry | 10.39.0 |
| Bundle Analysis | @next/bundle-analyzer | 15.3.1 |
| Deployment | Vercel (standalone output mode) | — |
| CDN | AWS CloudFront (`dknnqxb2tbc80.cloudfront.net`) | — |
| Database | Supabase (PostgreSQL) — trips, trip_days, trip_activities tables | — |
| Infrastructure | AWS Lambda + EventBridge + OpenSearch Serverless (for Bedrock agents) | — |

### Project Structure

```
bme-eurotrip-planner/
├── infra/                             # AWS infrastructure (NEW)
│   ├── template.yaml                  # CloudFormation/SAM template (236 lines)
│   ├── samconfig.toml                 # SAM CLI configuration
│   ├── sync-city-data.sh              # S3 city data upload script
│   └── handlers/                      # Lambda action group handlers
│       ├── cityData.js                # get_city_attractions (S3 lookup)
│       ├── googlePlaces.js            # get_place_details, search_nearby
│       ├── itinerary.js               # update_itinerary (Supabase)
│       ├── weather.js                 # get_weather_forecast (OpenWeatherMap)
│       └── briefingOrchestrator.js    # Nightly briefing generation
├── public/
│   ├── data/                          # 220 city data directories (~3,200+ JSON files)
│   │   ├── {Country}/{city}/          # Per-city data (overview, attractions, culinary, etc.)
│   │   │   ├── index.json             # Consolidated city index (build-generated)
│   │   │   ├── monthly/               # 12 monthly JSON files + index.json
│   │   │   ├── {city}-overview.json
│   │   │   ├── {city}_attractions.json
│   │   │   ├── {city}_culinary_guide.json
│   │   │   ├── {city}_neighborhoods.json
│   │   │   ├── {city}_connections.json
│   │   │   ├── {city}_seasonal_activities.json
│   │   │   └── {city}-visit-calendar.json
│   │   ├── manifest.json              # City registry with file hashes
│   │   ├── cities.json                # Lightweight city list
│   │   ├── sharedData.js              # Country flags
│   │   └── tripConstants.js           # Route presets, seasonality
│   ├── images/                        # City thumbnails, experience photos
│   └── videos/                        # Background videos
├── scripts/                           # Build & maintenance scripts (14+ files)
│   └── exportCityDataForKB.mjs        # Export city data to markdown for RAG (NEW)
├── src/
│   ├── app/                           # Next.js App Router pages
│   │   ├── layout.js                  # Root layout with Providers
│   │   ├── page.js                    # Homepage (client component)
│   │   ├── sitemap.js                 # Dynamic sitemap.xml generation (NEW)
│   │   ├── Providers.js               # Context provider stack
│   │   ├── fonts.js                   # DM Sans + EB Garamond
│   │   ├── globals.css                # Tailwind + custom styles (~775 lines)
│   │   ├── city-guides/
│   │   │   ├── page.js                # City index with filtering (744 lines)
│   │   │   └── [city]/page.js         # Dynamic city guide (server component)
│   │   ├── explore/page.js            # Interactive map page
│   │   ├── plan/[city]/page.js        # Generic city planner (378 lines) (NEW)
│   │   ├── paris-trip/page.js         # Paris multi-step planner (660 lines)
│   │   ├── itineraries/[tripId]/page.js # Trip itinerary display with AI chat
│   │   ├── saved-trips/page.js        # Wishlist/saved items
│   │   ├── start-planning/page.js     # Planner entry point
│   │   ├── regions/page.js            # EMPTY FILE
│   │   ├── preview/                   # 5 design theme previews (aurora, editorial, glass, metro, noir)
│   │   ├── api/                       # API routes
│   │   │   ├── ai/chat/route.js       # OpenAI Paris itinerary
│   │   │   ├── plan/                  # Agentic itinerary refinement (NEW)
│   │   │   │   ├── agent/route.js            # OpenAI streaming agent
│   │   │   │   ├── agent-bedrock/route.js    # Bedrock Converse API agent
│   │   │   │   ├── agent-bedrock-rc/route.js # Bedrock return control agent
│   │   │   │   └── agent-invoke/route.js     # Bedrock managed agent
│   │   │   ├── auth/[...nextauth]/route.js # NextAuth
│   │   │   ├── cities/route.js        # City listing (edge)
│   │   │   ├── cities/[city]/route.js # Individual city data
│   │   │   ├── suggestions/route.js   # Mock suggestions (edge)
│   │   │   ├── trips/route.js         # Create trip (Supabase)
│   │   │   └── trips/[id]/route.js    # Get/update trip (Supabase)
│   │   └── auth/
│   │       ├── callback/route.js      # Supabase OAuth callback
│   │       └── error/page.js          # Auth error page
│   ├── components/
│   │   ├── city-guides/               # ~35 components for city guide pages
│   │   ├── common/                    # ~28 shared UI components
│   │   ├── itinerary/                 # Itinerary components (NEW)
│   │   │   ├── PlannerChat.js         # AI chat panel (369 lines)
│   │   │   └── ItineraryClient.js     # Client-side itinerary rendering
│   │   ├── map/                       # ~18 map-related modules
│   │   ├── monthly-visit-guide/       # ~12 monthly guide components
│   │   ├── planner/                   # 6 trip planner components
│   │   ├── calendar/                  # 1 calendar component
│   │   └── auth/                      # 1 auth button
│   ├── context/                       # MapDataContext, TravelDataProvider
│   ├── contexts/                      # AuthContext (Supabase)
│   ├── hooks/                         # 9+ custom hooks
│   │   └── useTripDates.js            # Trip date management (NEW)
│   ├── lib/                           # Utilities, Supabase clients, planning engine
│   │   ├── city-data/                 # TypeScript path/fetcher utilities
│   │   ├── planning/                  # Generic itinerary engine (refactored from Paris-only)
│   │   │   ├── buildItinerary.js      # Generic city itinerary builder (NEW)
│   │   │   └── buildParisRecommendations.js # Paris-specific logic (legacy)
│   │   ├── google-places/             # Google Places API integration (NEW)
│   │   │   ├── index.js               # Barrel export
│   │   │   ├── client.js              # Raw API client
│   │   │   ├── cache.js               # 24h caching layer
│   │   │   └── enrichment.js          # Background enrichment
│   │   ├── agent/                     # Agent infrastructure (NEW)
│   │   │   ├── agentTools.js          # Tool definitions & executors (424 lines)
│   │   │   └── tripState.js           # Trip/day/activity state management
│   │   └── supabase/                  # Client + server Supabase instances
│   ├── services/                      # cityDataService.js
│   └── utils/                         # 8+ utility modules
├── package.json
├── next.config.mjs
├── tailwind.config.mjs
├── jsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── BEDROCK_CONSOLE_SETUP.md           # Step-by-step Bedrock setup (480 lines) (NEW)
├── BEDROCK_AGENTS_LEARNING.md         # Architecture & philosophy (494 lines) (NEW)
├── MONETIZATION_PLAN.md
├── PARIS_MVP_PLAN.md
├── launch_PLAN.md                     # Duplicate of MONETIZATION_PLAN.md
├── European_Cities_Analysis.md
└── README.md
```

### Data Flow

**City Guide Page Example** (the core user flow):

1. **Build time**: `scripts/generateCityIndex.mjs` reads individual JSON files for each city and creates a consolidated `index.json`. `scripts/generateMonthlyIndex.mjs` merges monthly files into `monthly/index.json`. `scripts/build-manifest.js` creates `public/data/manifest.json` with a registry of all cities and file hashes.

2. **Request time** (`src/app/city-guides/[city]/page.js` — server component):
   - `generateStaticParams()` reads `manifest.json` to pre-render all city pages at build time (SSG).
   - `getCityData(cityName)` reads the consolidated `index.json` via `fs.readFile` on the server, with fallback logic to try individual files if the index is missing fields.
   - Only the current month + next month's monthly data is loaded initially (performance optimization).
   - The full data object is passed as props to `CityPageClient`.

3. **Client hydration** (`src/components/city-guides/CityPageClient.js` — client component):
   - Receives `cityData` and `cityName` as props.
   - Renders a tabbed interface with lazy-loaded tab content via `React.lazy()` + `Suspense`.
   - When the user switches to the "Monthly Guide" tab, `useMonthlyData` hook fetches the full `monthly/index.json` from the public data directory via client-side fetch.
   - Map tab uses Mapbox GL with attractions from the server-provided data.

4. **CDN layer**: When `NEXT_PUBLIC_CDN_URL` is set, `cdnUtils.js` rewrites image/video paths to CloudFront URLs. Otherwise falls back to local `/images/` paths.

### Agentic Itinerary Refinement Flow (NEW — February 25-28, 2026)

**The app now supports AI-powered itinerary refinement through a multi-provider agent system:**

1. **Initial itinerary generation**: When a user creates a trip via `/plan/{city}` or `/paris-trip`, the server generates an initial day-by-day itinerary using `buildItinerary.js` (generic) or `buildParisRecommendations.js` (Paris legacy). This creates normalized records in `trip_days` and `trip_activities` tables.

2. **Itinerary display**: The `/itineraries/[tripId]` page server-loads the trip from Supabase via `getTripWithDetails()`, which hydrates all days and activities in a single query. The data is passed to `ItineraryClient` (client component).

3. **AI chat panel**: `ItineraryClient` lazy-loads `PlannerChat` component on mount. A floating "Refine with AI" button slides up a 600px chat panel from the bottom-right.

4. **User message**: User types a request like "Replace the museum with something outdoors" → client sends POST to `/api/plan/agent` (or `/agent-bedrock` based on `NEXT_PUBLIC_AGENT_PROVIDER` env var).

5. **Agent execution**: The API route:
   - Builds context-aware system prompt from trip data (dates, pace, interests, current itinerary)
   - Sends streaming request to OpenAI/Bedrock with 4 grounded tools available:
     - `get_city_attractions` → Reads city JSON + filters by interests
     - `get_place_details` → Live Google Places API lookup (hours, ratings, photos)
     - `search_nearby` → Finds alternatives near coordinates
     - `update_itinerary` → Swaps activity in Supabase, emits `activity_updated` SSE event
   - Streams back Server-Sent Events: `delta` (text), `tool_call` (tool invocation), `tool_result` (tool output), `activity_updated` (DB mutation), `done`

6. **UI update**: When client receives `activity_updated` event:
   - Parses updated activity data from event payload
   - Updates local plan state optimistically
   - Pulses the affected day card with gold border
   - Shows "✦ AI Updated: {activity name}" badge
   - Auto-scrolls message thread

**Multi-provider architecture**:
- **OpenAI** (`/api/plan/agent`): Uses `gpt-4.1-mini`, synchronous tool execution, highest stability
- **Bedrock Converse** (`/api/plan/agent-bedrock`): Uses `claude-3-5-sonnet-v2`, token streaming, exponential backoff retry, OpenAI fallback
- **Bedrock Return Control** (`/api/plan/agent-bedrock-rc`): Bedrock manages orchestration loop, local tool execution, max 10 rounds
- **Bedrock Invoke** (`/api/plan/agent-invoke`): Fully managed agent (requires deployed Lambda action groups)

**Tool implementation** (`src/lib/agent/agentTools.js`):
- Exports tool schemas for both OpenAI (JSON Schema) and Bedrock (different format)
- Executors read city data from filesystem, call Google Places API, write to Supabase
- Returns human-friendly summaries (e.g., "Found 7 restaurants matching 'Food' interest near Trastevere")

**Database schema** (normalized trip state via `src/lib/agent/tripState.js`):
- `trips` table (existing) — trip-level metadata
- `trip_days` table (NEW) — one row per day with date, theme, notes
- `trip_activities` table (NEW) — granular activities with time blocks, Google Place IDs, swap reasons

---

## 2. Content & Data Architecture

### How city data is structured

Each city has a directory under `public/data/{Country}/{city}/` containing 7-9 JSON files plus a `monthly/` subdirectory with 12 monthly files.

**City index schema** (consolidated `index.json`):
```json
{
  "overview": { "city_name", "country", "brief_description", "nickname", "sections[]", "why_visit", "practical_info", "seasonal_notes", "best_time_to_visit", "things_to_do_tiers" },
  "attractions": { "sites": [{ "name", "type", "description", "latitude", "longitude", "arrondissement", "price_range", "ratings": { "cultural_significance", "suggested_duration_hours" }, "opening_hours", "visit_profile", "website" }] },
  "neighborhoods": { "neighborhoods": [{ "name", "character", "location", "categories": { "touristy", "shopping", "dining", "nightlife" }, "highlights", "appeal" }] },
  "culinaryGuide": { "restaurants": { "fine_dining[]", "casual_dining[]", "street_food[]" }, "bars_and_cafes", "food_experiences" },
  "connections": { /* transport links */ },
  "seasonalActivities": { /* seasonal recommendations */ },
  "visitCalendar": { "months": { "january": { "ranges": [{ "days[]", "score", "event", "crowdLevel", "travelerTypes" }] } } },
  "summary": { /* optional city summary */ }
}
```

**220 cities across 39 countries** are stored, with data sourced from AI generation. The data directory structure uses **inconsistent casing**: some countries use PascalCase (`Bosnia-and-Herzegovina/Mostar/`), others use lowercase (`France/paris/`).

### Critical data quality issue: copy-paste contamination

**10 cities** have files named `tirana_*.json` and `tirana-*.json` instead of their actual city name — this means their overview, attractions, neighborhoods, culinary guide, connections, seasonal activities, and visit calendar files contain **Tirana data, not their own city's data**. Affected cities include: Hallstatt, Mostar, Sarajevo, Plovdiv, Sofia, Varna, Limassol, Nicosia, Tartu, Tallinn.

Additionally, many cities lack properly-named city-specific files entirely (relying on fallback `tirana_*` files or having no data at all):
- All 11 Polish cities
- Luxembourg City
- Multiple Dutch, Estonian, and Cypriot cities
- Tromsø

### How experiences/attractions are structured

Paris has a rich experiences file (`paris-experiences.json`, ~163K chars) with a scoring system:

```json
{
  "scores": {
    "cultural_historical_significance": 8,
    "visitor_experience_quality": 9,
    "accessibility": 7,
    "value_for_money": 8,
    "uniqueness_to_paris": 9,
    "photo_instagram_appeal": 10,
    "crowd_management": 6,
    "educational_value": 7,
    "family_friendliness": 8,
    "weather_independence": 5,
    "total_score": 77
  }
}
```

Experiences are categorized by time of day (Morning, Afternoon, Evening, Night) and include coordinates, pricing, duration, booking URLs, and theme tags. **Only Paris currently has an experiences file** — this feature has not been rolled out to other cities.

### How seasonal/timing data works

The visit calendar (`{city}-visit-calendar.json`) provides day-range granularity within each month:
- Each range has a `score` (1-5), `crowdLevel`, `travelerTypes`, `event` name, and practical notes.
- Data is structured by `first_half` and `second_half` of each month with weather, tourism levels, events/holidays, and unique experiences.

Monthly JSON files (`monthly/{month}.json`) provide:
- `reasons_to_visit[]` and `reasons_to_reconsider[]`
- Half-month breakdowns with weather data, tourism levels, events, and unique experiences
- Each experience includes estimated cost, best time, weather dependency, and practical tips

The `EnhancedVisitCalendar` component renders this as a color-coded heatmap calendar with traveler-type filtering.

---

## 3. Page-by-Page Breakdown

### Homepage (`/` — `src/app/page.js`)
- **Route**: `/`
- **Type**: Client component (`"use client"`)
- **Key components**: `DateSelector`, `ResultsGrid`, `CityCard`, `SampleItineraryPreview` (lazy), `AuthButton`
- **Data**: Static city data from `cityData.js`, API call to `/api/suggestions` for date-based results
- **UX flow**: Hero with date selector → shows curated city sections (September highlights, Mediterranean, Alpine, Ready-Made Adventures) until dates selected → then shows results grid
- **Issues**: 
  - Hardcoded "September" in section headers (line 192) — not dynamic
  - Hardcoded city lists for featured sections (munich, barcelona, venice, nice, etc.)
  - "Countries" button opens `SampleItineraryPreview` modal instead of a countries page (misleading label)
  - Footer has placeholder links (Help Center, Contact Us, Privacy Policy, Terms — all `href="#"`)
  - Footer says "125+ European Cities" — outdated, there are 220

### City Guides Index (`/city-guides` — `src/app/city-guides/page.js`)
- **Route**: `/city-guides`
- **Type**: Client component (744 lines)
- **Key components**: `CityCard`, `CityCardSkeleton`, `UnifiedFilter`, `GlobalSearch`, `BackToTopButton`
- **Data**: `getCitiesData()` from `cityData.js` (static array), `manifest.json` via fetch for search
- **UX flow**: Search bar + filters (region, country, tourism category) → paginated grid (24/page) + popular cities sidebar + browse by country with alphabet TOC
- **Issues**: Uses `localStorage` caching with 5-minute TTL for search/filter results

### Individual City Guide (`/city-guides/[city]` — `src/app/city-guides/[city]/page.js`)
- **Route**: `/city-guides/{city-slug}`
- **Type**: Server component (SSG via `generateStaticParams`)
- **Key components**: `CityPageClient` → `Hero`, `SaveToTrips`, `AuthButton`, lazy-loaded tab components
- **Data**: Server-side `fs.readFile` of consolidated `index.json` + individual files as fallback
- **Tabs**: Start Here, Best Time to Go, Interactive Map, Monthly Guide, Experiences, Food + Drink, Photo Spots, Neighborhoods
- **UX flow**: Full-bleed hero image → sticky tab bar → content per tab with slide transitions → tabs preload on hover
- **Issues**: 
  - Only ~20 cities have hardcoded coordinates in `CITY_COORDINATES` — others fall back to central Europe `[9.19, 48.66]`
  - Missing SEO metadata — `generateMetadata` not implemented (only default title from root layout)

### Explore (`/explore` — `src/app/explore/page.js`)
- **Route**: `/explore`
- **Type**: Client component
- **Key components**: `LazyMapComponentWrapper` (dynamic import), `MapDataProvider`
- **Data**: All city data from `cityData.js` passed as `destinations`
- **UX flow**: Full-screen interactive Mapbox map with filters (country, search, date, rating), city popups, and ranked list panel

### Generic City Planner (`/plan/[city]` — `src/app/plan/[city]/page.js`) **[NEW]**
- **Route**: `/plan/{city-slug}`
- **Type**: Client component (378 lines)
- **Steps**: 5-step wizard: Dates → Pace (Relaxed/Balanced/Active cards) → Interests (10 categories) → Must-See Attractions → Budget (Budget/Mid-Range/Premium)
- **Data**: Fetches city attractions from `/api/cities/{city}`, uses `useTripDates` hook for date state
- **UX flow**: Multi-step progression with validation → "Create Itinerary" button → POSTs to `/api/trips` → redirects to `/itineraries/[tripId]`
- **Styling**: Dark mode with gold accents (`#c9963c`)
- **Status**: Replaces Paris-specific planner, works for all 220 cities

### Paris Trip Planner (`/paris-trip` — `src/app/paris-trip/page.js`) **[LEGACY]**
- **Route**: `/paris-trip`
- **Type**: Client component (660 lines)
- **Steps**: 7-step wizard: Dates → Hotel Location → Prebookings → Pace → Interests → Budget → Summary
- **Data**: Creates trip payload, POSTs to `/api/trips`, then redirects to `/itineraries/[tripId]`
- **Status**: Legacy Paris-only flow, now superseded by `/plan/paris` but kept for backward compatibility

### Trip Itinerary (`/itineraries/[tripId]` — `src/app/itineraries/[tripId]/page.js`) **[UPDATED]**
- **Route**: `/itineraries/{tripId}`
- **Type**: Server component with client-side AI chat
- **Data**: Server-side `getTripWithDetails()` hydrates trip from Supabase (trips → trip_days → trip_activities). For Paris trips, loads additional data from filesystem and runs `buildParisRecommendations()` if needed. For other cities, uses generic `buildItinerary()`.
- **Key components**: `ItineraryClient` (client component) → day cards + lazy-loaded `PlannerChat` (AI refinement panel)
- **UX flow**:
  - Trip summary (title, dates, city, preferences)
  - Day-by-day cards with time blocks (morning=orange, afternoon=blue, evening=red, night=purple)
  - Each activity shows: name, duration, price range, neighborhood, photo (from Google Place ID or gradient fallback)
  - Floating "Refine with AI" button (bottom-right) → slides up chat panel
  - User can request activity swaps via natural language
  - Real-time activity updates with pulsing animation + "✦ AI Updated" badge
  - Booking reminders, transfer time calculations
- **New features (Feb 25-28)**:
  - AI-powered itinerary refinement via streaming agents
  - Live Google Places data integration (photos, ratings, hours)
  - Optimistic UI updates on activity swaps
  - Multi-provider agent support (OpenAI/Bedrock selectable via env var)

### Saved Trips (`/saved-trips` — `src/app/saved-trips/page.js`)
- **Route**: `/saved-trips`
- **Type**: Client component
- **Data**: Supabase for authenticated users, `localStorage` for anonymous users
- **UX flow**: Tabs for saved cities and experiences, grouped by city, with remove capability

### Start Planning (`/start-planning` — `src/app/start-planning/page.js`)
- **Route**: `/start-planning`
- **Type**: Client component wrapper for `EuroTripPlanner`
- **Data**: Uses `TravelFilterBox` for multi-step planning flow

### Regions (`/regions` — `src/app/regions/page.js`)
- **Route**: `/regions`
- **EMPTY FILE** — returns nothing, likely a dead route

### Design Previews (`/preview/{theme}`)
- **Routes**: `/preview/aurora`, `/preview/editorial`, `/preview/glass`, `/preview/metro`, `/preview/noir`
- 5 experimental design themes — likely for internal review, not user-facing
- Each is a standalone page with hardcoded content

---

## 4. Component Inventory

### Root Components (`src/components/`)

| File | Purpose | Props | Used In | Issues |
|------|---------|-------|---------|--------|
| `DateSelector.jsx` | Calendar date picker with weekend detection | `onChange` | Homepage | Decent, could use TypeScript |
| `EuroTripPlanner.js` | Main planner with explore/interest/seasonal/custom tabs | None (uses internal state) | `/start-planning` | Large monolithic component |
| `InlineDateControl.jsx` | Compact inline date picker with popover | `dates, setDates, tripLength, ...` | City guides | Works well |
| `ResultCard.jsx` | Card for suggestion results | `result` | `ResultsGrid` | Simple, functional |
| `ResultsGrid.jsx` | Sortable grid of results | `results, sortBy, setSortBy` | Homepage | Virtualized, good perf |
| `SampleItineraryPreview.jsx` | Modal showing sample itineraries | `isOpen, onClose` | Homepage | Misleadingly triggered by "Countries" button |

### City Guides (`src/components/city-guides/`)

| File | Purpose | Issues |
|------|---------|--------|
| `CityPageClient.js` (487 lines) | Main tabbed city page | Large file, hardcoded coordinates for ~20 cities |
| `StartHere.js` | Essential info, FAQs, arrival guide | — |
| `CityOverview.js` | City introduction + visit calendar | — |
| `AttractionsList.js` | Attractions with filtering/scoring | — |
| `AttractionsListRefactored.js` | **Duplicate** — refactored version coexists with original | Dead code? |
| `CityCard.js` | City card for grids | — |
| `CityCardSkeleton.js` | Loading skeleton | — |
| `MapSection.js` | City-level map | — |
| `CityMapWithMapbox.js` | Alternative map implementation | Possibly unused |
| `LazyMapWithMapbox.js` | Lazy wrapper | — |
| `CityMapLoader.js` | Map loading component | — |
| `MonthlyGuideSection.js` | Monthly guide tab content | — |
| `MonthlyVisitGuide.js` | Monthly visit guide | Possibly overlaps with `MonthlyGuideSection` |
| `MonthlyTabbedView.js` | Tabbed monthly view | — |
| `SingleMonthView.js` | Single month detail | — |
| `StackedYearView.js` | Year overview | — |
| `ParisMonthlyContent.js` | Paris-specific monthly content | Hardcoded to Paris |
| `SeasonalActivities.js` | Seasonal recommendations | — |
| `FoodDrinkGuide.js` | Food & drink tab | — |
| `CulinaryGuide.js` | **Duplicate** of FoodDrinkGuide concept | Overlap |
| `PhotoSpots.js` | Photography spots | — |
| `NeighborhoodsList.js` | Neighborhoods tab | — |
| `TransportConnections.js` | Transport info | — |
| `PopularRoutes.js` | Route suggestions | — |
| `CityVisitSection.js` | Visit planning section | — |
| `EnhancedVisitCalendar.js` | Heatmap calendar with traveler types | Feature-rich, well-built |
| `GlobalSearch.js` | Cross-city search | — |
| `CountryFilter.js` | Country filter dropdown | — |
| `RegionFilter.js` | Region filter | — |
| `UnifiedFilter.js` | Combined filter component | — |
| `cityData.js` (~2,283 lines) | **Hardcoded array of all 220 cities** | Massive file, should be generated |
| `regionData.js` | Region/country classification data | — |
| `regionThemes.js` | Region styling/theming | — |
| `coastalCityIds.js` | List of coastal city IDs | — |

### Common (`src/components/common/`)

| File | Purpose | Issues |
|------|---------|--------|
| `UILibrary.js` | Button, Input, Select, Card, Badge, Modal, Tabs | Good abstraction layer |
| `Hero.jsx` | Full-bleed hero with image fallback chains | Complex image resolution logic |
| `HeaderSection.js` | Page header | — |
| `InteractiveHeader.js` | Animated header | — |
| `NavigationTabs.js` | Tab navigation | — |
| `BackToTopButton.js` | Scroll-to-top | — |
| `DateRangePicker.jsx` | Date range selector | Overlaps with DateSelector |
| `DateRangePopover.jsx` | Popover date picker | **Third** date picker variant |
| `DateSelectionStep.js` | Step component for dates | **Fourth** date-related component |
| `CitySelectionStep.js` | City picker for planner | — |
| `TravelFilterBox.js` | Multi-step travel filter | — |
| `TripCustomizationStep.js` | Trip customization | — |
| `CurrencySelector.js` | Currency with context provider | Exports `CurrencyProvider` + `useCurrency` |
| `SaveToTrips.js` | Save/wishlist with Supabase + localStorage | Dual-mode (auth/anon) |
| `ShareButtons.js` | Social share | — |
| `ExportPDF.js` | PDF export via html2pdf.js | — |
| `SearchBar.js` | Search input | — |
| `EnhancedLoadingSystem.js` | Advanced loading states | — |
| `LoadingOverlay.js` | Full-screen loading | — |
| `SkeletonLoader.js` | Multiple skeleton variants | — |
| `LazyComponents.js` | `React.lazy()` wrappers for all heavy components | Good code-splitting strategy |
| `OptimizedVideo.js` | Video with connection-aware quality | — |
| `VideoPreloader.js` | Background video preloading | — |
| `PreloadingProvider.js` | Smart component preloading | — |
| `Primitives.js` | Low-level UI primitives | — |
| `ui-components.js` | Additional UI helpers | Overlaps with `UILibrary.js` |
| `AuthButton.jsx` | Auth button | **Duplicate** of `auth/AuthButton.js` |

### Map (`src/components/map/`)

18 files forming a comprehensive map system:
- `MapComponent.js` (~545 lines) — main Mapbox integration
- `OptimizedMapComponent.js` — performance-focused version
- `FilterComponents.js`, `FilterContainer.js` — filter UI
- `RankedListPanel.js` — ranked destination list
- `CityDetailsPopup.js` — city info popup
- `DataPreloader.js` — background data fetching
- `CacheManager.js` — debug cache tool
- Utility files: `mapUtils.js`, `mapService.js`, `mapPopup.js`, `markers.js`, `popups.js`, `layers.js`, `helpers.js`, `filters.js`, `constants.js`

### Monthly Visit Guide (`src/components/monthly-visit-guide/`)

Well-organized sub-module with `index.js` barrel:
- `MonthlyCalendarView.js` — calendar visualization
- `calendarDataLoader.js` — data loading
- `content/` — `EventsSection`, `ExperiencesSection`, `TourismSection`, `WeatherSection`
- `sections/` — `MonthDetail`, `MonthOverview`, `MonthSelector`, `HalfMonthSection`, `ProsConsSection`
- `ui/` — `EmptyStateMessage`
- `utils/` — `monthUtils.js`

### Planner (`src/components/planner/`)

6 components for the trip planning flow: `InterestCategories`, `PaginatedRow`, `RouteFilters`, `SeasonalRecommendations`, `SelectedCitiesList`, `TripRouteDisplay`

### Itinerary (`src/components/itinerary/`) **[NEW]**

| File | Purpose | Lines | Notes |
|------|---------|-------|-------|
| `ItineraryClient.js` | Client-side itinerary renderer with AI chat integration | ~500 | Lazy-loads PlannerChat, manages local plan state, optimistic updates |
| `PlannerChat.js` | AI chat panel for itinerary refinement | 369 | SSE streaming, tool result pills, starter prompts, auto-scroll |

### Agent Infrastructure (`src/lib/agent/`) **[NEW]**

| File | Purpose | Lines | Notes |
|------|---------|-------|-------|
| `agentTools.js` | Tool definitions & executors for both OpenAI and Bedrock | 424 | 4 tools: get_city_attractions, get_place_details, search_nearby, update_itinerary |
| `tripState.js` | Normalized trip state management (trips/days/activities) | ~300 | `createTripWithDays()`, `getTripWithDetails()`, `swapActivity()` |

### Google Places Integration (`src/lib/google-places/`) **[NEW]**

| File | Purpose | Notes |
|------|---------|-------|
| `index.js` | Barrel export with caching layer | — |
| `client.js` | Raw Google Places API client | Field masks for performance |
| `cache.js` | 24-hour TTL cache for place details + photo URLs | — |
| `enrichment.js` | Background enrichment of city attractions with Google Place IDs | — |

---

## 5. Engineering Assessment

### Code Quality

**Consistency: 4/10**
- File naming is inconsistent: mix of camelCase (`cityData.js`), kebab-case (`city-guides/`), PascalCase (`CityPageClient.js`)
- Data directory casing is mixed: `France/paris/` vs `Bosnia-and-Herzegovina/Mostar/` vs `Austria/graz/`
- Two separate context directories: `src/context/` and `src/contexts/`
- Duplicate components exist:
  - `auth/AuthButton.js` and `common/AuthButton.jsx`
  - `AttractionsList.js` and `AttractionsListRefactored.js`
  - `CulinaryGuide.js` and `FoodDrinkGuide.js`
  - `UILibrary.js` and `ui-components.js`
  - 4 different date picker implementations

**TypeScript usage: 2/10**
- Only 3 TypeScript files exist (`src/lib/city-data/fetchers.ts`, `index.ts`, `paths.ts`)
- No TypeScript for components, hooks, or utilities
- No type definitions for the complex JSON data schemas
- `jsconfig.json` is used instead of `tsconfig.json`
- Zero PropTypes validation anywhere

**Error handling: 5/10**
- Server-side city data loading has decent try-catch with fallbacks (`readWithFallbacks`)
- API routes have basic error responses
- Missing: Error boundaries, client-side error recovery, user-facing error messages for fetch failures
- Silent failures in many places (`console.error` then return null)

**Loading/empty states: 7/10**
- Good skeleton loaders (`SkeletonLoader.js` with multiple variants)
- Tab transitions with skeleton placeholders
- Monthly guide has loading/error states
- Missing: Empty states for search with no results, offline fallback

**Accessibility: 4/10**
- ARIA labels on tab buttons (`aria-label`, `aria-current`)
- Keyboard navigation not tested/implemented for custom components
- Color contrast may be insufficient (light gray text on white backgrounds)
- No skip-to-content link
- Emoji used as icons in tabs (screen reader unfriendly: `🚀`, `📆`, `🗺️`)
- `globals.css` has `prefers-reduced-motion` media query (good)

### Performance

**Bundle size concerns:**
- `cityData.js` is **2,283 lines** of hardcoded city data loaded into every client page that imports it — this is the entire city database inlined in the JS bundle
- Both `mapbox-gl` and `react-map-gl` are large dependencies (~200KB+ each)
- `framer-motion` adds ~32KB gzipped for animations
- `html2pdf.js` is loaded for PDF export even when not used
- Two icon libraries (`@heroicons/react` + `lucide-react`) — should pick one

**Image optimization: 6/10**
- Next.js `<Image>` component used in many places
- CloudFront CDN for production images
- `sharp` available for server-side processing
- Scripts for JPEG conversion and compression exist
- Missing: No WebP/AVIF format optimization, no responsive `srcset` in all places

**Data loading: 7/10**
- SSG for city pages (good — pre-rendered at build time)
- Lazy monthly data loading (only current + next month on SSR)
- `force-cache` on many data fetches
- `localStorage` caching in city guides index (5-min TTL)
- Concerns: `cityData.js` loaded entirely on client, suggestions API has artificial 450ms delay

**Code splitting: 8/10**
- `LazyComponents.js` provides `React.lazy()` wrappers for all heavy components
- Tab content loaded on demand with `Suspense`
- Tab preloading on hover (`preloadTab()`)
- Map component dynamically imported
- Video components lazy-loaded

**Bottlenecks:**
- `cityData.js` (2,283 lines) in client bundle for every page using city data
- 220 cities × ~10 JSON files each = ~3,200 files in `public/data/` — build times
- `buildParisRecommendations.js` reads from filesystem synchronously (`fs.readFileSync`)

### SEO

**Meta tags: 3/10**
- Root layout has a single generic `<title>` and `<description>` — the same for all pages
- No `generateMetadata()` on the city guide dynamic route — **every city page has the same title** ("Eurotrip Planner & City Guides")
- No Open Graph tags
- No Twitter Card meta
- No JSON-LD structured data

**This is the single biggest missed opportunity.** With 220 city pages, proper SEO could drive massive organic traffic. Each page should have:
```javascript
// src/app/city-guides/[city]/page.js
export async function generateMetadata({ params }) {
  const { city } = await params;
  const cityData = await getCityData(city);
  return {
    title: `${cityData.cityName} Travel Guide | Best Time to Visit, Things to Do`,
    description: cityData.overview?.brief_description,
    openGraph: {
      title: `${cityData.cityName} City Guide`,
      description: cityData.overview?.brief_description,
      images: [{ url: getCityHeroImage(city) }],
    },
  };
}
```

**Sitemap: 8/10** **[✅ IMPLEMENTED — Feb 2026]** — `src/app/sitemap.js` dynamically generates sitemap.xml with all 220 city pages. Includes homepage, city guides index, explore map, and start planning routes. Uses Next.js 13+ native sitemap generation. **Missing**: robots.txt file, lastModified dates based on actual content updates (currently uses `new Date()`), changeFrequency optimization based on page type.

**Canonical URLs: 0/10** — None set.

### Security

**CRITICAL: API keys exposed in `.env.local` committed to the repository:**

The `.env.local` file contains **real, active credentials**:
- Mapbox access token (public key — lower risk)
- Supabase URL and anon key (public by design, moderate risk)
- **Supabase service role key** (CRITICAL — grants admin database access)
- **Database password** (CRITICAL)
- **OpenAI API key** (CRITICAL — direct cost exposure)

While `.env.local` is in `.gitignore`, the fact that it exists with real keys suggests these may have been committed at some point. The service role key and OpenAI key should be rotated immediately.

**Other security concerns:**
- No rate limiting on API routes
- No CSRF protection on trip creation
- OpenAI API key used server-side (correct) but no request validation
- Supabase service role used for trip operations — should use row-level security with user tokens instead
- No input sanitization on city name parameter (though it's matched against manifest)

### Testing

**Test coverage: 0/10** — Zero test files exist. No testing framework configured. No `__tests__/` directory.

**What should be tested (priority order):**
1. `buildParisRecommendations.js` — complex business logic (unit tests)
2. Data loading pipeline — `getCityData()` with various edge cases
3. City data schema validation — ensure all 220 cities have required fields
4. API routes — input validation, error cases
5. `EnhancedVisitCalendar` — score rendering, traveler type filtering
6. Date utilities — month calculations, range parsing

---

## 6. Specific Improvement Recommendations

### Tier 1: Quick Wins (< 1 day each)

**1. Add SEO metadata to city pages (2 hours)**
```javascript
// src/app/city-guides/[city]/page.js — add before the default export
export async function generateMetadata({ params }) {
  const { city } = await params;
  const cityData = await getCityData(decodeURIComponent(city));
  if (!cityData) return {};
  const displayName = cityData.cityName;
  const description = cityData.overview?.brief_description || `Complete travel guide for ${displayName}`;
  return {
    title: `${displayName}, ${cityData.country} — Travel Guide & Best Time to Visit | EuroTrip`,
    description,
    openGraph: { title: `${displayName} Travel Guide`, description, type: 'article' },
    alternates: { canonical: `/city-guides/${city}` },
  };
}
```

**2. Add sitemap.xml (1 hour)** **[✅ COMPLETE]**
~~Create `src/app/sitemap.js`~~ — Already implemented. The sitemap dynamically generates all 220 city pages plus static routes.

**2b. Add robots.txt (5 minutes)** **[NEW]**
Create `public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://eurotrip-planner.vercel.app/sitemap.xml
```

**3. Rotate compromised API keys (30 minutes)**
- Regenerate OpenAI API key at platform.openai.com
- Regenerate Supabase service role key
- Change database password
- Ensure `.env.local` is truly in `.gitignore` and never committed
- Add `.env.example` with placeholder values

**4. Fix copy-paste data contamination (2 hours)**
10 cities have `tirana_*` named files. Script to audit and flag:
```bash
find public/data -name "tirana*" ! -path "*/Tirana/*" -exec dirname {} \; | sort -u
```
These cities need their data regenerated with correct content.

**5. Delete dead/duplicate files (30 minutes)**
- Remove `src/app/regions/page.js` (empty file)
- Remove `launch_PLAN.md` (duplicate of `MONETIZATION_PLAN.md`)
- Remove `AttractionsListRefactored.js` if not used (or replace `AttractionsList.js` with it)
- Remove `common/AuthButton.jsx` (duplicate of `auth/AuthButton.js`)
- Consolidate `UILibrary.js` and `ui-components.js`

**6. Fix hardcoded "September" on homepage (15 minutes)**
`src/app/page.js` line 192: `"Best Experiences in September"` should be dynamic:
```javascript
const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
// Then: `Best Experiences in ${currentMonth}`
```

**7. Fix footer "125+ European Cities" (5 minutes)**
`src/app/page.js` line 358: Update to "220+ European Cities"

**8. Fix "Countries" button label (5 minutes)**
`src/app/page.js` line 94: Button says "Countries" but opens `SampleItineraryPreview` — either rename the button or link it to a proper countries page.

### Tier 2: Engineering Upgrades (1-3 days each)

**1. Add TypeScript project-wide (3 days)**
- Convert `jsconfig.json` to `tsconfig.json`
- Define interfaces for city data schemas:
```typescript
interface CityData {
  cityName: string;
  country: string;
  overview: CityOverview | null;
  attractions: { sites: Attraction[] } | null;
  neighborhoods: { neighborhoods: Neighborhood[] } | null;
  culinaryGuide: CulinaryGuide | null;
  connections: TransportConnections | null;
  seasonalActivities: SeasonalActivities | null;
  monthlyEvents: Record<string, MonthlyData>;
  visitCalendar: VisitCalendar | null;
}
```
- Incrementally rename `.js` → `.tsx` starting with hooks and utils

**2. Replace hardcoded `cityData.js` with generated data (2 days)**
The 2,283-line `cityData.js` should be generated from `manifest.json` at build time:
```javascript
// scripts/generateCityData.mjs
const manifest = JSON.parse(fs.readFileSync('public/data/manifest.json'));
const cities = Object.entries(manifest.cities).map(([id, data]) => ({
  id,
  name: data.displayName,
  country: data.country,
  // ...extract from overview files
}));
fs.writeFileSync('src/generated/cities.json', JSON.stringify(cities));
```
Then import the JSON instead of the massive JS array. This removes ~100KB from the client bundle.

**3. Consolidate auth system (2 days)**
Currently **both NextAuth and Supabase Auth** are initialized:
- `Providers.js` wraps with `SessionProvider` (NextAuth) AND `AuthProvider` (Supabase)
- `src/app/api/auth/[...nextauth]/route.js` configures NextAuth with Google
- `src/contexts/AuthContext.js` configures Supabase Auth with Google + email

Pick one. Supabase Auth is the better choice since the database is already Supabase. Remove NextAuth dependency and `next-auth` from `package.json`.

**4. Consolidate duplicate components (1 day)**
- Merge 4 date picker variants into one configurable component
- Remove `AttractionsListRefactored.js` or replace the original
- Remove `common/AuthButton.jsx` duplicate
- Merge `CulinaryGuide.js` and `FoodDrinkGuide.js`

**5. Add city coordinates to data files (1 day)**
Instead of hardcoding 20 city coordinates in `CityPageClient.js`, extract lat/lon from city overview data (which already has coordinates) and pass them through the data pipeline.

**6. Make suggestions API real (2 days)**
`/api/suggestions/route.js` returns 5 hardcoded items with an artificial 450ms delay. Replace with actual scoring based on city data:
- Use visit calendar scores for the selected month
- Filter by user interests
- Return from the full 220-city dataset

### Tier 3: Architectural Changes (1+ weeks)

**1. Implement proper database schema (1-2 weeks)** **[PARTIALLY COMPLETE]**

**✅ IMPLEMENTED (Feb 25-28, 2026):**
```sql
-- Trips table (existing, enhanced)
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  start_date DATE,
  end_date DATE,
  city TEXT,
  country TEXT,
  preferences JSONB,  -- pace, interests, budget
  status TEXT DEFAULT 'planning',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trip days (NEW)
CREATE TABLE trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  theme TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trip activities (NEW)
CREATE TABLE trip_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id UUID REFERENCES trip_days(id) ON DELETE CASCADE,
  time_block TEXT NOT NULL,  -- 'morning', 'lunch', 'afternoon', 'evening', 'night'
  sort_order INTEGER DEFAULT 0,
  start_time TIME,
  end_time TIME,
  name TEXT NOT NULL,
  type TEXT,  -- 'attraction', 'restaurant', 'experience', 'transfer'
  description TEXT,
  duration_minutes INTEGER,
  price_range TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  neighborhood TEXT,
  address TEXT,
  google_place_id TEXT,  -- For photo/review lookup
  indoor BOOLEAN DEFAULT false,
  booking_required BOOLEAN DEFAULT false,
  booking_url TEXT,
  status TEXT DEFAULT 'planned',  -- 'planned', 'completed', 'cancelled'
  swap_reason TEXT,  -- AI-driven swap notes
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**❌ STILL NEEDED:**
```sql
-- Saved items (wishlist)
CREATE TABLE saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  item_type TEXT, -- 'city', 'experience', 'restaurant'
  item_id TEXT,
  city TEXT,
  country TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  travel_style TEXT,
  interests TEXT[],
  budget_level TEXT,
  currency TEXT DEFAULT 'EUR'
);
```

**2. Generalize itinerary engine beyond Paris (2-3 weeks)** **[✅ COMPLETE — Feb 25-28, 2026]**
`buildItinerary.js` now provides generic city itinerary generation:
- ✅ Accepts any city's data as input
- ✅ Interest-based activity matching (8+ categories)
- ✅ Time block scheduling (morning, lunch, afternoon, evening, night)
- ✅ Fallback logic for sparse city data
- ✅ Travel style mapping (pace → recommendation density)
- ❌ Still missing: Zone/travel matrix generation for non-Paris cities
- ❌ Still missing: Dynamic transport time calculations

**Legacy**: `buildParisRecommendations.js` (796 lines) kept for backward compatibility with existing Paris trips but no longer used for new trips.

**3. Migrate city data to a CMS or database (2+ weeks)**
3,200+ JSON files in `public/data/` is unsustainable:
- Build times scale linearly with file count
- Data updates require redeployment
- No real-time content updates possible
- Consider: Supabase tables for structured data, or a headless CMS (Sanity, Contentful) for editorial content

---

## 7. UX/Flow Improvements

### Navigation and Information Architecture
- **Missing global navigation**: There's no persistent nav bar across pages. The homepage has a header, city guide pages have breadcrumbs, but there's no consistent navigation pattern.
- **No country/region pages**: Users can't browse "all cities in Italy" from a dedicated page. The regions page is empty.
- **Search is fragmented**: Homepage has a date-based selector, city guides have `GlobalSearch`, the map has filters — but there's no unified search experience.

**Recommendation**: Add a persistent top nav with: Logo, Search, City Guides, Explore Map, My Trips (when logged in), Sign In. Keep it consistent across all pages.

### Date Selection → City Recommendation Flow
- The current flow asks for dates but the suggestions API returns mock data — the dates have no real effect.
- After getting suggestions, there's no clear path from "I like this city" to "plan my trip there."
- The "Get My Itinerary" button on the homepage only goes to the Paris planner.

**Recommendation**: Make the date selector actually filter cities by their visit calendar scores. Show the top-scored cities for those dates with a "Start planning" CTA that prefills the planner with the selected city and dates.

### Browsing to Planning to Action
- The city guide provides rich information but no clear conversion path.
- "Save to Trips" exists but there's no "Plan a trip to this city" button.
- The itinerary feature only works for Paris.

**Recommendation**: Add a prominent "Plan Your Trip" CTA on every city page that opens a trip planner (generalized beyond Paris). Include booking links where available.

### Mobile Responsiveness
- Tab bar on city pages uses horizontal scroll which works but is not discoverable (no scroll indicator).
- `cityData.js` carousel sections on homepage don't have proper touch swipe behavior.
- Map interactions are desktop-optimized (hover events don't translate to mobile).

**Recommendation**: Add visual scroll indicators on the tab bar. Implement a bottom sheet pattern for map popups on mobile.

### First-Time User Experience
- No onboarding — users land on the homepage with no clear value proposition beyond the hero text.
- No guided tour of features.
- The "No signup required" message is good but should lead to a quick win (e.g., "Find your perfect city in 30 seconds").

### Calls-to-Action
- Too many competing CTAs on the homepage: "Get My Itinerary", "Browse All Cities", "View all cities", "Plan this trip"
- The date selector should be the primary CTA but it's positioned as a secondary element.

---

## 8. Data & Content Quality

### Inconsistencies Across City Guides

**Severe**: 10 cities contain Tirana data due to copy-paste template errors (Hallstatt, Mostar, Sarajevo, Plovdiv, Sofia, Varna, Limassol, Nicosia, Tartu, Tallinn).

**Moderate**: Many cities (especially newer additions) lack properly-named files and rely on the fallback chain in `readWithFallbacks`. Cities like Warsaw, Krakow, and all Polish cities have files but with incorrect naming.

**Content depth varies dramatically**:
- Paris has ~8 data files + experiences file (~163K) + visit calendar + rich monthly data
- Many Eastern European cities have basic template data that may be AI-generated without verification
- Only Paris has the experiences scoring system

### Data Model Flexibility for Future Features

**Missing for agentic itinerary planning:**
- No standardized coordinates for all attractions (some have lat/lon, some don't)
- No transport/travel time data between attractions (only Paris has a travel matrix)
- No opening hours in a machine-readable format (some are strings like "9am-5pm", some are structured objects)
- No booking/reservation URLs for most attractions

**Missing for provider/booking integration:**
- No affiliate IDs or partner URLs
- No standardized pricing (prices are text like "Free", "€15-20", "Expensive")
- No availability calendars
- No provider profiles or ratings

**Missing for trip state management:**
- No concept of a "trip day" data structure that links activities to time slots
- No conflict detection (overlapping times, travel impossibility)
- No budget tracking schema

**Missing for post-trip photo summary:**
- No photo spot GPS bounding boxes for matching user photos to locations
- No canonical photo names for POI matching
- No trip timeline data structure for photo organization

---

## 9. Preparation for Lifecycle Features

### 1. Agentic Itinerary Planning **[✅ IMPLEMENTED — Feb 25-28, 2026]**
**What exists NOW**:
- Multi-provider agent system: OpenAI (GPT-4.1 mini) + 3 Bedrock variants (Claude 3.5 Sonnet v2)
- 4 grounded tools: `get_city_attractions`, `get_place_details`, `search_nearby`, `update_itinerary`
- `PlannerChat.js` component (369 lines) — conversational UI with SSE streaming
- Generic `buildItinerary.js` — works for all 220 cities (refactored from Paris-only)
- Live Google Places API integration (photos, hours, ratings, reviews)
- Normalized database schema: `trips` → `trip_days` → `trip_activities`
- Real-time activity swaps with optimistic UI updates
- Tool execution routes: `/api/plan/agent` (OpenAI), `/api/plan/agent-bedrock` (Bedrock Converse), `/api/plan/agent-bedrock-rc` (return control), `/api/plan/agent-invoke` (fully managed)
- AWS infrastructure templates for Lambda action groups + OpenSearch knowledge base (RAG)

**What's complete**:
- ✅ Generalized itinerary engine beyond Paris
- ✅ Conversational chat interface
- ✅ Streaming responses (SSE)
- ✅ Activity replacement with user feedback
- ✅ Multi-provider flexibility (switchable via env var)

**What's still missing**:
- ❌ Branching/alternative itinerary generation (A/B options)
- ❌ Conversation state persistence in database (currently ephemeral per session)
- ❌ Multi-turn optimization (agent can swap one activity per turn, but not reoptimize entire day)
- ❌ Knowledge Base RAG integration (infrastructure ready, not yet deployed)
- ❌ Fully managed Bedrock agent deployment (handlers exist, agent not yet configured in AWS console)

### 2. Pre-Trip Drip Email Sequence
**What exists**: Nothing.
**What's missing**: Email sending infrastructure, email templates, scheduling system, user email collection.
**What needs to change**: Need user accounts with email, trip start dates, and a cron/queue system.
**Suggested additions**: Resend for email sending, Inngest or QStash for scheduling, React Email for templates.

### 3. Nightly Trip Briefing
**What exists**: Nothing.
**What's missing**: Real-time data sources (weather APIs, event APIs), trip state tracking, email infrastructure.
**What needs to change**: Need active trip detection, daily data aggregation, personalized content generation.
**Suggested additions**: OpenWeatherMap API, Resend, a daily cron job via Vercel Cron or Inngest.

### 4. "I Arrived Safely" Notification
**What exists**: Nothing.
**What's missing**: User contacts/emergency contacts, notification system, trip tracking.
**What needs to change**: Need user profiles with emergency contacts, push notification or SMS capability.
**Suggested additions**: Twilio for SMS, or a simple email notification via Resend. Could also use web push notifications.

### 5. Last-Mile Transport Facilitation
**What exists**: `connections` data files have some transport information. `TransportConnections.js` component renders it.
**What's missing**: Deep linking to ride-hailing apps, real-time transit schedules, user location awareness.
**What needs to change**: Standardize transport data. Add deep link generators for Bolt/Uber/local transit apps.
**Suggested additions**: Uber/Bolt URL scheme documentation, Google Maps Directions API for routing.

### 6. Post-Trip Photo Upload → Automated Summary
**What exists**: Nothing.
**What's missing**: File upload infrastructure, photo metadata extraction, trip timeline matching, summary generation.
**What needs to change**: Need cloud storage for photos, EXIF parsing, and an LLM for narrative generation.
**Suggested additions**: Supabase Storage for uploads, `exifr` for metadata parsing, Claude API for narrative, Vercel OG or Satori for generated summary images.

### 7. Provider Marketplace
**What exists**: Nothing.
**What's missing**: Provider accounts, listing management, booking system, payment processing, reviews.
**What needs to change**: Major architecture addition — essentially a two-sided marketplace.
**Suggested additions**: Stripe Connect for marketplace payments, a provider dashboard (separate Next.js route group), review/rating schema in Supabase.

### 8. Affiliate Integration
**What exists**: Some attraction URLs in data files. `ExportPDF.js` exists (potential affiliate insertion point).
**What's missing**: Affiliate link management, click tracking, revenue attribution.
**What needs to change**: Add affiliate IDs to booking URLs, implement click tracking, add affiliate disclaimers.
**Suggested additions**: GetYourGuide Affiliate API, Booking.com Affiliate Partner API, SafetyWing/World Nomads for insurance, Airalo for eSIMs. A `clicks` table for attribution.

### 9. User Accounts and Trip State Persistence
**What exists**: Supabase Auth configured, `trips` table exists, `SaveToTrips` uses localStorage for anonymous users.
**What's missing**: Proper user profiles, trip state machine, localStorage → Supabase migration on signup.
**What needs to change**: Implement proper RLS policies, user profile table, migrate localStorage data on first login.
**Suggested additions**: Supabase RLS policies, a migration utility that syncs localStorage saved items to the database on auth.

### 10. B2B Content API / Licensing
**What exists**: 220 cities of structured JSON data. API routes exist for basic city data retrieval.
**What's missing**: API key management, rate limiting, usage metering, documentation, versioned API.
**What needs to change**: Need API authentication, rate limiting middleware, usage tracking, OpenAPI spec.
**Suggested additions**: Unkey for API key management, Zuplo or custom middleware for rate limiting, Stripe for API usage billing.

---

## 10. Recommended Tech Stack Additions

| Category | Recommendation | Why |
|----------|---------------|-----|
| **Database** | Supabase (already in use) — expand schema | Already integrated, PostgreSQL is sufficient for this scale |
| **Auth** | Supabase Auth (already in use) — **remove NextAuth** | Eliminate dual auth confusion. Supabase Auth handles Google, email, and magic links |
| **Email** | Resend | Modern email API, React Email for templates, built for Next.js |
| **Payments** | Stripe + Stripe Connect | Subscriptions for Pro tier, Connect for marketplace |
| **Scheduling** | Inngest or Vercel Cron | Drip emails, nightly briefings, data refresh jobs |
| **AI/LLM** | Anthropic Claude API via Vercel AI SDK | Better for long-context travel planning than GPT for this use case |
| **Analytics** | PostHog | Self-hostable, feature flags, session replay, funnels |
| **Monitoring** | Sentry | Error tracking, performance monitoring |
| **Testing** | Vitest + Playwright | Unit tests for logic, E2E for critical flows |
| **Search** | Meilisearch (via Supabase) or Algolia | Fast city/experience search with typo tolerance |
| **Image Storage** | Supabase Storage (user uploads) + existing CloudFront (static) | Already have CloudFront for static, add Supabase for user content |
| **Edge Config** | Vercel Edge Config | Feature flags, A/B tests, without redeployment |

---

## 11. Priority Roadmap

**Legend**: ✅ Complete | 🟡 In Progress | ❌ Not Started | S=Small (<1 day), M=Medium (1-3 days), L=Large (1-2 weeks), XL=Extra Large (2+ weeks)

| # | Task | Status | Impact | Effort | Dependencies | Notes |
|---|------|--------|--------|--------|--------------|-------|
| 1 | **Rotate compromised API keys** | ❌ | Security | S | None | CRITICAL — still needed |
| 2 | **Add SEO metadata to all city pages** | ❌ | Growth (organic traffic) | S | None | Sitemap done, but no per-city generateMetadata() |
| 3 | **Add sitemap.xml + robots.txt** | 🟡 | Growth (search indexing) | S | None | Sitemap ✅ done, robots.txt ❌ missing |
| 4 | **Fix copy-paste data contamination (10 cities)** | ❌ | Content quality | S | None | Still needed |
| 5 | **Remove NextAuth, consolidate on Supabase Auth** | ❌ | Architecture clarity | M | None | Both still coexist |
| 6 | **Replace hardcoded `cityData.js` with build-generated JSON** | ❌ | Performance (-100KB bundle) | M | None | Still 2,283 lines |
| 7 | **Add persistent global navigation** | ❌ | UX | M | None | — |
| 8 | **Make suggestions API real (use visit calendar scores)** | ❌ | Core feature | M | #4 | Still returns mock data |
| 9 | **Add TypeScript types for data schemas** | ❌ | Code quality | M | None | agentTools.js could be .ts |
| 10 | **Implement proper Supabase database schema** | 🟡 | Foundation for all features | L | #5 | trips/trip_days/trip_activities ✅, saved_items/user_preferences ❌ |
| 11 | **Generalize itinerary engine beyond Paris** | ✅ | Core feature | L | #10 | buildItinerary.js now generic |
| 12 | **Add user profiles and saved trip persistence** | ❌ | Retention | M | #10 | SaveToTrips uses localStorage |
| 13 | **Implement search with typo tolerance** | ❌ | UX | M | None | — |
| 14 | **Add testing framework + critical path tests** | ❌ | Engineering quality | M | None | Zero tests exist |
| 15 | **Integrate affiliate links (GetYourGuide, Booking.com)** | ❌ | Revenue | M | #10 | — |
| 16 | **Build experiences scoring for top 20 cities** | ❌ | Content depth | L | #4 | Only Paris has scoring |
| 17 | **Implement Stripe subscription for Pro tier** | ❌ | Revenue | L | #10, #12 | — |
| 18 | **Add email infrastructure (Resend + drip sequences)** | ❌ | Engagement/Revenue | L | #10, #12 | briefingOrchestrator.js exists but not deployed |
| 19 | **Build conversational itinerary planner** | ✅ | Differentiation | XL | #11, #12 | Multi-provider agent system complete |
| 20 | **Provider marketplace MVP** | ❌ | Revenue | XL | #10, #12, #17 | — |
| 21 | **Deploy Bedrock Agent + Knowledge Base (RAG)** | 🟡 | AI quality | L | #19 | Infrastructure ready, not deployed |
| 22 | **Add robots.txt** | ❌ | SEO | S | None | Missing |
| 23 | **Consolidate duplicate components** | ❌ | Code quality | M | None | 4 date pickers, 2 AuthButtons, etc. |
| 24 | **Deploy nightly briefing Lambda** | ❌ | User engagement | M | #18, #21 | Handler exists, EventBridge not configured |

**Recent completions (Feb 25-28, 2026)**:
- ✅ Multi-provider agent system (OpenAI + 3 Bedrock variants)
- ✅ PlannerChat UI component with SSE streaming
- ✅ Normalized trip database schema (trip_days, trip_activities)
- ✅ Generic city itinerary planner (/plan/[city])
- ✅ Google Places API integration
- ✅ AWS infrastructure templates (Lambda action groups, OpenSearch)
- ✅ Sitemap.xml generation

---

## Additional Analysis

### The Single Biggest Architectural Decision to Make Now

**Decide on the data layer before building anything else.**

Currently, city data lives as 3,200+ static JSON files in `public/data/`, the city listing is a hardcoded 2,283-line JavaScript array, and trip data goes to Supabase. This three-headed data model will cause compounding pain as features are added.

The decision: **Move structured city data into Supabase PostgreSQL tables** (keeping the JSON files as a seeding mechanism), and generate the static export at build time from the database. This gives you:
- Single source of truth for city data
- Real-time content updates without redeployment
- SQL queries for filtering/sorting/scoring (replacing client-side filtering)
- A foundation for the content API (B2B licensing)
- Proper foreign keys for trips → cities → experiences

If this migration is deferred, every new feature will build its own workaround for the static file limitation, creating a web of tech debt.

### 3 Things That Make This Codebase Feel "AI-Generated"

**1. Copy-paste template residue in data files**

10 cities have files literally named `tirana_attractions.json` in directories like `Austria/hallstatt/` — this is the telltale sign of a code-generation pipeline where the template city (Tirana) was used as the base and the renaming step failed or was skipped. A human engineer would have a script that validates file names match directory names.

**Fix**: Add a pre-commit validation script:
```javascript
// scripts/validateDataFiles.mjs
const cities = fs.readdirSync('public/data', { recursive: true });
// Assert every data file name matches its parent directory name
```

**2. Massive hardcoded arrays instead of generated data**

`cityData.js` (2,283 lines) is a hand-maintained array of 220 city objects with thumbnails, coordinates, descriptions, and category tags. This is exactly what an AI generates when asked to "create city data" — a big inline array. An experienced engineer would generate this from the existing data files.

**Fix**: Build script that reads `manifest.json` + overview files → generates a JSON index.

**3. Duplicate implementations that were never cleaned up**

Multiple instances of "I'll create a new version instead of editing the old one":
- `AttractionsList.js` + `AttractionsListRefactored.js` — the refactored version exists alongside the original
- `CulinaryGuide.js` + `FoodDrinkGuide.js` — two components for the same purpose
- `auth/AuthButton.js` + `common/AuthButton.jsx` — identical purpose, different locations
- NextAuth + Supabase Auth — both initialized in Providers

This is the AI-generation pattern of "add new thing" without "remove old thing." Experienced engineers refactor in place and delete the old code.

**Fix**: Audit all components, identify which version is actually imported, delete the unused ones.

### If You Had 1 Weekend to Make the Biggest Visible Improvement

**Add SEO + make the suggestions API real + add proper navigation.**

Friday evening (2 hours):
- Add `generateMetadata()` to the city guide dynamic route
- Add `sitemap.js` and `robots.txt`
- Fix the footer stats and hardcoded month

Saturday (6 hours):
- Replace the mock suggestions API with real scoring from visit calendar data
- Make the homepage date selector actually return the best-scored cities for those dates
- Add a "best for you" badge based on the score + traveler type

Sunday (6 hours):
- Add a persistent global nav bar component used across all pages
- Add a proper country browse page (not just filters)
- Wire up "Plan this trip" CTAs on city pages to a generalized planning entry point

This weekend sprint turns the app from "impressive static content" to "actually useful trip discovery tool" and starts driving organic search traffic. The combination of proper SEO for 220 city pages plus a working date-based recommendation engine is the highest-leverage improvement possible.

---

## 12. Major Changes Since February 7, 2026

**This section documents significant updates between the original walkthrough (Feb 7) and this update (Mar 1).**

### 🎯 Biggest Wins

**1. Agentic Itinerary Planner (Feb 25-28)**
- Multi-provider agent system: OpenAI GPT-4.1 mini + AWS Bedrock Claude 3.5 Sonnet v2
- 4 grounded tools for context-aware itinerary refinement
- PlannerChat UI component (369 lines) with SSE streaming
- Real-time activity swaps with optimistic UI updates
- Google Places API integration for live data (photos, hours, ratings)

**2. Generic City Planner (Feb 25)**
- New route: `/plan/[city]` works for all 220 cities
- Replaces Paris-only flow with 5-step wizard
- Dark mode styling with gold accents
- `buildItinerary.js` — generic recommendation engine

**3. Normalized Database Schema (Feb 25)**
- New tables: `trip_days` (one row per day) + `trip_activities` (granular activities)
- Google Place ID linking for photo/review enrichment
- Activity swap tracking with AI-driven reasons
- Replaces flat trip JSONB approach

**4. AWS Infrastructure (Feb 28)**
- CloudFormation/SAM templates for Lambda action groups
- 5 Lambda handlers: cityData, googlePlaces, itinerary, weather, briefingOrchestrator
- OpenSearch Serverless for RAG knowledge base
- EventBridge rule for nightly briefing (7 PM UTC)
- Documentation: `BEDROCK_CONSOLE_SETUP.md` (480 lines), `BEDROCK_AGENTS_LEARNING.md` (494 lines)

**5. SEO Progress (Feb 2026)**
- ✅ Sitemap.xml implemented (`src/app/sitemap.js`)
- Covers all 220 city pages + static routes
- ❌ Still missing: per-city `generateMetadata()`, robots.txt, canonical URLs

### 📦 New Dependencies
- `@aws-sdk/client-bedrock-runtime` (3.1000.0) — Bedrock Converse API
- `@aws-sdk/client-bedrock-agent-runtime` (3.1000.0) — Agent invocation
- `@sentry/nextjs` (10.39.0) — Error tracking

### 🗂️ New Files & Directories
- `infra/` — AWS infrastructure templates + Lambda handlers (10+ files)
- `src/app/plan/[city]/page.js` — Generic city planner (378 lines)
- `src/app/sitemap.js` — Dynamic sitemap generation (36 lines)
- `src/app/api/plan/` — 4 agent route variants (OpenAI + 3 Bedrock)
- `src/components/itinerary/` — PlannerChat + ItineraryClient
- `src/lib/agent/` — agentTools.js (424 lines) + tripState.js
- `src/lib/google-places/` — Google Places API integration (4 files)
- `src/lib/planning/buildItinerary.js` — Generic itinerary builder
- `scripts/exportCityDataForKB.mjs` — RAG knowledge base export (252 lines)
- `BEDROCK_CONSOLE_SETUP.md`, `BEDROCK_AGENTS_LEARNING.md` — Documentation

### 🔄 Updated Files
- `src/app/itineraries/[tripId]/page.js` — Now supports AI chat refinement
- `src/components/itinerary/ItineraryClient.js` — Lazy-loads PlannerChat, optimistic updates
- `package.json` — Added Bedrock SDKs + Sentry

### ❌ Still Outstanding
- **TypeScript adoption**: Still ~0% (only 3 TS files)
- **Per-city SEO metadata**: No `generateMetadata()` on city guide pages
- **Duplicate components**: 4 date pickers, 2 AuthButtons, etc. still exist
- **NextAuth removal**: Both NextAuth + Supabase Auth still coexist
- **Hardcoded cityData.js**: Still 2,283 lines in client bundle
- **Copy-paste data contamination**: 10 cities still have `tirana_*` files
- **Mock suggestions API**: Still returns hardcoded data with 450ms delay
- **robots.txt**: Not yet added

### 🎯 Updated Assessment Scores

| Category | Before (Feb 7) | After (Mar 1) | Change |
|----------|----------------|---------------|--------|
| **SEO — Sitemap** | 0/10 | 8/10 | +8 ✅ |
| **Database Schema** | 2/10 (trips only) | 6/10 (trips+days+activities) | +4 ✅ |
| **Agentic Features** | 2/10 (Paris-only prototype) | 9/10 (multi-provider, generic) | +7 ✅ |
| **TypeScript Usage** | 2/10 | 2/10 | No change ❌ |
| **Code Consistency** | 4/10 | 4/10 | No change ❌ |
| **Testing** | 0/10 | 0/10 | No change ❌ |

### 🚀 What This Unlocks

**Before (Feb 7)**: Paris-only trip planner with static rule-based itinerary generation. No user refinement. No live data integration.

**After (Mar 1)**: Multi-city AI-powered itinerary planner with:
- Conversational refinement ("Replace this museum with something outdoors")
- Live Google Places data (photos, hours, ratings)
- Multi-provider flexibility (OpenAI/Bedrock switchable)
- Real-time activity swaps with database persistence
- Foundation for RAG knowledge base + nightly briefings

**Next critical priorities**:
1. Add per-city SEO metadata (2 hours) — unlock organic search for 220 pages
2. Add robots.txt (5 min)
3. Deploy Bedrock Agent + Knowledge Base to AWS (1-2 days)
4. Remove NextAuth, consolidate on Supabase Auth (1 day)
5. Add testing framework (Vitest + Playwright) (2-3 days)
