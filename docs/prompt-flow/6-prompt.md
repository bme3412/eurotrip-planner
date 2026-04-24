# EuroTrip Planner — Sprint 3: Planning, Search & First Revenue

> This sprint adds the features that turn a content site into a product people come back to:
> a generalized trip planner, instant search, and the first monetization hooks.
>
> Paste this entire prompt into Cursor with the codebase open.
> Read the full codebase before making changes — Sprints 0-2 restructured the data layer,
> auth, navigation, and API. Understand the current state before modifying.

---

## Context

**What now exists (after Sprints 0-2):**
- 220 city guides with SEO metadata, sitemap, JSON-LD, OG images
- Build-generated `src/generated/cities.json` (replaces old hardcoded cityData.js)
- Real suggestions API at `/api/suggestions` scoring 127 cities by visit calendar data
- Persistent Navbar across all pages with auth integration (Supabase Auth only)
- TypeScript interfaces for all data schemas in `src/types/`
- Dynamic city coordinates with fallback chain
- Paris-specific itinerary engine (`src/lib/planning/buildParisRecommendations.js`, 796 lines)
- Paris trip wizard at `/paris-trip` (7-step flow: dates → hotel → prebookings → pace → interests → budget → summary)
- Trip storage in Supabase (`trips` table)
- Itinerary display at `/itineraries/[tripId]`

**Key files for this sprint:**
- `src/lib/planning/buildParisRecommendations.js` — the Paris-specific engine to generalize
- `src/app/paris-trip/page.js` — 660-line Paris trip wizard
- `src/app/itineraries/[tripId]/page.js` — trip itinerary display
- `src/app/start-planning/page.js` — planner entry point (wraps `EuroTripPlanner`)
- `src/components/EuroTripPlanner.js` — main planner component
- `src/components/common/Navbar.js` — global nav (add search here)
- `src/generated/cityIndex.js` — city data exports
- `src/lib/scoring/cityScorer.js` — date-based scoring engine
- `src/types/` — TypeScript interfaces
- `public/data/{Country}/{city}/index.json` — city data with attractions, neighborhoods, culinary data

---

## TASK 1: Add Global Search to Navbar

### Why First
This is a quick, high-impact UX win. Users currently have no fast way to find a specific city from any page. Search in the navbar makes every page a potential entry point.

### Requirements

Add a search input to the Navbar that provides **instant, client-side city search** with a dropdown of results.

**Behavior:**
- A search icon button in the navbar that expands into a search input on click (or a persistent compact input on desktop)
- As the user types (debounced ~200ms), show a dropdown of matching cities
- Match against: city name, country name, region
- Fuzzy/partial matching: "barc" should find "Barcelona", "ital" should find all Italian cities
- Show top 6-8 results in the dropdown
- Each result shows: city name, country, region tag
- Clicking a result navigates to `/city-guides/{citySlug}`
- Pressing Enter with text navigates to `/city-guides?search={query}` (the city guides index with search prefilled)
- Pressing Escape or clicking outside closes the dropdown
- Keyboard navigation: arrow keys move through results, Enter selects

**Data source:** Import from `@/generated/cityIndex` — the city list is already client-side (~80KB). For 220 cities, client-side search is faster than an API call.

**Search implementation:**
```javascript
function searchCities(query, cities, limit = 8) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  
  // Score each city by match quality
  const scored = cities
    .map(city => {
      const name = city.name.toLowerCase();
      const country = city.country.toLowerCase();
      let score = 0;
      
      // Exact start of name is best
      if (name.startsWith(q)) score = 100;
      // Start of a word in name
      else if (name.split(/[\s-]/).some(w => w.startsWith(q))) score = 80;
      // Contains in name
      else if (name.includes(q)) score = 60;
      // Country match
      else if (country.startsWith(q)) score = 40;
      else if (country.includes(q)) score = 20;
      // No match
      else return null;
      
      return { ...city, _score: score };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score);
  
  return scored.slice(0, limit);
}
```

**Styling:**
- Dropdown should float below the search input with a shadow and border
- Use a portal or high z-index so it renders above page content
- Match the visual style of the existing Navbar
- On mobile: search could expand to a full-screen overlay or slide-down panel
- Include a subtle "Search 220+ cities" placeholder text

