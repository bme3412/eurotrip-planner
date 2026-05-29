import { notFound } from "next/navigation";
import { cache } from "react";
import fsPromises from "fs/promises";
import path from "path";
import CityPageClient from "@/components/city-guides/CityPageClient";
import TripDatesBanner from "@/components/common/TripDatesBanner";

// ISR: Revalidate city pages every 24 hours
export const revalidate = 86400;

// Function to capitalize the first letter of each word
const capitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// This file provides server-side data loading and passes it to the client UI component.

// Module-level manifest cache (persists across SSR requests in same process)
let manifestCache = null;

// Helper to check if a file path exists
async function pathExists(filePath) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Cached manifest loader - avoids re-reading manifest on every request
const getManifest = cache(async function getManifest() {
  if (manifestCache) return manifestCache;

  const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json');
  try {
    const fileContent = await fsPromises.readFile(manifestPath, "utf8");
    manifestCache = JSON.parse(fileContent);
    return manifestCache;
  } catch (error) {
    console.error(`Error reading manifest.json:`, error);
    return null;
  }
});

export async function generateStaticParams() {
  const manifest = await getManifest();
  if (!manifest || !manifest.cities) {
    console.error('No manifest or cities found, returning empty array');
    return [];
  }

  return Object.keys(manifest.cities).map((cityName) => ({
    city: cityName.toLowerCase(),
  }));
}

export async function generateMetadata({ params }) {
  const { city } = await params;
  const decodedCity = decodeURIComponent(city);
  const cityData = await getCityData(decodedCity);

  if (!cityData || !cityData.cityName) {
    return {
      title: 'City Guide',
      description: 'Explore European cities with personalized travel guides.',
    };
  }

  const cityName = cityData.cityName;
  const country = cityData.country || '';
  const rawDescription = cityData.overview?.brief_description
    || `Complete travel guide for ${cityName}, ${country}. Best time to visit, things to do, food & drink, neighborhoods, and insider tips.`;

  // Truncate description to ~155 chars for Google
  const metaDescription = rawDescription.length > 155
    ? rawDescription.substring(0, 152) + '...'
    : rawDescription;

  // Try to find an OG image for this city. Prefer the new per-city layout,
  // fall back to the legacy split trees.
  const ogImageCandidates = [
    `/images/cities/${country}/${city}/hero.jpeg`,
    `/images/cities/${country}/${city}/thumbnail.jpeg`,
    `/images/city-page/${country}/${city}-hero.jpeg`,
    `/images/city-thumbnail/${country}/${city}-thumbnail.jpeg`,
  ];
  // Check all candidates in parallel, then pick the first existing one in
  // priority order (avoids sequential fs round-trips during SSR).
  const candidateExists = await Promise.all(
    ogImageCandidates.map((candidate) =>
      pathExists(path.join(process.cwd(), 'public', candidate))
    )
  );
  const firstMatch = ogImageCandidates.find((_, i) => candidateExists[i]);
  const ogImage = firstMatch
    ? `https://eurotrip-planner.vercel.app${firstMatch}`
    : null;

  return {
    title: `${cityName}, ${country} — Travel Guide & Best Time to Visit`,  // template appends " | EuroTrip Planner"
    description: metaDescription,
    openGraph: {
      title: `${cityName} Travel Guide — Things to Do & When to Visit`,
      description: metaDescription,
      type: 'article',
      url: `https://eurotrip-planner.vercel.app/city-guides/${city}`,
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630, alt: `${cityName}, ${country}` }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cityName}, ${country} — Travel Guide`,
      description: metaDescription,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: `https://eurotrip-planner.vercel.app/city-guides/${city}`,
    },
  };
}

// Detects whether a consolidated index.json carries any real guide content.
// Used to distinguish legacy cities that have full sections but a null
// `overview` (which must still render) from genuinely-empty stub folders
// (which should show the "Coming Soon" placeholder).
function indexHasContent(idx) {
  if (!idx) return false;
  const sites = idx.attractions?.sites;
  if (Array.isArray(sites) && sites.length > 0) return true;
  const neighborhoods = idx.neighborhoods?.neighborhoods;
  if (Array.isArray(neighborhoods) && neighborhoods.length > 0) return true;
  if (idx.culinaryGuide && Object.keys(idx.culinaryGuide).length > 0) return true;
  if (idx.monthly && Object.keys(idx.monthly).length > 0) return true;
  return false;
}

