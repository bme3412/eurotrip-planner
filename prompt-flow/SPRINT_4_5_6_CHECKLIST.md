# Sprints 4-6: Itemized Build Checklist

*Created: February 20, 2026*
*Format: Master checklist for Cursor execution*

Each task has a checkbox, the file(s) involved, what to do, and acceptance criteria.
Tasks marked **[CURSOR]** are best done by pasting a prompt into Cursor.
Tasks marked **[MANUAL]** require you to do something outside the IDE (API keys, dashboards, etc.).
Tasks marked **[SCRIPT]** are running an existing script and reviewing output.

---

## Sprint 4: Data Foundation

**Goal**: Get 220/220 cities to baseline quality. All cities have attractions, neighborhoods, culinary, calendar, seasonal activities, and connections data. Validation passes clean.

**Prerequisites**: `OPENAI_API_KEY` set in `.env.local` (needed for data generation).

---

### 4.0 Error Tracking Setup

- [ ] **[CURSOR]** Install Sentry: `npm install @sentry/nextjs`
- [ ] **[CURSOR]** Run `npx @sentry/wizard@latest -i nextjs` to scaffold config
- [ ] **[MANUAL]** Create a Sentry project at sentry.io, get DSN
- [ ] **[CURSOR]** Add `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to `.env.example`
- [ ] **[CURSOR]** Verify build still passes: `npm run build`

**Acceptance**: Sentry captures client + server errors. Build passes.

---

### 4.1 Audit Current Data State

Before generating anything, understand what you're working with.

- [ ] **[SCRIPT]** Run validation: `node scripts/validateCityData.mjs`
- [ ] **[SCRIPT]** Run validation with JSON output: `node scripts/validateCityData.mjs --json > data-audit.json`
- [ ] Review the grade distribution (A/B/C/D/F counts)
- [ ] Review which cities are empty (all sections null)
- [ ] Review which cities are sparse (some sections null)
- [ ] Note the 3 malformed monthly JSON files flagged in Sprint 0+1 report: `Bulgaria/Varna/monthly/february.json`, `Bulgaria/Sofia/monthly/february.json`, `Czechia/prague/monthly/march.json`

**Files**: `scripts/validateCityData.mjs`
**Acceptance**: You have a clear picture of the 82 empty, 10 sparse, and 128 rich cities.

---

### 4.2 Fix Malformed JSON Files

- [ ] **[CURSOR]** Read and fix `public/data/Bulgaria/Varna/monthly/february.json` — parse the JSON, find the syntax error, fix it
- [ ] **[CURSOR]** Read and fix `public/data/Bulgaria/Sofia/monthly/february.json` — same
- [ ] **[CURSOR]** Read and fix `public/data/Czechia/prague/monthly/march.json` — same
- [ ] **[SCRIPT]** Verify fixes: `node scripts/validateCityData.mjs --city varna && node scripts/validateCityData.mjs --city sofia && node scripts/validateCityData.mjs --city prague`

**Acceptance**: No JSON parse errors in validation output.

---

### 4.3 Fill the 82 Empty Cities

The generation script already exists at `scripts/generateCityData.mjs` (857 lines). It calls OpenAI to generate structured city data.

- [ ] **[SCRIPT]** Dry run first: `node scripts/generateCityData.mjs --empty-only --dry-run`
- [ ] Review the dry run output — confirm it targets the right 82 cities
- [ ] **[SCRIPT]** Generate data for empty cities (batch of 5 at a time): `node scripts/generateCityData.mjs --empty-only --batch 5`
- [ ] Monitor progress — the script has retry logic and rate limiting built in
- [ ] **[SCRIPT]** After completion, validate: `node scripts/validateCityData.mjs`
- [ ] Review the new grade distribution — all 82 previously-empty cities should now have grades

**Files**: `scripts/generateCityData.mjs`, output goes to `public/data/{Country}/{city}/`
**Estimated cost**: ~$15-25 for 82 cities with gpt-4.1-mini
**Acceptance**: 220/220 cities have non-null overview, attractions, neighborhoods, culinary, connections, and seasonal activities.

---

### 4.4 Generate Visit Calendar Data for Missing Cities

Visit calendars are what power the date-based scoring. Currently 127/220 have them.

- [ ] **[SCRIPT]** Check which cities are missing visit calendars: `node scripts/validateCityData.mjs --json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); d.cities.filter(c=>!c.sections.visitCalendar).forEach(c=>console.log(c.slug))"` (or just look at the validation report)
- [ ] **[SCRIPT]** Generate calendars: `node scripts/generateCityData.mjs --section visitCalendar --enrich --batch 5`
- [ ] **[SCRIPT]** Validate: `node scripts/validateCityData.mjs`

