# EuroTrip Planner — Sprint 2: Architecture & Core Functionality

> This sprint transforms the app from "impressive content site" to "functional trip discovery tool."
> It replaces the biggest engineering debt (hardcoded city data, mock API) with real infrastructure,
> and adds the navigation layer that ties everything together.
>
> Paste this entire prompt into Cursor with the codebase open.
> Read the full codebase before making changes — Sprint 0+1 made significant modifications.

---

## Context

You are continuing work on **EuroTrip Planner**, a Next.js 15 App Router app (Vercel deployment) with 220 European city guides. Sprint 0+1 just completed:

- Removed NextAuth (now Supabase Auth only)
- Added SEO metadata, sitemap, robots.txt, JSON-LD to all pages
- Deleted duplicate/dead files (AttractionsListRefactored, CulinaryGuide, common/AuthButton, ui-components, empty regions page)
- Fixed 10 cities with contaminated data (now show "Guide Coming Soon")
- Fixed homepage bugs (dynamic month, correct stats, nav labels)
- Created data validation script

Key files you need to understand before starting:
- `src/components/city-guides/cityData.js` — **2,283-line hardcoded array of all 220 cities** (this is being replaced)
- `src/app/api/suggestions/route.js` — **mock API returning 5 hardcoded items** (this is being replaced)
- `src/app/page.js` — homepage with date selector and results grid
- `src/app/layout.js` — root layout (recently updated with metadata)
- `src/app/Providers.js` — context provider stack (NextAuth removed in Sprint 0+1)
- `public/data/manifest.json` — city registry with all 220 cities
- `public/data/{Country}/{city}/index.json` — consolidated city data
- `public/data/{Country}/{city}/{city}-visit-calendar.json` — seasonal scoring data
- `src/components/city-guides/CityPageClient.js` — main city page component
- `src/services/cityDataService.js` — city data fetching service
- `src/components/common/LazyComponents.js` — lazy loading wrappers

---

## TASK 1: Replace Hardcoded cityData.js with Build-Generated Data

### Problem

`src/components/city-guides/cityData.js` is a **2,283-line manually-maintained JavaScript file** containing a hardcoded array of all 220 cities with properties like name, country, thumbnail, coordinates, description, category tags, etc. This file:

- Adds ~100KB+ to the client bundle on every page that imports it
- Drifts out of sync with the actual JSON data files
- Is the #1 "this was AI-generated" smell in the codebase
- Makes adding/updating cities a manual process

### Solution

Replace it with a **build-time generated JSON file** derived from the existing data sources (`manifest.json` + city overview files).

### Step 1: Understand Current Usage

Before changing anything, **search the entire codebase for every import of `cityData`**:

```bash
grep -r "cityData\|city-data\|citydata" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -l
```

For each file that imports from `cityData.js`, document:
- What it imports (the default export? named exports? specific properties?)
- What properties of each city object it actually uses
- Whether it runs on the server or client

This tells us the exact shape of the replacement data.

Also check:
```bash
grep -r "from.*cityData\|require.*cityData" src/ --include="*.js" --include="*.jsx"
```

### Step 2: Analyze the Current City Object Shape

Read `cityData.js` and document the schema of each city object in the array. It likely looks something like:

```javascript
{
  id: 'paris',
  name: 'Paris',
  country: 'France',
  description: 'The City of Light...',
  thumbnail: '/images/cities/paris/thumbnail.jpg',
  coordinates: [2.3522, 48.8566],
  region: 'Western Europe',
  categories: ['romantic', 'cultural', 'food'],
  rating: 4.8,
  // ... other fields
}
```

Document every field and which consuming components use each field. Some fields may be unused.

### Step 3: Create the Build Script