**File to modify:** `src/components/common/Navbar.js`
**New file (if extracting):** `src/components/common/SearchBar.js` or inline in Navbar

---

## TASK 2: Generalize the Trip Planner Beyond Paris

### Why This Is Critical
The Paris trip wizard (`/paris-trip`) and itinerary engine (`buildParisRecommendations.js`) are the only real "planning" features. Every other city dead-ends at "read the guide." Generalizing this unlocks the core product: date-based city discovery → trip planning → itinerary.

### Strategy

We're NOT rewriting the Paris engine from scratch. We're:
1. Creating a generic trip wizard that works for any city
2. Building a simpler, more flexible itinerary generator that doesn't need Paris-level hardcoded data
3. Keeping the Paris engine as a specialized path (it's 796 lines of domain logic that works well)

### Step 1: Understand the Paris Flow End-to-End

Read these files thoroughly and document the complete flow:

1. `src/app/paris-trip/page.js` (660 lines) — the wizard UI
   - What are the 7 steps?
   - What data does each step collect?
   - What's the final payload shape sent to the API?
   
2. `src/app/api/trips/route.js` — the trip creation API
   - What does it store in Supabase?
   - What's the trip table schema?

3. `src/app/itineraries/[tripId]/page.js` — the itinerary display
   - How does it load the trip?
   - How does it call `buildParisRecommendations`?
   - What does it render?

4. `src/lib/planning/buildParisRecommendations.js` (796 lines) — the engine
   - What inputs does it take?
   - What's the output shape?
   - What Paris-specific logic exists (zone mapping, travel matrix, specific venue references)?
   - What logic is genuinely generic (time slot allocation, pace-based scheduling, interest matching)?

### Step 2: Create the Generic Trip Wizard

Create `src/app/plan/[city]/page.js` — a dynamic route for planning a trip to any city.

**New URL pattern:** `/plan/paris`, `/plan/barcelona`, `/plan/rome`, etc.

Redirect `/paris-trip` to `/plan/paris` for backward compatibility (add a redirect in `next.config.mjs` or a simple redirect page).

**Wizard Steps (simplified from Paris's 7):**

**Step 1: Dates**
- Calendar date picker for check-in / check-out
- Trip duration display
- Reuse existing `DateSelector` or `InlineDateControl` component

**Step 2: Travel Style**
- Pace preference: Relaxed / Moderate / Active (maps to number of activities per day: 2-3 / 3-4 / 4-5)
- Interest categories: Culture & History, Food & Drink, Nature & Outdoors, Art & Museums, Nightlife, Shopping, Photography, Family Activities
- Allow selecting multiple interests
- These should be pulled from or consistent with the categories in `src/types/city.ts`

**Step 3: Preferences**
- Budget level: Budget / Mid-Range / Premium (affects which experiences are recommended)
- Must-see list: Show the city's top 5-6 attractions (from the attractions data) with checkboxes — these get priority in the itinerary
- Any pre-booked activities: free text or time-slot reservation (optional)

**Step 4: Review & Generate**
- Summary of selections
- "Generate My Itinerary" button
- Loading state with progress animation while the itinerary is being built

**Data flow:**
```
User fills wizard → POST /api/trips with:
{
  city: "barcelona",
  country: "Spain",
  startDate: "2026-04-15",
  endDate: "2026-04-22",
  pace: "moderate",
  interests: ["culture", "food", "photography"],
  budget: "mid-range",
  mustSee: ["sagrada-familia", "park-guell", "gothic-quarter"],
  preBooked: []
}
→ Supabase stores trip
→ Redirect to /itineraries/[tripId]
→ Itinerary page loads trip, calls itinerary generator, renders result
```

**City-specific data:** The wizard should load the city's data to populate the must-see list and interest categories. Fetch from `/api/cities/[city]` or load from the public data directory.

**Accessing from city guide pages:** Add a prominent "Plan Your Trip" CTA button on every city guide page (in `CityPageClient.js`) that links to `/plan/{citySlug}`. This is the conversion path from browsing to planning.

### Step 3: Build the Generic Itinerary Generator

Create `src/lib/planning/buildItinerary.js`:

```javascript
/**
 * Generates a day-by-day itinerary for any city.
 * 
 * Unlike buildParisRecommendations (which uses hardcoded zones and travel matrices),
 * this generator works with whatever data is available in the city's index.json.
 *
 * @param {Object} trip - Trip parameters from the wizard
 * @param {Object} cityData - Full city data from index.json
 * @returns {Object} itinerary - Day-by-day plan
 */
export function buildItinerary(trip, cityData) { ... }
```

**Itinerary generation logic:**

1. **Calculate trip structure:**
   - Number of days = endDate - startDate
   - Activities per day based on pace: relaxed=3, moderate=4, active=5
   - Time blocks: Morning (9-12), Lunch (12-1:30), Afternoon (1:30-5), Evening (5-8), Night (8+)

2. **Score and rank attractions:**
   - Load all attractions from `cityData.attractions.sites`
   - Score each by: match to user interests, cultural significance rating, whether it's in the must-see list
   - Must-see items get priority placement (scheduled first)
   - Budget filter: if budget is "budget", deprioritize expensive attractions

3. **Build daily schedules:**
   - For each day, allocate attractions to time blocks
   - Morning: museums, churches, outdoor sights (things best done early)
   - Lunch: if culinary data exists, suggest a neighborhood for lunch based on where the morning attraction is
   - Afternoon: galleries, neighborhoods to explore, shopping areas
   - Evening: viewpoints for sunset, food experiences, cultural events
   - Night: nightlife, late-dining (only if interests include nightlife)

4. **Geographic clustering:**
   - If attractions have coordinates, group nearby ones on the same day
   - Simple approach: calculate pairwise distances, greedily cluster
   - This replaces Paris's hardcoded zone system with dynamic clustering

5. **Add practical details:**
   - For each attraction: include name, type, estimated duration, price range, and any booking URL
   - For each day: include a "day theme" (e.g., "Historic Quarter Day", "Art & Gardens")
   - Add neighborhood context from the neighborhoods data

6. **Fallback for sparse data:**
   - Not all cities have rich attraction data. If a city has fewer than 10 attractions, pad the itinerary with neighborhood exploration, food recommendations, and free-form "discovery time" blocks.
   - If no culinary data exists, skip food recommendations (don't show empty sections).

**Output shape** (should be compatible with the existing itinerary display page, or update the display page to handle this shape):

```javascript
{
  tripId: "abc-123",
  city: "Barcelona",
  country: "Spain",
  startDate: "2026-04-15",
  endDate: "2026-04-22",
  days: [
    {
      dayNumber: 1,
      date: "2026-04-15",
      theme: "Gothic Quarter & Waterfront",
      timeBlocks: [
        {
          time: "morning",
          startTime: "9:00",
          endTime: "11:30",
          activity: {
            name: "Barcelona Cathedral",
            type: "Cathedral",
            description: "...",
            duration: "1.5h",
            price: "Free (rooftop €3)",
            coordinates: [2.1763, 41.3840],
            bookingUrl: null,
            neighborhood: "Gothic Quarter"
          }
        },
        {
          time: "lunch",
          startTime: "12:00",
          endTime: "13:30",
          activity: {
            name: "Lunch in El Born",
            type: "food_recommendation",
            description: "Head to El Born for excellent tapas...",
            neighborhood: "El Born",
            suggestions: ["Bar del Pla", "Cal Pep"] // from culinary data if available
          }
        },
        // ... more time blocks
      ],
      tips: ["The Gothic Quarter is best explored on foot", "Many shops close 2-4pm for siesta"]
    },
    // ... more days
  ],
  summary: {
    totalAttractions: 18,
    estimatedBudget: "€450-650",
    neighborhoods: ["Gothic Quarter", "Eixample", "El Born", "Barceloneta"],
    mustSeeCompleted: ["sagrada-familia", "park-guell", "gothic-quarter"]
  }
}
```

### Step 4: Update the Itinerary Display Page

Modify `src/app/itineraries/[tripId]/page.js` to handle both:
- Paris trips (continue using `buildParisRecommendations` when `trip.city === 'paris'`)
- All other cities (use the new `buildItinerary`)

The display should render the day-by-day structure with:
- Day cards with the theme
- Time blocks with activity details
- A mini-map showing the day's locations (if coordinates are available)
- Practical tips per day
- A trip summary at the top

If the existing itinerary display page is too Paris-specific, create a new generic component and use it for non-Paris cities.

### Step 5: Add "Plan Your Trip" CTA to City Pages

In `src/components/city-guides/CityPageClient.js`, add a floating or prominent CTA:

```jsx
<Link 
  href={`/plan/${citySlug}`}
  className="..."  // Style as a prominent button, matching the app's blue accent
>
  Plan Your Trip to {cityName}
</Link>
```

**Placement options** (pick one that works with the existing layout):
- Fixed bottom bar on mobile, sidebar CTA on desktop
- Inside the hero section
- Sticky at the bottom of the tab content area
- After the "Start Here" tab content (natural conversion point after reading essential info)

The CTA should also appear in the city guide page's `<head>` as a meta action (this helps with Google's page understanding):
```html
<link rel="alternate" href="/plan/{city}" />
```

### Step 6: Redirect /paris-trip

Add to `next.config.mjs`:
```javascript
async redirects() {
  return [
    {
      source: '/paris-trip',
      destination: '/plan/paris',
      permanent: true,
    },
  ];
}
```

When the city is Paris and it's accessed via `/plan/paris`, the generic wizard should work — but when the itinerary is generated, detect that it's Paris and use the specialized `buildParisRecommendations` engine for superior results. This gives Paris users the best experience while extending planning to all cities.

---

## TASK 3: Affiliate Integration (First Revenue)

### Why Now
Affiliate links are the lowest-friction monetization. You're already showing experiences with "Book / Visit site →" links (at least for Paris). Adding affiliate tracking to these links and expanding them to other providers generates revenue without changing the user experience.

### Step 1: Identify Current Booking Links

Search the codebase for any existing booking URLs, affiliate links, or "Book" CTAs:
```bash
grep -r "book\|Book\|affiliate\|visit.*site\|booking\|getyourguide\|viator\|tripadvisor" src/ --include="*.js" --include="*.jsx" -l
```

Also check the Paris experiences data for booking URLs:
```bash
grep -r "booking_url\|bookingUrl\|website\|url" public/data/France/paris/ --include="*.json" | head -30
```

Document what currently exists.

### Step 2: Create an Affiliate Link Utility

Create `src/lib/affiliates/affiliateLinks.js`:

```javascript
/**
 * Affiliate link management for EuroTrip Planner.
 * 
 * Wraps booking URLs with affiliate tracking parameters.
 * Currently supports:
 *   - GetYourGuide (activity bookings)
 *   - Booking.com (accommodation) — future
 *   - Viator (tours & activities) — future
 * 
 * Affiliate IDs are stored in environment variables.
 * If no affiliate ID is configured, returns the original URL unchanged.
 */

const AFFILIATE_CONFIG = {
  getyourguide: {
    paramName: 'partner_id',
    partnerId: process.env.NEXT_PUBLIC_GYG_PARTNER_ID || null,
    // GetYourGuide deep linking: https://partner.getyourguide.com/
    buildUrl: (activityUrl, partnerId) => {
      if (!partnerId || !activityUrl) return activityUrl;
      const url = new URL(activityUrl);
      url.searchParams.set('partner_id', partnerId);
      url.searchParams.set('utm_medium', 'online_partner');
      url.searchParams.set('utm_source', 'eurotrip_planner');
      return url.toString();
    }
  },
  viator: {
    partnerId: process.env.NEXT_PUBLIC_VIATOR_PARTNER_ID || null,
    buildUrl: (activityUrl, partnerId) => {
      if (!partnerId || !activityUrl) return activityUrl;
      // Viator uses a different affiliate URL structure
      // See: https://partnernet.viator.com/
      const url = new URL(activityUrl);
      url.searchParams.set('pid', partnerId);
      url.searchParams.set('mcid', '42383');
      url.searchParams.set('medium', 'link');
      return url.toString();
    }
  },
  bookingcom: {
    aid: process.env.NEXT_PUBLIC_BOOKING_AID || null,
    buildUrl: (hotelUrl, aid) => {
      if (!aid || !hotelUrl) return hotelUrl;
      const url = new URL(hotelUrl);
      url.searchParams.set('aid', aid);
      return url.toString();
    }
  }
};

/**
 * Detect the provider from a URL and apply affiliate parameters.
 * @param {string} url - Original booking URL
 * @returns {string} URL with affiliate tracking (or original if no match)
 */
export function affiliateUrl(url) {
  if (!url) return url;
  
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('getyourguide')) {
      return AFFILIATE_CONFIG.getyourguide.buildUrl(url, AFFILIATE_CONFIG.getyourguide.partnerId);
    }
    if (hostname.includes('viator')) {
      return AFFILIATE_CONFIG.viator.buildUrl(url, AFFILIATE_CONFIG.viator.partnerId);
    }
    if (hostname.includes('booking.com')) {
      return AFFILIATE_CONFIG.bookingcom.buildUrl(url, AFFILIATE_CONFIG.bookingcom.aid);
    }
    
    return url;
  } catch {
    return url; // Return original if URL parsing fails
  }
}

/**
 * Generate a search URL for a city on a booking platform.
 * Useful when no direct activity URL exists.
 */
export function searchUrl(platform, { city, country, category }) {
  switch (platform) {
    case 'getyourguide': {
      const pid = AFFILIATE_CONFIG.getyourguide.partnerId;
      const base = `https://www.getyourguide.com/s/?q=${encodeURIComponent(city + ' ' + country)}`;
      return pid ? `${base}&partner_id=${pid}&utm_source=eurotrip_planner` : base;
    }
    case 'viator': {
      const base = `https://www.viator.com/searchResults/all?text=${encodeURIComponent(city)}`;
      return base; // Add affiliate params when configured
    }
    case 'bookingcom': {
      const aid = AFFILIATE_CONFIG.bookingcom.aid;
      const base = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city + ', ' + country)}`;
      return aid ? `${base}&aid=${aid}` : base;
    }
    default:
      return null;
  }
}
```