**Acceptance**: 220/220 cities have visit calendar data. The suggestions API at `/api/suggestions` returns scored results for all cities when given any date range.

---

### 4.5 Manual Review: Top 15 High-Traffic Cities

These cities likely get the most organic search traffic. Spot-check that the generated data makes sense.

- [ ] Open each city's `index.json` and scan for obvious errors:
  - [ ] Budapest (`public/data/Hungary/Budapest/index.json`)
  - [ ] Warsaw (`public/data/Poland/Warsaw/index.json`)
  - [ ] Krakow (`public/data/Poland/Krakow/index.json`)
  - [ ] Riga (`public/data/Latvia/Riga/index.json`)
  - [ ] Vilnius (`public/data/Lithuania/Vilnius/index.json`)
  - [ ] Bucharest (`public/data/Romania/Bucharest/index.json`)
  - [ ] Glasgow (`public/data/UK/glasgow/index.json`)
  - [ ] Edinburgh (`public/data/UK/edinburgh/index.json`)
  - [ ] Manchester (`public/data/UK/manchester/index.json`)
  - [ ] Oxford (`public/data/UK/oxford/index.json`)
  - [ ] Cambridge (`public/data/UK/cambridge/index.json`)
  - [ ] Bath (`public/data/UK/bath/index.json`)
  - [ ] Prague (`public/data/Czechia/prague/index.json`)
  - [ ] Vienna (`public/data/Austria/vienna/index.json`)
  - [ ] Ljubljana (`public/data/Slovenia/Ljubljana/index.json`)
- [ ] Check: Are attraction names real? Are coordinates plausible? Are neighborhoods real neighborhoods?
- [ ] **[CURSOR]** Fix any obvious errors found during review

**Acceptance**: Top 15 cities have accurate, sensible data.

---

### 4.6 Normalize Data Quality

The validation script has a `--normalize` flag that standardizes price ranges.

- [ ] **[SCRIPT]** Run normalization: `node scripts/validateCityData.mjs --normalize`
- [ ] **[SCRIPT]** Rebuild indexes after normalization:
  ```
  node scripts/generateCityIndex.mjs
  node scripts/generateMonthlyIndex.mjs
  node scripts/generateCityList.mjs
  ```
- [ ] **[SCRIPT]** Final validation pass: `node scripts/validateCityData.mjs`
- [ ] Review final grade distribution — target: 150+ cities at grade A or B

**Acceptance**: Price ranges standardized. All indexes rebuilt. Validation shows improved quality.

---

### 4.7 Rebuild and Verify

- [ ] **[SCRIPT]** Full build: `npm run build`
- [ ] **[SCRIPT]** Start locally: `npm run start`
- [ ] Spot-check in browser:
  - [ ] `/city-guides` — all 220 cities appear, search works
  - [ ] `/city-guides/budapest` — shows real content (not "Guide Coming Soon")
  - [ ] `/city-guides/warsaw` — shows real content
  - [ ] Homepage date selector — select dates, verify results include previously-empty cities
  - [ ] `/api/suggestions?startDate=2026-04-15&endDate=2026-04-22` — returns 20 results from the full 220-city pool
  - [ ] `/plan/budapest` — trip planner loads with Budapest attractions in the must-see list

