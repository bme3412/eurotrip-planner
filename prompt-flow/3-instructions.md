This covers Sprint 0 + Sprint 1 combined — the foundation fixes and SEO. Here's how to use it:
Part 1 (the critical fixes) should take Cursor 30-60 minutes of execution. The auth consolidation (Task 1.5) is the trickiest — if Cursor struggles with it, you can tell it to skip that task and we'll make a dedicated prompt for it.
Part 2 (SEO) is more mechanical and Cursor should handle it cleanly. The payoff is enormous — 220 city pages with unique metadata, a sitemap, structured data, and proper OG tags.
After this sprint ships, come back with the SPRINT_0_1_REPORT.md and we'll build the Sprint 2 prompt (architecture cleanup: replacing cityData.js with generated data, adding TypeScript interfaces, making the suggestions API real, and adding persistent navigation). That sprint is where the app starts feeling like a product rather than a content site.
One heads-up: rotate your API keys manually before or right after running this. Cursor can't do that for you — you'll need to hit the Supabase dashboard, OpenAI platform, and Mapbox to regenerate keys and update .env.local.

EuroTrip Planner — Sprint 0+1: Foundation & Discoverability

This sprint combines critical hygiene fixes (Sprint 0) with SEO implementation (Sprint 1).
These are the highest-leverage changes possible — they fix active problems and unlock organic growth.
Paste this entire prompt into Cursor with the codebase open.


Context for the AI
You are working on EuroTrip Planner, a Next.js 15 App Router application deployed on Vercel at eurotrip-planner.vercel.app. It's a Europe travel planning site with 220 city guides, interactive maps, seasonal visit calendars, and a Paris-specific itinerary planner.
A full codebase audit has been completed. This sprint addresses the most critical findings. Read the full codebase first before making any changes — many files reference each other and changes need to be coordinated.
The project structure you need to know:

public/data/{Country}/{city}/ — 220 city data directories with JSON files
public/data/manifest.json — city registry
src/app/ — Next.js App Router pages
src/app/city-guides/[city]/page.js — dynamic city guide (server component, SSG)
src/app/page.js — homepage (client component)
src/app/layout.js — root layout
src/app/Providers.js — context provider stack (wraps NextAuth + Supabase Auth)
src/components/city-guides/cityData.js — 2,283-line hardcoded city array
src/components/city-guides/CityPageClient.js — main city page client component
src/contexts/AuthContext.js — Supabase Auth
src/app/api/auth/[...nextauth]/route.js — NextAuth config


PART 1: CRITICAL FIXES (Sprint 0)
Complete ALL of Part 1 before starting Part 2. These fix active bugs, security issues, and broken content.