Add to `.env.example`:
```env
# Affiliate Partner IDs (optional — features work without them, just no tracking)
NEXT_PUBLIC_GYG_PARTNER_ID=
NEXT_PUBLIC_VIATOR_PARTNER_ID=
NEXT_PUBLIC_BOOKING_AID=
```

### Step 3: Apply Affiliate Links to Experience Displays

Find every component that renders a "Book" or "Visit site" link and wrap the URL through `affiliateUrl()`.

**Paris experiences** (the richest dataset): 
- Read the component that renders Paris experiences (likely something under `src/components/city-guides/` that handles the Experiences tab)
- Find where it renders `bookingUrl` or `website` from the experience data
- Wrap those URLs: `affiliateUrl(experience.bookingUrl || experience.website)`

**Attraction listings** (all cities):
- Read `AttractionsList.js` (or whatever renders the attractions on city pages)
- If attractions have `website` fields, make them clickable and wrap through `affiliateUrl()`

**Itinerary display**:
- In the itinerary page, if activities show booking links, wrap them too

**Important**: All affiliate links should:
- Open in a new tab (`target="_blank" rel="noopener noreferrer"`)
- Have a small disclaimer somewhere on pages with affiliate links (e.g., in the footer or as a tooltip): "Some links may earn us a commission at no extra cost to you"
- Be visually identifiable as external links (small external link icon)