**Acceptance**: Build passes. All 220 cities render with content. Suggestions API scores all 220 cities.

---

### Sprint 4 Commit Checkpoint

- [ ] **[MANUAL]** Commit: `git add -A && git commit -m "feat: fill 82 empty cities, generate visit calendars, normalize data quality"`

---

## Sprint 5: Google Places API Integration

**Goal**: Build the server-side Google Places integration layer. Match existing attractions to Google place_ids. Enrich city guide display with live ratings, photos, and hours.

**Prerequisites**: Google Cloud project with Places API (New) enabled and API key.

---

### 5.1 Google Cloud Setup

- [ ] **[MANUAL]** Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] **[MANUAL]** Create project (or use existing) — enable these APIs:
  - Places API (New)
  - Places Photos API
  - Geocoding API (optional, for future use)
  - Routes API (optional, for future use)
- [ ] **[MANUAL]** Create API key — restrict to Places API (New), set HTTP referrer restrictions for production
- [ ] **[CURSOR]** Add to `.env.local`: `GOOGLE_PLACES_API_KEY=your_key_here`
- [ ] **[CURSOR]** Add to `.env.example`:
  ```
  # Google Places API (New) — for live attraction data, photos, reviews
  # Get key at: https://console.cloud.google.com/apis/credentials
  GOOGLE_PLACES_API_KEY=your_google_places_key_here
  ```

**Acceptance**: API key works. You can make a test curl request to `https://places.googleapis.com/v1/places/ChIJD7fiBh9u5kcRYJSMaMOCCwQ?fields=id,displayName&key=YOUR_KEY` and get a response.

---

### 5.2 Build Google Places Client Library

- [ ] **[CURSOR]** Create `src/lib/google-places/client.js`:
  - Export `placeDetails(placeId, fieldMask)` — calls Place Details (New) REST API
  - Export `textSearch(query, options)` — calls Text Search (New) REST API
  - Export `nearbySearch(location, radius, types, fieldMask)` — calls Nearby Search (New)
  - Export `placePhoto(photoName, maxWidth, maxHeight)` — returns photo URL
  - All functions: server-side only, use `GOOGLE_PLACES_API_KEY` from env
  - All functions: return parsed JSON, throw on error with descriptive messages
  - Include JSDoc types for all parameters and return values

**Key implementation details:**
- Base URL: `https://places.googleapis.com/v1/`
- Auth: `X-Goog-Api-Key` header (not query param, per New API convention)
- Field mask: `X-Goog-FieldMask` header
- Place Details endpoint: `GET /v1/places/{placeId}`
- Text Search endpoint: `POST /v1/places:searchText`
- Nearby Search endpoint: `POST /v1/places:searchNearby`
- Photo endpoint: `GET /v1/{photoName}/media?maxWidthPx={w}&maxHeightPx={h}&skipHttpRedirect=true`

**Files**: New file `src/lib/google-places/client.js`
**Acceptance**: Can call `placeDetails`, `textSearch`, `nearbySearch`, `placePhoto` from server-side code and get valid responses.

---

### 5.3 Build Caching Layer

- [ ] **[CURSOR]** Create `src/lib/google-places/cache.js`:
  - In-memory cache (Map) with TTL support
  - `getCachedPlaceDetails(placeId)` / `setCachedPlaceDetails(placeId, data, ttlMs)`
  - `getCachedPlaceId(attractionKey)` / `setCachedPlaceId(attractionKey, placeId)`
  - Default TTLs: 24 hours for active trip data, 7 days for city guide display
  - Cache key format: `place_details:{placeId}` and `place_id_map:{citySlug}:{attractionName}`
  - Export a `clearCache()` for dev use

