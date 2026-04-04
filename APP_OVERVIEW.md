# EuroTrip Planner - App Overview

A European travel planning application that scores 220 cities based on real-time factors and generates personalized day-by-day itineraries.

## What It Does

Users enter their travel dates and preferences. The app ranks all 220 European cities by how good they'll be during that specific time period, then generates detailed itineraries for chosen destinations.

## Core Features

### City Discovery & Scoring
- **220 cities** across 41 European countries
- **6-factor scoring algorithm**:
  - Culture (museums, monuments, UNESCO sites)
  - Beach (coastal appeal, temperature-dependent)
  - Timing (weather + events + seasonality)
  - Crowds (tourist density predictions)
  - Value (cost of living vs budget)
  - Logistics (transport connectivity from origin)
- Results grouped into tiers: Must-See → Highly Recommended → Recommended → Worth Considering

### Trip Planning Wizard
4-step guided flow:
1. **Dates** - Select travel period
2. **Travel Style** - Pace (relaxed/balanced/active) + interests (10 categories)
3. **Preferences** - Budget level + must-see attractions
4. **Generate** - Creates personalized itinerary

### Generated Itineraries
- Day-by-day breakdown with time blocks
- Activities clustered by neighborhood (minimizes backtracking)
- Pace-aware scheduling (2-6 activities per day)
- Restaurant recommendations for meal slots
- Opening hours respected
- Exportable to Google Calendar / iCal

### City Guides
Each city includes:
- Overview and best time to visit
- Top attractions with ratings
- Neighborhood guides
- Culinary recommendations (restaurants, cafes, food experiences)
- Seasonal activities by month
- Event calendar
- Weather and crowd predictions per month

### Interactive Features
- **Explore Map** - Mapbox map with all 220 cities plotted
- **Trip Roulette** - Gamified multi-city route discovery
- **Wishlist** - Save cities and experiences for later
- **Advanced Filtering** - By region, travel experience type, country

### Accounts & Sync
- Google OAuth or email/password authentication
- Wishlists sync across devices when logged in
- Trip history stored in cloud
- Shareable read-only trip links

## User Flows

### Primary Flow: Date-Driven Discovery
```
Homepage → Enter dates → "Show me the best cities"
    ↓
Results modal with ranked cities
    ↓
Select city → View city guide
    ↓
"Plan Trip" → 4-step wizard
    ↓
Generated itinerary with day-by-day plan
```

### Secondary Flow: Browse & Explore
```
City Guides → Filter by region/interest/country
    ↓
Browse city cards → Click to read full guide
    ↓
Save to wishlist or start planning
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS, Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth, email) |
| Maps | Mapbox GL JS |
| LLM | OpenAI / Claude (optional descriptions) |
| Enrichment | Google Places API |
| Hosting | Vercel |

## Data Architecture

### City Data
Stored in `/public/data/[Country]/[City]/index.json`:
- Overview (name, coordinates, description)
- Attractions (sites with ratings, hours, coordinates)
- Neighborhoods (character, highlights)
- Culinary guide (restaurants, cafes)
- Seasonal activities (by month)
- Visit calendar (weather, crowds, events per month)
- Connections (transport to nearby cities)

### Generated Files
- `src/generated/cities.json` - Client-side city list for search/filter
- `src/generated/cityIndex.js` - Module wrapper for city data
- `src/generated/monthlyScores.json` - Pre-computed rankings per month

### Caching Layers
1. **Pre-computed scores** - Build-time monthly rankings
2. **Redis** - Runtime cache for custom queries (1hr TTL)
3. **CDN** - HTTP caching headers (1hr, 24hr stale-while-revalidate)

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/suggestions` | Score cities for date range |
| `POST /api/trips` | Create new itinerary |
| `GET /api/trips/[id]` | Fetch trip details |
| `GET /api/trips/[id]/calendar` | Export as iCal |
| `GET /api/cities` | List all cities |
| `POST /api/trips/multi-city` | Multi-city itinerary |

## Key Directories

```
src/
├── app/                    # Next.js pages and API routes
│   ├── page.js            # Homepage
│   ├── city-guides/       # City browsing and individual guides
│   ├── plan/[city]/       # Planning wizard
│   ├── itineraries/       # Generated trip view
│   ├── explore/           # Interactive map
│   ├── roulette/          # Multi-city discovery
│   ├── saved-trips/       # Wishlist management
│   └── api/               # Backend endpoints
├── components/            # Reusable UI components
├── lib/
│   ├── scoring/v4/        # City scoring algorithm
│   ├── planning/          # Itinerary generation
│   └── cache/             # Caching utilities
├── contexts/              # React context (auth)
└── generated/             # Build-time generated files

public/
└── data/                  # City data files (220 cities)

scripts/                   # Build and data generation scripts
```

## External Services

| Service | Usage |
|---------|-------|
| **Supabase** | User auth, trip storage, wishlists |
| **Google Places** | Attraction enrichment (hours, ratings, photos) |
| **OpenAI/Claude** | Generate natural language descriptions |
| **Mapbox** | Interactive map rendering |
| **Vercel Analytics** | Usage tracking |

## Guest vs Logged-In

| Feature | Guest | Logged In |
|---------|-------|-----------|
| Browse cities | Yes | Yes |
| Score cities by date | Yes | Yes |
| Generate itineraries | Yes | Yes |
| Save to wishlist | Local only | Cloud sync |
| Access on other devices | No | Yes |
| Trip history | No | Yes |
| Share trips | Read-only | Read-only |