### Step 4: Add "Book Activities" Search Links to City Pages

For cities that don't have rich experience data (most cities besides Paris), add a "Find Activities" section that links to search results on booking platforms:

```jsx
function BookActivitiesSection({ cityName, country }) {
  return (
    <div className="...">
      <h3>Book Activities in {cityName}</h3>
      <p>Find tours, tickets, and experiences:</p>
      <div className="flex gap-3">
        <a href={searchUrl('getyourguide', { city: cityName, country })} 
           target="_blank" rel="noopener noreferrer">
          Browse on GetYourGuide →
        </a>
        <a href={searchUrl('viator', { city: cityName, country })}
           target="_blank" rel="noopener noreferrer">
          Browse on Viator →
        </a>
      </div>
    </div>
  );
}
```

This should appear:
- On the Experiences tab for cities without rich experience data
- In the itinerary display (e.g., "Want to book ahead? Find activities in {city}")
- Optionally in the "Start Here" tab

### Step 5: Add Click Tracking (Simple Version)

For now, just track affiliate link clicks client-side so you have data on what converts:

```javascript
/**
 * Track an affiliate link click.
 * Simple implementation — logs to console in dev, sends to analytics in prod.
 * Can be upgraded to a server-side tracking endpoint later.
 */
export function trackAffiliateClick({ provider, city, activityName, url }) {
  // Use Vercel Analytics custom events if available
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', {
      name: 'affiliate_click',
      provider,
      city,
      activity: activityName,
    });
  }
  
  // Also log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Affiliate Click]', { provider, city, activityName, url });
  }
}
```