Create `scripts/generateCityList.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Generates src/generated/cities.json from public/data/ sources.
 * 
 * Sources:
 *   - public/data/manifest.json (city registry)
 *   - public/data/{Country}/{city}/index.json (city overview data)
 *   - public/data/{Country}/{city}/{city}-visit-calendar.json (seasonal data)
 *
 * Output: src/generated/cities.json
 *   - Lightweight city list for client-side use (search, filtering, cards)
 *   - Should contain ONLY the fields needed by consuming components
 *   - Target: <30KB (vs ~100KB+ of current cityData.js)
 *
 * Run: node scripts/generateCityList.mjs
 * Runs automatically before build via package.json prebuild script.
 */
```

The script should:

1. Read `manifest.json` to get the list of all cities and their file paths.

2. For each city, read its `index.json` (or individual overview file as fallback) to extract:
   - City name (display name)
   - Country
   - Brief description (first ~120 chars for card display)
   - Coordinates (if available in the overview or attractions data)
   - Region classification (map from country using the existing `regionData.js` mapping)

3. **Preserve any fields from the current `cityData.js` that are used by consuming components** but NOT available in the JSON data files. For example, if `cityData.js` has `thumbnail` paths that don't exist in the JSON data, the build script needs to either:
   - Generate the thumbnail path from a consistent convention (e.g., `/images/cities/${cityId}/thumbnail.jpg`)
   - Or check if the thumbnail file actually exists on disk

4. **Preserve the categories/tags** from the current `cityData.js` if they're used for filtering and not available in the JSON data. If the tags only exist in `cityData.js`, extract them into a separate mapping file (`scripts/cityTags.json`) that the build script merges in. This is a bridge solution — eventually tags should come from the data files.

5. Write the output to `src/generated/cities.json`.

6. Also generate `src/generated/cityIndex.js` — a lightweight module that exports the data:
```javascript
// Auto-generated — do not edit manually
// Run: node scripts/generateCityList.mjs
import cities from './cities.json';
export default cities;
export const cityById = Object.fromEntries(cities.map(c => [c.id, c]));
export const cityCount = cities.length;
```

### Step 4: Add to Build Pipeline

In `package.json`, add:
```json
{
  "scripts": {
    "generate-cities": "node scripts/generateCityList.mjs",
    "prebuild": "npm run generate-cities && npm run validate-data",
    "predev": "npm run generate-cities"
  }
}
```