**Alternative (if you want persistence across restarts)**: Use a Supabase table `google_places_cache` with columns `cache_key`, `data` (JSONB), `expires_at`. But in-memory is fine to start.

- [ ] **[CURSOR]** Create `src/lib/google-places/index.js` — barrel export that wraps client + cache:
  - Export `getPlaceDetails(placeId, fieldMask)` — checks cache first, falls back to API
  - Export `searchPlaces(query, options)` — no cache (search results vary)
  - Export `getNearbyPlaces(location, radius, types)` — no cache
  - Export `getPlacePhotoUrl(photoName, width, height)` — cache the URL

**Files**: New files `src/lib/google-places/cache.js`, `src/lib/google-places/index.js`
**Acceptance**: Repeated calls to `getPlaceDetails` with the same placeId hit cache on second call.

---

### 5.4 Build Place ID Resolution Script

- [ ] **[CURSOR]** Create `scripts/resolveGooglePlaceIds.mjs`:
  - Reads `public/data/manifest.json` to get all cities
  - For each city, reads `index.json` to get attractions list
  - For each attraction with a name and coordinates, calls Text Search (New):
    ```
    textQuery: "{attraction.name}, {city_name}"
    locationBias: { circle: { center: { lat, lng }, radius: 2000 } }
    ```
  - Takes the top result's `place_id`
  - Computes a confidence score: name similarity (Levenshtein or simple includes check) + distance from expected coordinates
  - Writes results to `public/data/google-place-ids.json`:
    ```json
    {
      "paris": {
        "Eiffel Tower": { "placeId": "ChIJLU7jZClu5kcR4...", "confidence": 0.95 },
        "Louvre Museum": { "placeId": "ChIJD3uB0...", "confidence": 0.98 }
      }
    }
    ```
  - Flags low-confidence matches (< 0.7) for manual review
  - CLI: `--city paris` (single city), `--all` (all cities), `--confidence-threshold 0.8`
  - Rate limiting: 1 request per 200ms (5 QPS, under Google's default limits)
  - Resume support: skip cities/attractions already in the output file

- [ ] **[SCRIPT]** Start with a test city: `node scripts/resolveGooglePlaceIds.mjs --city paris`
- [ ] Review the output — are the place_ids correct? Are confidence scores reasonable?
- [ ] **[SCRIPT]** Run for all 128 rich cities (the ones with attraction data): `node scripts/resolveGooglePlaceIds.mjs --all --confidence-threshold 0.7`
- [ ] Review low-confidence matches, fix manually if needed

**Files**: New file `scripts/resolveGooglePlaceIds.mjs`, output `public/data/google-place-ids.json`
**Estimated cost**: ~3,200 Text Search calls at $0.032 each = ~$100. Run only for the 128 cities with attraction data initially.
**Acceptance**: `google-place-ids.json` exists with place_id mappings for the majority of attractions.

---

### 5.5 Add Google Places Enrichment to City Guide API

- [ ] **[CURSOR]** Create `src/lib/google-places/enrichment.js`:
  - Export `enrichAttractionWithGoogleData(attraction, citySlug)`:
    1. Look up `placeId` from `google-place-ids.json` (loaded and cached at module level)
    2. If found, call `getPlaceDetails(placeId, ENRICHMENT_FIELD_MASK)`
    3. Return merged object: original attraction data + `{ googleRating, googleReviewCount, googlePhotos[], currentlyOpen, googleOpeningHours, googleUrl, googleEditorialSummary }`
    4. If no placeId or API fails, return original attraction unchanged
  - Export `enrichAttractionsForCity(attractions, citySlug)`:
    - Batch enrichment with concurrency limit (3 parallel)
    - Returns array of enriched attractions
  - Field mask for enrichment:
    ```
    id,displayName,rating,userRatingCount,currentOpeningHours,
    regularOpeningHours,photos,websiteUri,googleMapsUri,
    editorialSummary,priceLevel
    ```

- [ ] **[CURSOR]** Update `src/app/api/cities/[city]/route.js`:
  - After loading city data from disk, enrich attractions with Google data
  - Add a `?enrich=true` query param to opt into enrichment (default: false, to avoid API costs on every request)
  - Cache enriched results for 24 hours

**Files**: New file `src/lib/google-places/enrichment.js`, modify `src/app/api/cities/[city]/route.js`
**Acceptance**: `GET /api/cities/paris?enrich=true` returns attraction data with `googleRating`, `googleReviewCount`, and `googlePhotos`.

---

### 5.6 Display Google Data in City Guide UI

- [ ] **[CURSOR]** Update `src/components/city-guides/AttractionsList.js` (or whatever renders attractions):
  - If `attraction.googleRating` exists, show a star rating badge: "4.5 (12,345 reviews)"
  - If `attraction.currentlyOpen` is available, show "Open now" / "Closed" badge
  - If `attraction.googlePhotos` exists, use the first photo as the card image (via Place Photos URL)
  - If `attraction.googleUrl` exists, add a "View on Google Maps" link
  - Keep the existing UI layout — just add these as supplementary details

- [ ] **[CURSOR]** Create `src/components/common/GooglePlacePhoto.js`:
  - Takes `photoName`, `maxWidth`, `maxHeight` as props
  - Calls a server action or API route to get the photo URL (don't expose API key client-side)
  - Renders an `<Image>` with the photo URL
  - Fallback to existing thumbnail if photo fails to load

**Files**: Modify attraction display component, new `GooglePlacePhoto.js`
**Acceptance**: Paris attractions page shows Google ratings and photos alongside existing content.

---

### 5.7 Add Types for Google Places Data

- [ ] **[CURSOR]** Add to `src/types/city.ts`:
  ```typescript
  export interface GooglePlaceEnrichment {
    googlePlaceId?: string;
    googleRating?: number;
    googleReviewCount?: number;
    googlePhotos?: GooglePlacePhoto[];
    currentlyOpen?: boolean;
    googleOpeningHours?: string[];
    googleUrl?: string;
    googleEditorialSummary?: string;
    googlePriceLevel?: string;
  }

  export interface GooglePlacePhoto {
    name: string;
    widthPx: number;
    heightPx: number;
  }
  ```
- [ ] **[CURSOR]** Extend the `Attraction` interface to include `& Partial<GooglePlaceEnrichment>`

**Files**: Modify `src/types/city.ts`
**Acceptance**: TypeScript types cover enriched attraction data.

---

### Sprint 5 Commit Checkpoint

- [ ] **[MANUAL]** Commit: `git add -A && git commit -m "feat: Google Places API integration — client library, place_id resolution, live enrichment"`

---

## Sprint 6: Persistent Trip State + Expanded Supabase Schema

**Goal**: Trips become mutable, persistent objects with day/activity granularity. Add shareable trip links and calendar export. Foundation for agentic planner and nightly briefings.

**Prerequisites**: Supabase project access (dashboard for migrations).

---

### 6.1 Design the Expanded Schema

The current schema (from `supabase/migrations/0001_paris_mvp.sql`) has:
- `trips` — flat row per trip with `interests` JSONB, `pace` int, `initial_plan` JSONB
- `trip_progress` — per-day tracking (but tied to Paris flow)
- `preferences_learned` — per-trip interest learning

The new schema adds day and activity granularity so the agentic planner and nightly briefing can modify individual activities.

- [ ] **[CURSOR]** Create `supabase/migrations/0002_trip_activities.sql`:

```sql
-- Add missing columns to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning'
    CHECK (status IN ('planning', 'confirmed', 'active', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS collaborator_emails TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weather_adaptation_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Trip days: one row per day of the trip
CREATE TABLE IF NOT EXISTS trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  theme TEXT,
  notes TEXT,
  weather_forecast JSONB,
  adapted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_id, day_number)
);

-- Trip activities: individual items within a day
CREATE TABLE IF NOT EXISTS trip_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  time_block TEXT NOT NULL CHECK (time_block IN ('morning', 'lunch', 'afternoon', 'evening', 'night')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_time TIME,
  end_time TIME,
  -- Activity data
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  duration_minutes INTEGER,
  price_range TEXT,
  -- Location
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  neighborhood TEXT,
  address TEXT,
  -- Google Places integration
  google_place_id TEXT,
  google_rating DOUBLE PRECISION,
  google_photo_name TEXT,
  -- Metadata
  indoor BOOLEAN DEFAULT false,
  booking_required BOOLEAN DEFAULT false,
  booking_url TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'skipped', 'completed', 'weather_swapped')),
  original_activity_id UUID REFERENCES trip_activities(id),
  swap_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX idx_trip_activities_day_id ON trip_activities(trip_day_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_user_id ON trips(user_id);

-- Updated_at triggers
CREATE TRIGGER trip_days_updated_at BEFORE UPDATE ON trip_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trip_activities_updated_at BEFORE UPDATE ON trip_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies (allow authenticated users to manage their own trips)
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own trip days"
  ON trip_days FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid() OR user_email = auth.email()));

CREATE POLICY "Users can manage their own trip activities"
  ON trip_activities FOR ALL
  USING (trip_day_id IN (
    SELECT td.id FROM trip_days td
    JOIN trips t ON td.trip_id = t.id
    WHERE t.user_id = auth.uid() OR t.user_email = auth.email()
  ));
```

- [ ] **[MANUAL]** Apply migration via Supabase dashboard (SQL editor) or CLI: `supabase db push`

**Files**: New file `supabase/migrations/0002_trip_activities.sql`
**Acceptance**: New tables exist in Supabase. Can insert a trip_day and trip_activity via SQL editor.

---

### 6.2 Build Trip State API

- [ ] **[CURSOR]** Create `src/lib/trips/tripState.js`:
  - Export `createTripWithDays(tripData, itinerary)`:
    1. Insert into `trips` table
    2. For each day in itinerary, insert into `trip_days`
    3. For each activity in each day, insert into `trip_activities`
    4. Return the full trip object with nested days and activities
  - Export `getTripWithDetails(tripId)`:
    1. Fetch trip + join trip_days + join trip_activities
    2. Return nested structure: `{ ...trip, days: [{ ...day, activities: [...] }] }`
  - Export `updateActivity(activityId, updates)`:
    1. Partial update on trip_activities
    2. Return updated activity
  - Export `swapActivity(activityId, newActivity, reason)`:
    1. Mark original as `status: 'weather_swapped'`
    2. Insert new activity with `original_activity_id` pointing to the swapped one
    3. Return new activity
  - Export `getActiveTrips()`:
    1. Find trips where `status = 'active'` and `start_date <= today <= end_date`
    2. Return with full day/activity details (used by nightly briefing cron)

**Files**: New file `src/lib/trips/tripState.js`
**Acceptance**: Can create a trip, fetch it with full day/activity nesting, update individual activities.

---

### 6.3 Migrate Existing Trip Creation Flow

The current flow: wizard → POST `/api/trips` → `buildItinerary()` → store flat JSONB in `initial_plan` → display page reads `initial_plan`.

New flow: wizard → POST `/api/trips` → `buildItinerary()` → `createTripWithDays()` stores normalized rows → display page reads from `getTripWithDetails()`.

- [ ] **[CURSOR]** Update `src/app/api/trips/route.js` (POST handler):
  - After building the itinerary with `buildItinerary(trip, cityData)`, call `createTripWithDays(tripPayload, itinerary)` instead of just inserting a flat row
  - Still store `initial_plan` as backup (for now)
  - Return the new trip ID

- [ ] **[CURSOR]** Update `src/app/itineraries/[tripId]/page.js`:
  - Fetch trip via `getTripWithDetails(tripId)` instead of the current flat query
  - If the trip has `days` array populated, render from the normalized data
  - If not (legacy trips), fall back to the existing `initial_plan` JSONB rendering
  - Keep the Paris-specific `buildParisRecommendations` path for Paris trips

- [ ] **[CURSOR]** Update `src/app/plan/[city]/page.js`:
  - No changes to the wizard UI itself
  - Update the POST payload to include `user_id` if authenticated (from `useAuth()`)

**Files**: Modify `src/app/api/trips/route.js`, `src/app/itineraries/[tripId]/page.js`, `src/app/plan/[city]/page.js`
**Acceptance**: Creating a new trip via `/plan/barcelona` stores normalized trip_days and trip_activities in Supabase. The itinerary page renders from the normalized data.

---

### 6.4 Add Trip Types

- [ ] **[CURSOR]** Update `src/types/api.ts` — add or replace `Trip` type:
  ```typescript
  export interface Trip {
    id: string;
    user_id?: string;
    user_email?: string;
    city: string;
    country?: string;
    title?: string;
    start_date: string;
    end_date: string;
    interests: string[];
    pace: number;
    budget: string;
    status: 'planning' | 'confirmed' | 'active' | 'completed' | 'cancelled';
    weather_adaptation_enabled: boolean;
    created_at: string;
    days: TripDay[];
  }

  export interface TripDay {
    id: string;
    day_number: number;
    date: string;
    theme?: string;
    notes?: string;
    weather_forecast?: WeatherForecast;
    activities: TripActivity[];
  }

  export interface TripActivity {
    id: string;
    time_block: 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';
    sort_order: number;
    start_time?: string;
    end_time?: string;
    name: string;
    type?: string;
    description?: string;
    duration_minutes?: number;
    price_range?: string;
    latitude?: number;
    longitude?: number;
    neighborhood?: string;
    google_place_id?: string;
    google_rating?: number;
    google_photo_name?: string;
    indoor: boolean;
    booking_required: boolean;
    booking_url?: string;
    status: 'planned' | 'confirmed' | 'skipped' | 'completed' | 'weather_swapped';
    swap_reason?: string;
  }

  export interface WeatherForecast {
    high_c: number;
    low_c: number;
    condition: string;
    precipitation_chance: number;
    wind_kph: number;
  }
  ```

**Files**: Modify `src/types/api.ts`
**Acceptance**: Types cover the full trip → days → activities hierarchy.

---

### 6.5 Shareable Trip Links

- [ ] **[CURSOR]** Create `src/app/trips/[tripId]/page.js` — a public read-only trip view:
  - Server component that fetches trip via `getTripWithDetails(tripId)` (use admin client, no auth required for reading)
  - Renders: trip title, city, dates, day-by-day itinerary with activities
  - Renders: a map (Mapbox) with all activity pins
  - Includes a "Create your own trip" CTA button linking to `/plan/{city}`
  - Includes OG metadata for social sharing: `generateMetadata()` with trip title, city, dates

- [ ] **[CURSOR]** Add a "Share" button to the existing itinerary page (`src/app/itineraries/[tripId]/page.js`):
  - Copy link to clipboard: `https://eurotrip-planner.vercel.app/trips/{tripId}`
  - Use the Web Share API on mobile (fallback to clipboard on desktop)

**Files**: New file `src/app/trips/[tripId]/page.js`, modify `src/app/itineraries/[tripId]/page.js`
**Acceptance**: Visiting `/trips/{tripId}` shows a public read-only itinerary. Sharing the URL on social media shows a rich preview with city name and dates.

---

### 6.6 Calendar Export (.ics)

- [ ] **[CURSOR]** Create `src/lib/trips/calendarExport.js`:
  - Export `generateICS(trip)`:
    1. Takes a full trip object (with days and activities)
    2. Generates an .ics file string with one VEVENT per activity
    3. Each event has: summary (activity name), dtstart/dtend (date + start_time/end_time), location (address or coordinates), description (activity description + Google Maps link)
    4. Returns the .ics string

- [ ] **[CURSOR]** Create `src/app/api/trips/[id]/calendar/route.js`:
  - GET handler that fetches the trip, calls `generateICS(trip)`, returns with headers:
    ```
    Content-Type: text/calendar
    Content-Disposition: attachment; filename="{city}-trip.ics"
    ```

- [ ] **[CURSOR]** Add an "Add to Calendar" button to the itinerary page:
  - Links to `/api/trips/{tripId}/calendar`
  - Downloads an .ics file that opens in Google Calendar / Apple Calendar

**Files**: New file `src/lib/trips/calendarExport.js`, new API route `src/app/api/trips/[id]/calendar/route.js`, modify itinerary page
**Acceptance**: Clicking "Add to Calendar" downloads an .ics file. Opening it in Google Calendar creates events for each activity.

---

### 6.7 Rebuild and Verify

- [ ] **[SCRIPT]** Full build: `npm run build`
- [ ] Spot-check in browser:
  - [ ] Create a trip via `/plan/barcelona` → verify it stores trip_days and trip_activities
  - [ ] View the itinerary → verify it renders from normalized data
  - [ ] Click "Share" → verify the public link works
  - [ ] Click "Add to Calendar" → verify .ics downloads and opens correctly
  - [ ] Create a trip via `/plan/paris` → verify Paris still uses the specialized engine
  - [ ] View a legacy trip (if any exist) → verify backward compatibility

**Acceptance**: Full build passes. New trips use normalized schema. Sharing and calendar export work.

---

### Sprint 6 Commit Checkpoint

- [ ] **[MANUAL]** Commit: `git add -A && git commit -m "feat: persistent trip state with day/activity granularity, shareable links, calendar export"`

---

## Quick Reference: File Inventory

### New files created across Sprints 4-6

```
Sprint 4:
  (no new files — uses existing scripts, generates data)

Sprint 5:
  src/lib/google-places/client.js          — Google Places API client
  src/lib/google-places/cache.js           — Caching layer with TTL
  src/lib/google-places/index.js           — Barrel export with cache-wrapped API
  src/lib/google-places/enrichment.js      — Attraction enrichment logic
  src/components/common/GooglePlacePhoto.js — Photo display component
  scripts/resolveGooglePlaceIds.mjs        — Batch place_id resolution
  public/data/google-place-ids.json        — Place ID mapping (generated)

Sprint 6:
  supabase/migrations/0002_trip_activities.sql — Schema migration
  src/lib/trips/tripState.js               — Trip CRUD with day/activity nesting
  src/lib/trips/calendarExport.js          — ICS file generation
  src/app/trips/[tripId]/page.js           — Public shareable trip view
  src/app/api/trips/[id]/calendar/route.js — Calendar export endpoint
```

### Modified files across Sprints 4-6

```
Sprint 4:
  public/data/Bulgaria/Varna/monthly/february.json   — fix malformed JSON
  public/data/Bulgaria/Sofia/monthly/february.json    — fix malformed JSON
  public/data/Czechia/prague/monthly/march.json       — fix malformed JSON
  public/data/**  (82 cities)                         — generated content
  .env.example                                        — add Sentry vars

Sprint 5:
  .env.example                             — add GOOGLE_PLACES_API_KEY
  src/app/api/cities/[city]/route.js       — add enrichment option
  src/components/city-guides/AttractionsList.js — display Google data
  src/types/city.ts                        — add GooglePlaceEnrichment types

Sprint 6:
  src/app/api/trips/route.js               — use createTripWithDays
  src/app/itineraries/[tripId]/page.js     — read from normalized trip data
  src/app/plan/[city]/page.js              — pass user_id
  src/types/api.ts                         — add Trip/TripDay/TripActivity types
```
