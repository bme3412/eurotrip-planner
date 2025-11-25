## Paris MVP TripFlow Development Plan (Adapted to Current Repo)

### Project Overview
Build an AI-powered trip planner that generates personalized itineraries and sends daily adaptive emails during travel. Start with Paris MVP, then expand and monetize.

### Repo Alignment (what we’ll reuse)
- Existing Paris data under `public/data/France/paris/` and the data loader in `src/app/city-guides/[city]/page.js` via `getCityData()`
- Map stack: `mapbox-gl` and `react-map-gl` with components in `src/components/map/*`
- Common UI primitives and date pickers in `src/components/common/*` and planner components in `src/components/planner/*`
- App Router structure under `src/app/*` and API routes (`src/app/api/*`)

---

## Phase 1: Paris MVP (Weeks 1–8)

### Week 1–2: Planning Engine

#### Task 1: Frontend Trip Input Form (Paris-only)
- Location: build on `src/app/start-planning/page.js`
- Steps:
  1) Trip basics: city locked to Paris, date range picker, optional accommodation location
  2) Pre-bookings: checkboxes (flights/hotel/activities) + free-text inputs
  3) Preferences: pace slider (0–100), multi-select interests, budget tier radio
- Use TailwindCSS for styling
- Validation: required dates, at least one interest
- State: reuse `context/TravelDataProvider.js` and `hooks/useTripDates.js`; add `TripFormContext` if needed
- Submit payload shape:
  `{ city: 'Paris', start_date, end_date, interests, pace, budget, hotel_location, prebookings }`

#### Task 2: Database Schema Setup (Supabase)
- Create tables via SQL:

```sql
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  city text not null,
  start_date date not null,
  end_date date not null,
  interests jsonb not null default '{}',
  pace int not null,
  budget text not null,
  hotel_location text,
  initial_plan jsonb,
  created_at timestamptz not null default now()
);

create table public.trip_progress (
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  planned_activities jsonb not null default '[]',
  completed_activities jsonb not null default '[]',
  skipped_activities jsonb not null default '[]',
  user_notes text,
  primary key (trip_id, date)
);

create table public.preferences_learned (
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null,
  interest_level int not null check (interest_level between 1 and 5),
  learned_at timestamptz not null default now()
);
```

- Backend integration:
  - Add Supabase server client in `src/lib/supabase/server.js` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  - API routes: `src/app/api/trips/route.js` (POST create), `src/app/api/trips/[id]/route.js` (GET/PUT)

#### Task 3: Paris Data Structuring (reuse existing)
- Keep existing structure under `public/data/France/paris/`:
  - `index.json`, `paris_attractions.json`, `paris_neighborhoods.json`, `paris_culinary_guide.json`, `paris_connections.json`, `paris-visit-calendar.json`, and `monthly/*`
- Consumption handled by `getCityData('paris')` in `src/app/city-guides/[city]/page.js`
- If the AI prompt needs extra fields, prefer adding to `index.json` or derive at runtime

#### Task 4: AI Planning Prompt System (Claude)
- Implement POST `src/app/api/ai/chat/route.js`:
  - Read trip form payload; load Paris data via `getCityData('paris')`
  - Token-optimal context: pass summaries and candidate activity references (IDs) instead of full datasets
  - Output contract:
    ```json
    {
      "summary": "...",
      "book_immediately": [{"type":"ticket","title":"...","id":"..."}],
      "days": [
        {
          "date": "YYYY-MM-DD",
          "morning": [{"id":"...","duration_min":90}],
          "afternoon": [{"id":"..."}],
          "evening": [{"id":"..."}],
          "tips": ["..."],
          "map_points": [{"lat":48.8584,"lng":2.2945,"label":"..."}]
        }
      ]
    }
    ```
  - Add retry with exponential backoff and robust JSON parse/repair
  - After generation, store plan in `trips.initial_plan`