Wrap affiliate links in an onClick handler:
```jsx
<a 
  href={affiliateUrl(url)} 
  target="_blank" 
  rel="noopener noreferrer"
  onClick={() => trackAffiliateClick({ provider: 'getyourguide', city, activityName: name, url })}
>
  Book / Visit site →
</a>
```

---

## TASK 4: Enrich Missing City Coordinates

### Problem
89 cities have no coordinates. This means their map views center on central Europe, which is useless.

### Solution
Create a build script that geocodes missing cities from their name + country.

Create `scripts/enrichCoordinates.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Enriches cityMetadata.json with coordinates for cities that are missing them.
 * 
 * Uses a static lookup table of European city coordinates (no API needed).
 * For any cities still missing after the lookup, logs them for manual addition.
 * 
 * Run: node scripts/enrichCoordinates.mjs
 */
```

**Approach**: Instead of calling a geocoding API (which requires API keys and has rate limits), use a **static coordinates table** for well-known European cities. Most European cities with Wikipedia pages have well-known coordinates.

1. Create a JSON lookup of city coordinates. You can generate this by:
   - Reading the manifest to get all 220 city names and countries
   - For cities missing coordinates, hardcode them from common knowledge (e.g., Barcelona is [2.1734, 41.3851], Rome is [12.4964, 41.9028])
   - This is tedious but a one-time effort. For 89 cities, it's ~30 minutes of work.

