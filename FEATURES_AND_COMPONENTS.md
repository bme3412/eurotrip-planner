# Features & Components

## 1. City Discovery & Scoring
Score 220 European cities based on your travel dates using a 6-factor algorithm (Culture, Beach, Timing, Crowds, Value, Logistics). Results are tiered from "Must-See" to "Worth Considering."
- **Key components:** `HeroWidget`, `ResultsGrid`, `ResultCard`, `DiscoverResults`, `CityScatterPlot`
- **Backend:** `/api/suggestions` with V4 `ScoreEngine`

## 2. City Guides
Detailed guides for all 220 cities with attractions, neighborhoods, food, weather, events, and transport.
- **Key components:** `CityPageClient`, `CityOverview`, `AttractionsList`, `MonthlyVisitGuide`, `FoodDrinkGuide`, `NeighborhoodsList`, `TransportConnections`, `PhotoSpots`

## 3. Trip Planning (Agentic / Conversational)
Natural language chat interface where an AI agent builds your trip interactively in a 3-column layout.
- **Key components:** `ThreeColumnPlanner`, `PlannerColumn`, `CompactChatInput`, `CompactMessageList`, `RouteMapColumn`, `TripDayStrip`, `PlannerProgressBar`
- **Backend:** `/api/plan/agent`, `/api/conversation` with 40+ tool definitions

## 4. Generated Itineraries
Day-by-day itineraries with time blocks, activities, restaurants, and opening hours.
- **Key components:** `ItineraryClient`, `DayCard`, `DayNavigation`, `GenericTimeBlock`, `ItineraryMap`
- **Export:** Google Calendar, iCal, PDF, shareable links

## 5. Interactive Map Explorer
Full-screen Mapbox map with all 220 cities, filterable by region/country/interest/tier.
- **Key components:** `OptimizedMapComponent`, `FilterContainer`, `RankedListPanel`, `CityDetailsPopup`

## 6. Auth & Accounts
Supabase Auth with Google OAuth and email/password. Syncs wishlists and trips across devices.
- **Key components:** `AuthButton`, `AuthContext`

## 7. Wishlists & Saved Trips
Save cities and trips, with cloud sync for logged-in users and localStorage for guests.
- **Key components:** `SaveToTrips`, `TravelDataProvider`

---

## Supporting Infrastructure

### Custom Hooks (11)
- `useAgentStream` - Stream agent responses
- `useBestNow` - Real-time best cities
- `useDirectManipulation` - Direct trip manipulation
- `useHeroImage` - Hero image loading
- `useItineraryGeneration` - Itinerary generation flow
- `useMessages` - Conversation messages
- `useMonthlyData` - Monthly city data loading
- `useTripDates` - Trip date management
- `useTripPlannerAgent` - Agent-based planning
- `useTripState` - Trip state management
- `useUIState` - UI state (modals, drawers, etc.)

### React Contexts (3)
- **AuthContext** - Supabase authentication (user, session, login/logout)/
- **TravelDataProvider** - Travel data management (wishlists, saved trips)
- **MapDataContext** - Map and city data (ratings, calendar, filters, loading states)

### Lib Modules (60+)
- **Scoring** (`src/lib/scoring/v4/`) - 6-factor scoring engine with dynamic weights
- **Planning** (`src/lib/planning/`) - Itinerary generation, route optimization, day allocation
- **Conversation** (`src/lib/conversation/`) - Agentic system prompt, planner loop, tool handlers
- **Caching** (`src/lib/cache/`, `src/lib/enrichment/`) - Redis-compatible caching, enrichment data
- **External APIs** - Google Places, Google Routes, Supabase, Mapbox

### Utilities (5)
- `cityDataUtils`, `monthlyDataLoader`, `countryFlags`, `chunkOptimization`, `cdnUtils`

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 + Tailwind CSS + Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Maps:** Mapbox GL JS
- **LLM:** OpenAI / Claude
- **APIs:** Google Places, Google Routes
- **Hosting:** Vercel

### File Count Summary
| Category | Count |
|----------|-------|
| Pages/Routes | 43 |
| API Routes | 12 |
| React Components | 103 |
| Custom Hooks | 11 |
| Contexts | 3 |
| Lib Modules | 60+ |
| Utils | 5 |
| **Total** | **~249** |