// Loads only the lightweight "overview" shell needed for SSR (hero, header,
// breadcrumbs, metadata and structured data). All heavy sections are fetched
// client-side per tab from `/data/{country}/{slug}/sections/*.json`, so the
// server intentionally ships only `{ cityName, country, overview, hasContent }`.
const getCityData = cache(async function getCityData(cityName) {
  const manifest = await getManifest();
  if (!manifest?.cities) {
    console.error('No manifest or cities found');
    return null;
  }

  const cityMeta = manifest.cities[cityName.toLowerCase()];
  if (!cityMeta) {
    console.error(`City ${cityName} not found in manifest`);
    return null;
  }

  const baseDir = path.join(process.cwd(), 'public', 'data', cityMeta.country, cityMeta.directoryName);

  // Quiet read: missing section files are expected (we fall back to index.json),
  // so don't log them as errors the way readJsonFile would.
  const readJsonQuiet = async (filePath) => {
    try {
      return JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
    } catch {
      return null;
    }
  };

  // Prefer the small canonical per-section file; fall back to the overview key
  // of the consolidated index.json for cities that predate the split.
  let overview = await readJsonQuiet(path.join(baseDir, 'sections', 'overview.json'));
  let hasContent = Boolean(overview);
  if (!overview) {
    const idx = await readJsonQuiet(path.join(baseDir, 'index.json'));
    overview = idx?.overview ?? null;
    // Legacy cities can have a null overview but full attractions/
    // neighborhoods/culinary/monthly content loaded lazily per tab. Flag
    // them so the client doesn't mistake them for empty stubs.
    hasContent = Boolean(overview) || indexHasContent(idx);
  }

  return {
    cityName: capitalize(cityName),
    country: cityMeta.country,
    overview: overview ? { ...overview, dataCountry: cityMeta.country } : null,
    hasContent,
  };
});

function CityJsonLd({ cityData, citySlug }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: cityData.cityName,
    description: cityData.overview?.brief_description || `Travel guide for ${cityData.cityName}`,
    url: `https://eurotrip-planner.vercel.app/city-guides/${citySlug}`,
    touristType: ['Adventure', 'Cultural', 'Luxury', 'Budget'],
    containedInPlace: {
      '@type': 'Country',
      name: cityData.country,
    },
  };

  // Add geo coordinates if available in the overview
  if (cityData.overview?.coordinates) {
    structuredData.geo = {
      '@type': 'GeoCoordinates',
      latitude: cityData.overview.coordinates.latitude || cityData.overview.coordinates[1],
      longitude: cityData.overview.coordinates.longitude || cityData.overview.coordinates[0],
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default async function CityPage({ params, searchParams }) {
  const { city } = await params;
  const cityName = decodeURIComponent(city);
  const resolvedSearch = await searchParams;

  const cityData = await getCityData(cityName);

  if (!cityData) {
    notFound();
  }

  // Ship only the "shell" needed for the hero, header, breadcrumbs and the
  // default tab. The heavy fields (attractions, neighborhoods, culinary,
  // visit calendar, monthly) are fetched client-side per tab from
  // `/data/{country}/{slug}/sections/*.json`, each served with
  // `Cache-Control: public, max-age=31536000, immutable` (see next.config).
  // This keeps the RSC payload small (~20KB vs ~500KB for Paris) and means a
  // tab only downloads the section it actually needs.
  const shellCityData = {
    cityName: cityData.cityName,
    country: cityData.country,
    overview: cityData.overview,
    hasContent: cityData.hasContent,
  };

  const tripStart = resolvedSearch?.start ?? null;
  const tripEnd = resolvedSearch?.end ?? null;

  return (
    <>
      <CityJsonLd cityData={cityData} citySlug={city} />
      <TripDatesBanner start={tripStart} end={tripEnd} />
      <CityPageClient cityData={shellCityData} cityName={cityName} />
    </>
  );
}