2. **Alternatively**: Read the city's attractions data — many individual attractions have lat/lon. Average all attraction coordinates to get an approximate city center. This was partially implemented in Sprint 2's coordinate fallback, but only at runtime. Run it at build time and persist the results.

3. Write the coordinates back to `scripts/cityMetadata.json` (the bridge file from Task 1).

4. Run `npm run generate-cities` to regenerate the city list with new coordinates.

**Report** how many cities now have coordinates vs. before (target: 200+).

---

## VERIFICATION

### Build Check
```bash
npm run build
```
Must succeed with zero errors.

### Functional Testing

**Search:**
1. Click the search icon/input in the navbar from any page
2. Type "bar" — should show Barcelona, Bari, etc.
3. Type "italy" — should show Italian cities
4. Click a result — should navigate to that city's guide
5. Press Escape — should close the dropdown
6. Test on mobile — search should be usable

**Trip Planning:**
1. From any city guide page, click "Plan Your Trip to {City}"
2. Complete the wizard (dates, style, preferences)
3. Generate itinerary — should show a day-by-day plan
4. Verify the itinerary makes geographic sense (activities near each other on the same day)
5. Test with a data-rich city (Paris, Rome, Barcelona) AND a data-sparse city
6. Verify `/paris-trip` redirects to `/plan/paris`
7. Verify Paris itinerary still uses the specialized engine and produces good results

**Affiliate Links:**
1. On Paris experiences page, check that "Book / Visit site" links have affiliate parameters (if env vars are set)
2. If no affiliate IDs configured, links should still work (just without tracking params)
3. Check that external links open in new tabs
4. On a non-Paris city, check that "Find Activities" search links work

**Coordinates:**
1. Visit a city that previously had no coordinates (e.g., one of the smaller Eastern European cities)
2. Check that the map tab centers on the correct location (not central Europe)

### Report

Create `SPRINT_3_REPORT.md`:
- Summary of each task
- Number of cities with working trip planning
- Number of cities with coordinates (before/after enrichment)
- Affiliate link status (configured? working?)
- Any data gaps that limit itinerary quality
- Performance impact of new features
- Suggested Sprint 4 focus