#### Task 5: Itinerary Display Page
- New route: `src/app/itineraries/[tripId]/page.js`
- Sections:
  - Hero: city + dates
  - “Book Now” cards from `book_immediately`
  - Day-by-day accordion (date, theme, activities with durations)
  - Map per day using `components/map/MapComponent.js` or `OptimizedMapComponent.js`
  - Email signup form at bottom (email input + submit)
- On first load, ensure plan is persisted to `trips.initial_plan`
- Shareable via unique URL `[tripId]`

### Week 3–4: Email System

#### Task 6: Email Infrastructure Setup (Resend)
- Add Resend SDK and `RESEND_API_KEY`
- Email templates under `src/emails/` (inline CSS for compatibility)
- Daily template sections: greeting/day number, weather, today’s plan, updates/changes, tonight’s actions, quick replies, contextual P.S.

#### Task 7: Email Signup Flow
- Endpoint: `src/app/api/trips/[id]/subscribe/route.js` (POST email)
- Update `trips.user_email`; send confirmation email instantly
- Schedule email jobs for each trip day (Supabase scheduled functions or a jobs table)

#### Task 8: Email Generation Logic
- `src/lib/email/generateDailyEmail.js` should:
  1) Fetch trip + base plan for the date
  2) Fetch weather forecast (OpenWeather)
  3) Check venue status/closures (Google Places)
  4) Analyze previous day progress (if available)
  5) Build Claude prompt and render HTML
- Cron: Supabase scheduled task calls `/api/emails/cron?date=YYYY-MM-DD` to send tomorrow’s emails at 20:00 Paris time

### Week 5–6: Real-Time Integration

#### Task 9: Weather API Integration
- `src/lib/weather.js` to fetch 5-day forecast for Paris coordinates
- Normalize to `{ temp, condition, precipProb }`
- Compare to typicals from `public/data/France/paris/monthly/` and generate recommendation text

#### Task 10: Venue Status Integration (Google Places)
- `src/lib/places.js` to query place details (hours, special hours, temporary closures)
- Cache responses using `src/lib/mapCache.js`
- Return closure alerts for the daily plan

#### Task 11: Adaptation Logic System
- `src/lib/planning/analyzePreferences.js` infers museum fatigue, outdoor preference, pace issues from `trip_progress`
- `src/lib/planning/generateAdaptations.js` proposes weather pivots, closure replacements, pace adjustments, and interest refinement using Paris datasets + proximity
- Integrate into daily email generation

#### Task 12: User Feedback Loop
- Endpoint: `src/app/api/trips/[id]/feedback/route.js` (POST)
- Store feedback in `trip_progress` and use to adapt next day
- Optional minimal web form `src/app/trips/[id]/feedback/page.js` linked in emails

### Week 7–8: Beta Testing

#### Task 13: Beta User Recruitment
- `src/app/beta-signup/page.js` collecting name, email, dates → Supabase `beta_signups`

#### Task 14: Metrics Tracking Setup
- Add PostHog (client snippet in `src/app/layout.js` with consent)
- Track: `form_started`, `form_completed`, `plan_generated`, `email_opened`, `email_clicked`, `email_replied`
- Simple admin dashboard in `src/app/admin/metrics/page.js`

#### Task 15: Beta Testing Execution
- Manually onboard, monitor Resend + Supabase logs, iterate content and timing

#### Task 16: Phase 1 Decision Point
- Success criteria (example): open rate >60%, 80%+ helpful, 60%+ would pay $15–$30, 3+ recommend
- Decide proceed/pivot based on metrics; conduct interviews if under threshold

---

## Paris-Specific Notes and Mappings
- Data source: `public/data/France/paris/` already complete; `getCityData('paris')` loads overview, attractions, neighborhoods, culinary, connections, seasonal, monthly events, and visit calendar
- Monthly utilities: `src/utils/monthlyDataLoader.js` for seasonal typicals and messaging
- Map: reuse `components/map/*` and `components/city-guides/*` for UI composition
- Auth: `src/app/api/auth/[...nextauth]/route.js` exists; not required for MVP

## Minimal Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENWEATHER_API_KEY`
- `GOOGLE_MAPS_API_KEY`


