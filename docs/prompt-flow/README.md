## EuroTrip Planner & City Guides

EuroTrip Planner is a Next.js application for designing thoughtful, season‑aware trips across Europe.  
Instead of generic “10 days in Europe” templates, it combines structured city data, seasonal calendars, and an AI planner to help you choose where to go and when.

### Core Concepts

- **Date‑driven suggestions**: Start on the home page by selecting your travel dates.  
  The app recommends cities based on seasonality, weather, crowds, and price signals.

- **Deep city guides**: For each supported city there are JSON‑backed guides under `public/data/**`:
  - `*-overview.json`: high‑level story, why visit, and practical info.
  - `*-visit-calendar.json` and `monthly/*.json`: month‑by‑month “when to go” data.
  - `*_attractions.json`, `*_neighborhoods.json`, `*_culinary_guide.json`, `*_connections.json`, `*_seasonal_activities.json`: rich content used by city‑guide pages.

- **City Guides section**: `/city-guides` and `/city-guides/[city]` present:
  - Overview, neighborhoods, attractions, seasonal activities.
  - A monthly visit guide with weather, pros/cons, and recommended activities.
  - Transport connections between major European cities.

- **Explore Map**: `/explore` renders an interactive Mapbox‑powered map with filters, letting you scan cities geographically and compare regions.

- **Regions & routes**: `/regions` and `/start-planning` expose curated routes (e.g. “Classic Capitals”, “Mediterranean Highlights”) powered by the same underlying JSON data.

- **AI Trip Planning (Paris pilot)**:  
  `/paris-trip` and `src/app/api/ai/chat/route.js` use the OpenAI SDK plus Paris‑specific data to generate structured itineraries that follow a strict JSON schema.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS, custom design system in `globals.css`
- **Maps**: Mapbox GL via `react-map-gl`
- **Auth**: NextAuth (in `src/app/api/auth/[...nextauth]/route.js`)
- **AI**: `openai` SDK, schema‑constrained chat completions
- **State / Context**:
  - `TravelDataProvider` (`src/context/TravelDataProvider.js`)
  - `MapDataProvider` (`src/context/MapDataContext.js`)

All long‑form city and seasonal content lives as JSON under `public/data/**`, with helper scripts in `scripts/` to generate indices.

---

## Project Structure (high level)

- `src/app/page.js` – Home page with hero, date selector, and curated sections.
- `src/app/layout.js` – Root layout, global shell, analytics, providers.
- `src/app/city-guides/**` – City guides list and per‑city pages.
- `src/app/explore/page.js` – Map‑based exploration view.
- `src/app/start-planning/page.js` – Multi‑city route planner entry.
- `src/app/api/**` – API routes:
  - `api/suggestions` – date‑based city suggestions.
  - `api/cities` – city metadata accessors.
  - `api/ai/chat` – AI itinerary generator (Paris pilot).
  - `api/auth/[...nextauth]` – authentication.
- `src/components/**` – Shared UI, city‑guide components, map components, monthly‑visit guide, planner UI, etc.
- `scripts/*.mjs` – Data utilities:
  - `generateCityIndex.mjs`, `generateMonthlyIndex.mjs` – build JSON indices.
  - `compressImages*.mjs`, `convertPngToJpeg.mjs`, `updatePngToJpeg.mjs`, `moveThumbnails.mjs`, `replaceThumbnails.mjs` – image and asset tooling.
- `public/data/**` – All city/season JSON content.

---

## Setup & Development

### Prerequisites

- Node.js 18+ recommended
- npm (or your preferred package manager)

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file in the project root and set:

```bash
OPENAI_API_KEY=sk-...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
MAPBOX_ACCESS_TOKEN=your-mapbox-token
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

- The app will **build** even if `OPENAI_API_KEY` is missing, but calls to `/api/ai/chat` will return an error until it is set.
- If you are only working on static content / layout, you can leave AI and auth env vars unset.

### Development server

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Build for production

The build script also regenerates city/monthly indices from JSON:

```bash
npm run build
```

This runs, in order:

- `npm run build:data` – `node scripts/generateMonthlyIndex.mjs`
- `npm run build:cities` – `node scripts/generateCityIndex.mjs`
- `next build`

To start the production server locally:

```bash
npm run start
```

---

## Data & Content Editing

- City content lives in `public/data/<Country>/<City>/...` JSON files.
- Shared version manifests live in `versions/*.json`.
- When you add or edit city/monthly JSON, rerun:

```bash
npm run build:data
npm run build:cities
```

The app reads directly from these JSON blobs in the browser (for static content) and in API routes for more advanced queries.

---

## Deployment

This app is designed to deploy cleanly on Vercel:

- Set the same environment variables in your Vercel project.
- Use the default Vercel Next.js build settings (`npm run build`).

Because most of the “content” is static JSON under `public/`, deployments are fast and the majority of the experience can be served statically, with API routes handling AI planning, suggestions, and dynamic data.