Also add `src/generated/` to `.gitignore` (generated files shouldn't be committed):
```
src/generated/
```

**Wait** — if this is deployed on Vercel, the `prebuild` script runs during the Vercel build, so the generated files will exist at build time even though they're not in git. Verify this works by:
1. Adding `src/generated/` to `.gitignore`
2. Running `npm run build` locally
3. Confirming the build succeeds and the generated files are used

If Vercel's build doesn't run `prebuild` automatically, add it to the build command in `vercel.json` or `package.json`:
```json
"build": "npm run generate-cities && next build"
```

### Step 5: Migrate All Consumers

For every file identified in Step 1 that imports from `cityData.js`:

1. Change the import from:
   ```javascript
   import { getCitiesData } from '../city-guides/cityData';
   // or
   import cityData from '../city-guides/cityData';
   ```
   To:
   ```javascript
   import cities from '@/generated/cityIndex';
   // or for specific lookups:
   import { cityById, cityCount } from '@/generated/cityIndex';
   ```

2. Adjust any property access if the generated schema uses different field names than the hardcoded array. **The field names should match** — if the old data used `city.name`, the generated data should too. Don't force consumers to change their access patterns unless necessary.

3. If any consumer was using a function export from `cityData.js` (like `getCitiesData()`), replicate that function in `cityIndex.js` or inline it.

### Step 6: Verify and Delete

1. Run `npm run build` — must succeed.
2. Run the app locally and verify:
   - City guides index page loads and shows all cities
   - Search/filtering works
   - City cards display correct names, descriptions, thumbnails, countries
   - Explore map shows all cities
   - Homepage featured sections work
3. Delete `src/components/city-guides/cityData.js`.
4. Run `npm run build` again — must still succeed.
5. Run a final grep to confirm no remaining references:
   ```bash
   grep -r "cityData" src/ --include="*.js" --include="*.jsx" -l
   ```
   (There may be legitimate references to "cityData" as a variable name in components that receive city data as props — that's fine. What matters is no import paths point to the deleted file.)

---

## TASK 2: Make the Suggestions API Real

### Problem

`src/app/api/suggestions/route.js` currently returns **5 hardcoded suggestions** with an **artificial 450ms delay**. The homepage date selector calls this API, but the dates have no effect on results. This means the core user flow — "pick dates → see best cities" — is fake.

### Solution

Replace the mock API with a real scoring engine that uses the visit calendar data to recommend the best cities for the user's selected dates.

### Step 1: Understand the Existing API

Read `src/app/api/suggestions/route.js` to understand:
- What query parameters it receives (likely `startDate`, `endDate`, or similar)
- What response shape it returns (the format consuming components expect)
- Which component calls it (likely in `src/app/page.js` — trace the fetch call)

Also read the consuming component to understand:
- How it passes dates to the API
- What fields of the response it renders
- How results are displayed (cards? grid? list?)

### Step 2: Understand the Visit Calendar Data

Read a sample visit calendar file (e.g., `public/data/France/paris/paris-visit-calendar.json`) to understand the scoring structure.

The calendar data has this structure (approximately):
```json
{
  "months": {
    "january": {
      "ranges": [
        {
          "days": [1,2,3,...,15],
          "score": 3,
          "crowdLevel": "Low",
          "travelerTypes": ["Budget", "Culture"],
          "event": null
        },
        {
          "days": [16,17,...,31],
          "score": 3,
          "crowdLevel": "Low",
          "travelerTypes": ["Budget"],
          "event": "Winter Sales End"
        }
      ]
    },
    // ... other months
  }
}
```

The `score` is 1-5 where 5 is "Excellent" and 1 is "Avoid".

### Step 3: Build the Scoring Engine

Create `src/lib/scoring/cityScorer.js`:

```javascript
/**
 * Scores cities based on visit calendar data for a given date range.
 * 
 * @param {string} startDate - ISO date string (e.g., "2026-04-15")
 * @param {string} endDate - ISO date string (e.g., "2026-04-25")
 * @param {Object} options - Optional filters
 * @param {string} options.travelerType - e.g., "Budget", "Couples", "Families"
 * @param {string} options.region - e.g., "Mediterranean", "Alpine"
 * @returns {Promise<Array<{cityId, cityName, country, score, avgScore, matchingDays, highlights, thumbnail}>>}
 */
```

The scoring logic should:

1. Take a date range and optional filters.

2. For each city that has a visit calendar file:
   a. Determine which months the date range spans.
   b. For each day in the range, find the matching range entry in the visit calendar.
   c. Calculate an average score across all days in the range.
   d. If a travelerType filter is set, boost cities where the matching ranges include that traveler type.
   e. Collect any special events that fall within the date range.

3. Sort cities by score (highest first).

4. Return the top N results (default 20) with:
   - City identification (id, name, country, thumbnail, coordinates)
   - Score details (average score, crowd level summary, matching traveler types)
   - Highlights (events happening during the date range)
   - A human-readable "why visit" blurb for these specific dates

**Performance consideration**: Reading 220 visit calendar files on every API request is expensive. There are several approaches:

- **Option A (simplest, recommended for now)**: Since this is an Edge/Serverless function, read the manifest to get city paths, then read visit calendar files. Cache the results using Next.js `unstable_cache` or a simple in-memory cache with a TTL. Visit calendar data changes very rarely (only on data regeneration), so a 24-hour cache is fine.

- **Option B (more performant, do later)**: Pre-compute a scoring index at build time — a single JSON file mapping `{month}_{half} → [{cityId, score, travelerTypes}]`. This would make the API a simple lookup instead of reading 220 files. This is the right long-term solution but more work.

Start with Option A. Add a TODO comment for Option B.

### Step 4: Rewrite the API Route

Replace the content of `src/app/api/suggestions/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { scoreCitiesForDates } from '@/lib/scoring/cityScorer';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const travelerType = searchParams.get('travelerType');
  const region = searchParams.get('region');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // Validate inputs
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate are required' },
      { status: 400 }
    );
  }

  // Validate date format
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO dates (YYYY-MM-DD).' },
      { status: 400 }
    );
  }

  if (end <= start) {
    return NextResponse.json(
      { error: 'endDate must be after startDate' },
      { status: 400 }
    );
  }

  try {
    const results = await scoreCitiesForDates({
      startDate: start,
      endDate: end,
      travelerType,
      region,
      limit,
    });

    return NextResponse.json({
      results,
      meta: {
        startDate,
        endDate,
        travelerType,
        totalScored: results.length,
      },
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
```

**Important**: Check whether this route is currently configured as an Edge function (`export const runtime = 'edge'`). If so, you'll need to change it to Node.js runtime (`export const runtime = 'nodejs'`) because Edge functions can't use `fs.readFile`. Alternatively, use `fetch` to read from the public data directory.

### Step 5: Update the Homepage to Use Real Results

Read `src/app/page.js` to find where it calls the suggestions API. Update the fetch call to pass the actual selected dates:

```javascript
// Find the existing fetch to /api/suggestions and update it
const response = await fetch(
  `/api/suggestions?startDate=${startDate}&endDate=${endDate}&limit=20`
);
```

Also update the results rendering to display the new fields from the real API:
- Show the score (e.g., as a badge: "⭐ 4.5/5 for your dates")
- Show why these dates are good (events, crowd level, weather summary)
- Show the traveler type match if relevant

If the current `ResultsGrid` and `ResultCard` components can't display the new fields, modify them. Keep the existing visual design but add:
- A score indicator (color-coded: green for 4-5, yellow for 3, gray for 1-2)
- A one-line "why" reason (e.g., "Cherry blossom season, moderate crowds" or "Summer festival + warm weather")
- The crowd level (e.g., "Low crowds" / "Moderate" / "Peak season")

### Step 6: Handle the No-Dates State

Currently, the homepage shows curated city sections when no dates are selected. This is good — keep it. The suggestions API should only be called when the user has actually selected dates. Make sure:

- Before dates are selected: show the existing curated sections (featured cities, regional highlights)
- After dates are selected: show the scored results from the API
- While loading: show skeleton cards (use existing `CityCardSkeleton`)
- If the API fails: show a friendly error message and fall back to the curated sections

### Step 7: Remove the Artificial Delay

If the old mock API had a `setTimeout` or artificial delay, make sure it's gone.

---

## TASK 3: Add Persistent Global Navigation

### Problem

There's no consistent navigation across pages. The homepage has a header, city guide pages have breadcrumbs, but users can't reliably navigate between sections. This makes the app feel like disconnected pages rather than a cohesive product.

### Solution

Create a persistent top navigation bar used across all pages.

### Step 1: Audit Current Navigation

Read these files to understand what navigation currently exists:
- `src/app/layout.js` — does it render any header/nav?
- `src/app/page.js` — what does the homepage header look like?
- `src/components/city-guides/CityPageClient.js` — what navigation exists on city pages?
- `src/app/city-guides/page.js` — city guides index navigation?
- `src/app/explore/page.js` — explore page navigation?

Document: what's consistent, what's different per page, what's missing.

### Step 2: Design the Nav Component

Create `src/components/common/Navbar.js` (or `.jsx`):

**Requirements:**
- Fixed/sticky at the top of every page
- Contains: Logo (links to `/`), main nav links, auth button
- Mobile responsive: hamburger menu on small screens
- Visually consistent with the existing design language (look at the current homepage header for font, colors, spacing cues)
- Doesn't duplicate navigation that already exists on specific pages

**Nav links:**
| Label | Path | Notes |
|-------|------|-------|
| City Guides | `/city-guides` | Main content section |
| Explore | `/explore` | Interactive map |
| Plan Trip | `/start-planning` | Entry point for trip planning |
| My Trips | `/saved-trips` | Only show when authenticated (use `useAuth()` from AuthContext) |

**Auth section** (right side):
- Signed out: "Sign In" button
- Signed in: User avatar/initial + dropdown with "My Trips" and "Sign Out"

Use the existing `useAuth()` hook from `src/contexts/AuthContext.js` for auth state. Use the existing UI primitives from `src/components/common/UILibrary.js` where possible.

**Styling approach:**
- Use Tailwind classes consistent with the existing design
- Look at the current homepage header font (`DM Sans` or `EB Garamond` — check `src/app/fonts.js`)
- Match the blue accent color used throughout the app (look for the hex code in `tailwind.config.mjs` or `globals.css`)
- White/light background with subtle bottom border
- Z-index high enough to float over page content

**Mobile:**
- Below `md` breakpoint: collapse nav links into a hamburger menu
- Use Headless UI `Disclosure` or `Popover` for the mobile menu (already a dependency)
- Auth button stays visible even on mobile (don't hide it in the hamburger)

### Step 3: Integrate into Root Layout

Add the Navbar to `src/app/layout.js` so it appears on every page:

```javascript
import Navbar from '@/components/common/Navbar';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

**Critical consideration**: The Navbar uses `useAuth()` which requires the `AuthProvider` context. Make sure the Navbar is rendered INSIDE the `<Providers>` wrapper. Check `Providers.js` to see how the context stack is structured.

**If the Navbar is a client component** (it will be, because of `useAuth()`), that's fine — it can be a client component inside a server layout. Just add `"use client"` to the Navbar file.

### Step 4: Remove Per-Page Navigation That's Now Redundant

After adding the global nav:

1. **Homepage** (`src/app/page.js`): Remove the page-specific header/nav that duplicates global nav links. Keep any hero-specific content but remove the top bar with "Get Itinerary", "City Guides", "Explore", "Countries" buttons if they duplicate the Navbar.

2. **City guides pages**: Keep breadcrumbs (they show context like "Home > City Guides > Paris") but remove any standalone nav elements that duplicate the global nav.

3. **Other pages**: Check each page for redundant navigation and remove it.

**Be careful**: Don't remove the tab navigation on city guide pages (Start Here, Best Time, Interactive Map, etc.) — that's content navigation within a page, not site navigation.

### Step 5: Adjust Page Padding

Adding a fixed navbar means page content needs top padding so it's not hidden behind the nav. Check each page:

- If the Navbar is `fixed` or `sticky`, add appropriate `padding-top` or `margin-top` to the `<main>` element in the layout (or to the Navbar's wrapper using a spacer).
- If pages have full-bleed hero images (like city guide pages), the hero should extend behind the navbar with the content starting below it, OR the navbar should become transparent on hero sections.

The simplest approach: make the Navbar `sticky top-0` (not `fixed`) and let it take up normal flow space. This avoids padding issues entirely. The tradeoff is it scrolls out of view — but that's actually fine for a content-heavy site. If you want it always visible, use `fixed top-0` and add `pt-16` (or whatever the navbar height is) to the `<main>`.

Look at how the current homepage header handles this and be consistent.

### Step 6: Active State

The current page's nav link should be visually highlighted. Use `usePathname()` from `next/navigation`:

```javascript
'use client';
import { usePathname } from 'next/navigation';

function NavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  
  return (
    <Link 
      href={href}
      className={`${isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
    >
      {children}
    </Link>
  );
}
```

---

## TASK 4: Add TypeScript Interfaces for Data Schemas

### Problem

The complex JSON data schemas (city data, visit calendar, attractions, etc.) have zero type definitions. This means:
- No autocomplete when working with city data
- No compile-time error checking for typos in property access
- New developers (or AI tools) have to read JSON files to understand the data shape
- Refactoring is risky because there's no type checker to catch breaks

### Solution

Add TypeScript interface definitions for the core data schemas. We're NOT converting the whole codebase to TypeScript in this sprint — just adding type definitions that can be incrementally adopted.

### Step 1: Create Type Definition Files

Create `src/types/city.ts`:

```typescript
/**
 * Core city data types for EuroTrip Planner.
 * 
 * These types describe the shape of data in public/data/{Country}/{city}/ JSON files.
 * They are the source of truth for what city data looks like throughout the application.
 */

/** Lightweight city entry used in listings, search, and cards */
export interface CityListItem {
  id: string;                    // URL slug: "paris", "barcelona"
  name: string;                  // Display name: "Paris", "Barcelona"
  country: string;               // "France", "Spain"
  description: string;           // Brief description (~120 chars)
  thumbnail: string;             // Path to thumbnail image
  coordinates: [number, number] | null;  // [longitude, latitude] or null
  region: string;                // "Mediterranean", "Alpine", etc.
  categories: string[];          // ["romantic", "cultural", "food"]
}

/** Full city data object (from index.json) */
export interface CityData {
  cityName: string;
  country: string;
  overview: CityOverview | null;
  attractions: { sites: Attraction[] } | null;
  neighborhoods: { neighborhoods: Neighborhood[] } | null;
  culinaryGuide: CulinaryGuide | null;
  connections: TransportConnections | null;
  seasonalActivities: SeasonalActivities | null;
  monthlyEvents: Record<string, MonthlyData> | null;
  visitCalendar: VisitCalendar | null;
  experiences: Experience[] | null;
  summary: CitySummary | null;
}
```

Now, **read the actual JSON data files** to define the sub-types accurately. Don't guess — read these files:

- A city overview file (e.g., `public/data/France/paris/paris-overview.json`) → define `CityOverview`
- An attractions file (e.g., `public/data/France/paris/paris_attractions.json`) → define `Attraction`
- A neighborhoods file → define `Neighborhood`
- A culinary guide file → define `CulinaryGuide`
- A connections file → define `TransportConnections`
- A seasonal activities file → define `SeasonalActivities`
- A monthly file (e.g., `public/data/France/paris/monthly/january.json`) → define `MonthlyData`
- A visit calendar file → define `VisitCalendar`, `VisitCalendarMonth`, `VisitCalendarRange`
- The Paris experiences file (`paris-experiences.json`) → define `Experience`, `ExperienceScores`

For each sub-type, document every field you find in the actual JSON. Mark optional fields with `?` where they're not present in all cities. Include JSDoc comments explaining non-obvious fields.

### Step 2: Create API Response Types

Create `src/types/api.ts`:

```typescript
/** Response from /api/suggestions */
export interface SuggestionsResponse {
  results: ScoredCity[];
  meta: {
    startDate: string;
    endDate: string;
    travelerType: string | null;
    totalScored: number;
  };
}

export interface ScoredCity {
  cityId: string;
  cityName: string;
  country: string;
  score: number;           // Average visit calendar score (1-5)
  avgScore: number;        // Normalized score for display
  crowdLevel: string;      // Summary crowd level for the date range
  travelerTypes: string[]; // Matching traveler types
  highlights: string[];    // Events or special items during date range
  thumbnail: string;
  coordinates: [number, number] | null;
  reason: string;          // Human-readable "why visit during these dates"
}
```

### Step 3: Export and Document

Create `src/types/index.ts` as a barrel export:

```typescript
export type * from './city';
export type * from './api';
```

Add a brief README at `src/types/README.md`:

```markdown
# Type Definitions

TypeScript interfaces for EuroTrip Planner data schemas.

These types describe the shape of:
- City data from `public/data/` JSON files
- API request/response shapes
- Component prop types (to be added incrementally)

## Usage

```typescript
import type { CityData, Attraction, VisitCalendar } from '@/types';
```

Even in .js files, these types provide autocomplete via JSDoc:
```javascript
/** @type {import('@/types').CityData} */
const cityData = await getCityData(city);
```

## Updating

When the JSON data schema changes, update these types to match.
Run the data validation script to check consistency:
```bash
npm run validate-data
```
```

### Step 4: Verify JSDoc Compatibility

Since the codebase is mostly JavaScript, verify that the types work via JSDoc annotations. In one key file (e.g., `src/app/city-guides/[city]/page.js` or wherever `getCityData` is called), add a JSDoc type annotation:

```javascript
/** @type {import('@/types').CityData | null} */
const cityData = await getCityData(decodedCity);
```

If you're using VS Code / Cursor, this should immediately provide autocomplete for `cityData.overview.brief_description` etc. Verify this works.

---

## TASK 5: Quick Wins While You're In Here

These are small fixes that are easy to do now and improve overall quality.

### 5.1: Fix City Coordinates Fallback

Read `CityPageClient.js` and find the `CITY_COORDINATES` object (reportedly hardcoded for ~20 cities). Currently, cities not in this list fall back to central Europe coordinates `[9.19, 48.66]` which is wrong for most cities.

**Fix**: Instead of a hardcoded lookup, extract coordinates from the city data that's already loaded. The attractions data often has lat/lon for individual sites — you can average those, or the overview data may have city-level coordinates. Trace through the data to find where coordinates are available and use them.

If coordinates truly aren't available in the data for some cities, at minimum extract them from the `cityData.js` before you delete it (save them into the generated cities.json).

### 5.2: Add OG Images to City Page Metadata

In Sprint 0+1, the city page metadata was added without OG images because the image path pattern wasn't confirmed. Now that you've read the codebase more thoroughly:

1. Look at how the `Hero` component resolves images for each city. What's the image path pattern?
2. If there's a reliable pattern (e.g., CloudFront URL + city slug), add it to the `generateMetadata` function in `src/app/city-guides/[city]/page.js`.
3. If hero images aren't reliably available for all 220 cities, add the image only when it exists (check with `fs.existsSync` or similar at build time).

---

## VERIFICATION

After completing all tasks:

### Build Check
```bash
npm run build
```
Must succeed with zero errors.

### Functional Testing

1. **Generated city data**: 
   - Run `npm run generate-cities` 
   - Check `src/generated/cities.json` exists and contains 220 cities
   - Verify first and last city have correct data

2. **City guides index**: Visit `/city-guides`, verify all cities load, search works, filtering works, region tags display correctly.

3. **Homepage flow**:
   - Visit `/` — curated sections should appear
   - Select dates (try a week in April) — API should return scored results
   - Results should show score, crowd level, and reason
   - Try different date ranges and verify results change

4. **Navigation**:
   - Navbar visible on homepage, city guides, explore, individual city pages
   - Active state highlights correctly
   - Mobile: hamburger menu works
   - Auth button shows correct state (signed in vs. signed out)
   - Links work and go to correct pages

5. **City page coordinates**: Visit a city that previously had fallback coordinates (not Paris/London/Barcelona — try something like Porto or Dubrovnik). Check if the map centers correctly.

### Performance Check
Compare the production bundle size before and after the `cityData.js` replacement:
```bash
# If bundle analyzer is configured:
ANALYZE=true npm run build
# Otherwise just note the build output sizes
```

The city guides index page and homepage should show reduced JS bundle sizes.

### Report

Create `SPRINT_2_REPORT.md` in the project root:
- Summary of each task (what changed, key decisions made)
- Bundle size comparison (before/after cityData.js replacement)
- Number of cities with coordinates vs. fallback (from Task 5.1)
- Any issues encountered or deferred items
- Suggested focus for Sprint 3