Task 1.1: Audit and Rotate API Keys
Check if .env.local or any .env file has ever been committed to git:
bashgit log --all --full-history -- ".env*"
git log --all --full-history -- "*.env"
Report what you find. If any env files appear in git history, flag this prominently — the keys need to be rotated externally (I'll do that manually), and we may need to scrub git history with BFG Repo-Cleaner.
Regardless of git history, verify that .gitignore includes:
.env
.env.local
.env.*.local
Create .env.example in the project root (if it doesn't exist) with placeholder values for every environment variable the app uses. Read through all files that reference process.env to build the complete list. Format:
env# Required
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here

# Optional
NEXT_PUBLIC_CDN_URL=https://your-cdn-domain.cloudfront.net
Add a comment at the top of .env.example:
# Copy this file to .env.local and fill in real values
# NEVER commit .env.local to version control
# If you need to rotate keys: [list the dashboards - Supabase, OpenAI, Mapbox]

Task 1.2: Fix Data Contamination
Problem: Multiple cities have files named tirana_*.json and tirana-*.json instead of their actual city name, meaning they contain Tirana's data instead of their own.
Step 1: Run a scan and report every file outside of the Tirana directory that contains "tirana" in its filename:
bashfind public/data -name "*tirana*" ! -path "*/tirana/*" ! -path "*/Tirana/*"
Step 2: For each contaminated city found, report:

The city name and country
Which files are affected
Whether any correctly-named files also exist for that city

Step 3: For each contaminated city, delete the tirana-named files. Do NOT try to rename them (the content inside is Tirana data, not the correct city's data). These cities will need their data regenerated separately.
Step 4: Check that the city guide page for each affected city handles missing data gracefully. Look at the getCityData() function in src/app/city-guides/[city]/page.js and trace what happens when individual data files are missing. If the page would crash or show broken UI, add a fallback that shows a "Guide coming soon" message for cities with incomplete data.
Step 5: Create a data validation script at scripts/validateCityData.mjs that can be run as part of the build process:
javascript#!/usr/bin/env node
/**
 * Validates city data integrity:
 * 1. Every city directory has files named after the city (not another city)
 * 2. Every city has at minimum an overview file
 * 3. No cross-contamination between cities
 * 4. File naming matches directory naming
 * 
 * Run: node scripts/validateCityData.mjs
 * Exit code 1 if any issues found.
 */
The script should:

Walk every city directory in public/data/
For each city, verify that data files are named after that city (not "tirana" or any other city)
Check that at minimum an overview file exists
Check that index.json exists (or can be generated)
Print a summary: X cities valid, Y cities with issues, list of specific issues
Exit with code 1 if any issues found (so it can be used in CI)

Add this script to package.json scripts:
json"validate-data": "node scripts/validateCityData.mjs"

Task 1.3: Delete Dead and Duplicate Files
Read each file first to confirm it's truly unused before deleting. Check all imports across the codebase.
Files to evaluate for deletion:

src/app/regions/page.js — reported as empty file. Verify it's empty. If so, delete it.
launch_PLAN.md — reported as duplicate of MONETIZATION_PLAN.md. Diff the two files. If identical (or near-identical), delete launch_PLAN.md.
src/components/city-guides/AttractionsListRefactored.js — search the entire codebase for imports of this file. If nothing imports it, delete it. If it IS imported somewhere, check whether AttractionsList.js is also still imported. If both are imported in different places, flag this for manual review.
src/components/common/AuthButton.jsx vs src/components/auth/AuthButton.js — search for all imports of each. Determine which one is actually used. Delete the unused one. If both are used in different places, consolidate: keep the more complete version, update all imports to point to it, delete the other.
src/components/city-guides/CulinaryGuide.js vs src/components/city-guides/FoodDrinkGuide.js — same process: search imports, determine which is used, consolidate or delete the unused one.
src/components/common/UILibrary.js vs src/components/common/ui-components.js — search imports for both. If one is the primary and the other is barely used, consolidate. If they have different exports that are both widely used, merge them into a single file.

For each deletion, do a final grep across the codebase to make sure no dynamic imports, lazy loads, or string-based references exist:
bashgrep -r "filename-without-extension" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
Report a summary of what was deleted and what was kept (with reasoning).

Task 1.4: Fix Homepage Bugs
All changes in src/app/page.js:

Hardcoded "September": Find where "September" is hardcoded in section headers (reportedly around line 192). Replace with dynamic current month:

javascriptconst currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
Use currentMonth wherever "September" was hardcoded. Make sure this doesn't break SSR/SSG — if this page is statically generated, you may need to make the month dynamic on the client side or use ISR.

Footer city count: Find "125+ European Cities" or similar outdated count. Update to "220+ European Cities" (or better, derive the count from the actual data source so it stays accurate).
"Countries" button mislabel: Find the nav button labeled "Countries" that opens SampleItineraryPreview instead of navigating to a countries page. Either:

Rename the button to match what it actually does (e.g., "Sample Itineraries" or "Trip Ideas"), OR
Change it to link to /city-guides with a country filter pre-selected


Footer placeholder links: Find all href="#" links in the footer. For now, either:

Remove the links entirely if the pages don't exist
Or change them to meaningful paths: Privacy Policy → /privacy, Terms → /terms, etc. (we'll create those pages later)




Task 1.5: Remove NextAuth (Consolidate on Supabase Auth)
This is the most complex task in Part 1. Read all auth-related files before making changes.
The app currently initializes BOTH NextAuth and Supabase Auth. We're keeping Supabase Auth and removing NextAuth.
Step 1: Map the current auth landscape. Read and report on:

src/app/Providers.js — what providers are wrapped?
src/app/api/auth/[...nextauth]/route.js — what's the NextAuth config?
src/contexts/AuthContext.js — what's the Supabase Auth config?
src/components/auth/AuthButton.js — which auth system does it use?
src/components/common/AuthButton.jsx — which auth system does it use?
Any other file that imports from next-auth or uses useSession from NextAuth
Any file that imports from @supabase/auth-helpers-nextjs or uses the Supabase auth context

Step 2: Search for ALL NextAuth usage:
bashgrep -r "next-auth\|useSession\|SessionProvider\|getServerSession\|NextAuth" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -l
Step 3: For each file that uses NextAuth:

If it uses useSession(), replace with the Supabase auth equivalent from AuthContext.js
If it uses signIn() from next-auth, replace with Supabase Auth signInWithOAuth or signInWithPassword
If it uses signOut() from next-auth, replace with Supabase signOut()
If it uses SessionProvider, remove it from the provider stack

Step 4: Remove NextAuth infrastructure:

Delete src/app/api/auth/[...nextauth]/route.js
Remove SessionProvider from src/app/Providers.js
Remove next-auth from package.json dependencies

Step 5: Verify the Supabase Auth flow works:

Check that src/app/auth/callback/route.js handles OAuth callbacks correctly
Check that the auth error page still works
Check that SaveToTrips.js still functions (it uses auth state)
Check that the trips API routes still work with auth

Step 6: Run a build to verify no import errors:
bashnpm run build
Fix any build errors that arise from the removal.

PART 2: SEO & DISCOVERABILITY (Sprint 1)
This is the single highest-ROI improvement. With 220 unique city pages, proper SEO could drive thousands of monthly organic visitors.

Task 2.1: Add Dynamic Metadata to City Guide Pages
File: src/app/city-guides/[city]/page.js
This is a server component that uses generateStaticParams. Add a generateMetadata export that creates unique, descriptive metadata for each city.
Read the existing getCityData() function to understand what data is available. Then add:
javascriptexport async function generateMetadata({ params }) {
  const { city } = await params;
  const decodedCity = decodeURIComponent(city);
  const cityData = await getCityData(decodedCity);
  
  if (!cityData || !cityData.cityName) {
    return {
      title: 'City Guide | EuroTrip Planner',
      description: 'Explore European cities with personalized travel guides.',
    };
  }

  const cityName = cityData.cityName;
  const country = cityData.country || '';
  const description = cityData.overview?.brief_description 
    || `Complete travel guide for ${cityName}, ${country}. Best time to visit, things to do, food & drink, neighborhoods, and insider tips.`;
  
  // Truncate description to ~155 chars for Google
  const metaDescription = description.length > 155 
    ? description.substring(0, 152) + '...' 
    : description;

  const title = `${cityName}, ${country} — Travel Guide & Best Time to Visit | EuroTrip`;

  return {
    title,
    description: metaDescription,
    openGraph: {
      title: `${cityName} Travel Guide — Things to Do & When to Visit`,
      description: metaDescription,
      type: 'article',
      url: `https://eurotrip-planner.vercel.app/city-guides/${city}`,
      siteName: 'EuroTrip Planner',
      // If hero images are available via a predictable URL pattern, add:
      // images: [{ url: `https://eurotrip-planner.vercel.app/images/cities/${city}/hero.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cityName}, ${country} — Travel Guide`,
      description: metaDescription,
    },
    alternates: {
      canonical: `https://eurotrip-planner.vercel.app/city-guides/${city}`,
    },
  };
}
Important: Check how getCityData works — if it uses fs.readFile, it should work fine in generateMetadata since it runs server-side. If there are any issues, trace through the function and fix them.
Also check if there's a reliable way to get the city's hero image URL. Look at how the Hero component resolves images. If there's a predictable pattern (e.g., /images/cities/{city}/hero.jpg), add it to the OpenGraph images array. This is critical for social sharing — a shared link without an image gets dramatically less engagement.

Task 2.2: Add Metadata to Other Key Pages
File: src/app/city-guides/page.js (City Guides index)
Add:
javascriptexport const metadata = {
  title: 'City Guides — 220+ European Destinations | EuroTrip Planner',
  description: 'Explore comprehensive travel guides for 220+ European cities. Find the best time to visit, top attractions, food & drink guides, neighborhood tips, and more.',
  openGraph: {
    title: 'European City Guides — 220+ Destinations',
    description: 'Comprehensive travel guides for 220+ European cities with seasonal advice, attraction maps, and insider tips.',
    url: 'https://eurotrip-planner.vercel.app/city-guides',
    siteName: 'EuroTrip Planner',
  },
  alternates: {
    canonical: 'https://eurotrip-planner.vercel.app/city-guides',
  },
};
Note: This page is currently a client component ("use client"). The metadata export only works in server components. You have two options:

Option A (preferred): Extract the metadata to a separate server component wrapper. Create the page as a server component that exports metadata and renders a client component for the interactive parts.
Option B: Use generateMetadata in a parent layout file (src/app/city-guides/layout.js).

Implement whichever approach is cleaner given the current code structure.
File: src/app/explore/page.js
Same pattern — add appropriate metadata for the explore/map page.
File: src/app/page.js (Homepage)
This is a client component. Check if src/app/layout.js has generic metadata. If so, we need the homepage to have its own specific metadata. Use the layout approach or a wrapper:
javascript// If using layout.js for root metadata:
export const metadata = {
  title: 'EuroTrip Planner — Discover Europe Your Way',
  description: 'Plan your perfect European trip with personalized city recommendations, real-time seasonal insights, interactive maps, and detailed guides for 220+ destinations.',
  openGraph: {
    title: 'EuroTrip Planner — Discover Europe Your Way',
    description: 'Personalized European trip planning with seasonal insights, city guides, and interactive maps for 220+ destinations.',
    url: 'https://eurotrip-planner.vercel.app',
    siteName: 'EuroTrip Planner',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EuroTrip Planner — Discover Europe Your Way',
    description: 'Plan your perfect European trip with personalized recommendations for 220+ cities.',
  },
};

Task 2.3: Create Sitemap
Create src/app/sitemap.js (Next.js App Router convention for dynamic sitemaps):
javascriptimport fs from 'fs';
import path from 'path';

export default async function sitemap() {
  const baseUrl = 'https://eurotrip-planner.vercel.app';
  
  // Read manifest to get all cities
  let cities = [];
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    cities = Object.keys(manifest.cities || {});
  } catch (e) {
    console.error('Failed to read manifest for sitemap:', e);
  }

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/city-guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/start-planning`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  // Dynamic city pages
  const cityPages = cities.map(city => ({
    url: `${baseUrl}/city-guides/${city}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages];
}
Verify this works by running npm run build and checking that the sitemap is generated. In Next.js App Router, src/app/sitemap.js automatically serves at /sitemap.xml.

Task 2.4: Create robots.txt
Create src/app/robots.js (Next.js App Router convention):
javascriptexport default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/preview/', '/auth/'],
      },
    ],
    sitemap: 'https://eurotrip-planner.vercel.app/sitemap.xml',
  };
}
This tells search engines:

Index everything except API routes, preview themes, and auth pages
Here's where the sitemap lives


Task 2.5: Add JSON-LD Structured Data to City Pages
This is what makes city pages eligible for rich results in Google (enhanced search listings with ratings, images, etc.).
In the city guide page component (or in CityPageClient.js if it needs to be client-side), add structured data:
javascript// Add this as a <script> tag in the page head or as a component
function CityJsonLd({ cityData, citySlug }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: cityData.cityName,
    description: cityData.overview?.brief_description,
    url: `https://eurotrip-planner.vercel.app/city-guides/${citySlug}`,
    touristType: ['Adventure', 'Cultural', 'Luxury', 'Budget'],
    geo: cityData.coordinates ? {
      '@type': 'GeoCoordinates',
      latitude: cityData.coordinates[1],
      longitude: cityData.coordinates[0],
    } : undefined,
    containedInPlace: {
      '@type': 'Country',
      name: cityData.country,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
Place this component inside the city page so it renders in the HTML. If the page is server-rendered (which it should be for SEO), this will be in the initial HTML that Google crawls.

Task 2.6: Update Root Layout Metadata
File: src/app/layout.js
The root layout currently has a single generic title and description used as defaults. Update it to be a proper default that gets overridden by page-specific metadata:
javascriptexport const metadata = {
  metadataBase: new URL('https://eurotrip-planner.vercel.app'),
  title: {
    default: 'EuroTrip Planner — Discover Europe Your Way',
    template: '%s | EuroTrip Planner', // Pages can set just the page-specific part
  },
  description: 'Plan your perfect European trip with personalized city recommendations and detailed guides for 220+ destinations.',
  openGraph: {
    siteName: 'EuroTrip Planner',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};
The title.template pattern means city pages can set title: 'Paris, France — Travel Guide' and it automatically becomes 'Paris, France — Travel Guide | EuroTrip Planner'.
If you use the template approach, update the city page generateMetadata to return just the page-specific title (without "| EuroTrip" since the template adds it).

PART 3: VERIFICATION
After completing all tasks, run the following verification steps:
Build Check
bashnpm run build
The build must succeed with zero errors. Warnings are acceptable but note them.
Data Validation
bashnode scripts/validateCityData.mjs
Should report the contaminated cities as issues (since we deleted their bad files) and all other cities as valid.
SEO Verification
After deploying (or running locally with npm run start):

Visit /sitemap.xml — should return valid XML with 220+ city URLs
Visit /robots.txt — should return valid robots rules
Visit any city page, view source, and verify:

<title> contains the city name (not the generic default)
<meta name="description"> contains city-specific text
<meta property="og:title"> exists
<script type="application/ld+json"> contains TouristDestination data


Visit the homepage, view source, verify homepage-specific metadata

Auth Verification

Sign in with Google — should work via Supabase Auth
Save a city to trips — should persist
Sign out and sign back in — saved trips should still be there
Verify no console errors related to NextAuth or session

Report
After all tasks are complete, create a brief SPRINT_0_1_REPORT.md in the project root summarizing:

What was fixed/changed (with file paths)
What was deleted (with reasoning)
Any issues encountered
Any items that need manual follow-up (e.g., key rotation, data regeneration for contaminated cities)
Build output (any warnings?)


Important Principles

Don't refactor beyond scope. If you see other issues while working, note them in the report but don't fix them now. This sprint is about foundation, not polish.
Test after each major task, not just at the end. Run npm run build after removing NextAuth, after adding metadata, etc.
Preserve existing functionality. Nothing that currently works should break. If removing NextAuth would break a feature, find the Supabase Auth equivalent first.
When in doubt, leave it. If a file deletion seems risky, keep the file and flag it in the report. We can clean it up later.
Commit frequently. After each numbered task (1.1, 1.2, etc.), make a commit with a descriptive message. This makes it easy to revert individual changes if something breaks.