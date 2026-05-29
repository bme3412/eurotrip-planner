import { notFound } from "next/navigation";
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
async function getManifest() {
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
}

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
  let ogImage = null;
  for (const candidate of ogImageCandidates) {
    const fullPath = path.join(process.cwd(), 'public', candidate);
    if (await pathExists(fullPath)) {
      ogImage = `https://eurotrip-planner.vercel.app${candidate}`;
      break;
    }
  }

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

async function readJsonFile(filePath) {
  try {
    const fileContent = await fsPromises.readFile(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

async function getCityData(cityName) {
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
  const consolidatedPath = path.join(baseDir, 'index.json');

  // FAST PATH: Read consolidated index.json directly (no existence check - just try to read)
  try {
    const idx = JSON.parse(await fsPromises.readFile(consolidatedPath, 'utf8'));

    // If index.json has the required fields, return immediately (skip all fallbacks)
    if (idx.overview && idx.attractions) {
      return {
        cityName: capitalize(cityName),
        country: idx.country ?? cityMeta.country,
        overview: { ...idx.overview, dataCountry: cityMeta.country },
        attractions: idx.attractions,
        neighborhoods: idx.neighborhoods ?? null,
        culinaryGuide: idx.culinaryGuide ?? null,
        connections: idx.connections ?? null,
        seasonalActivities: idx.seasonalActivities ?? null,
        monthlyEvents: idx.monthly ?? {},
        summary: idx.summary ?? null,
        visitCalendar: idx.visitCalendar ?? null
      };
    }
  } catch {
    // index.json doesn't exist or is incomplete - fall through to legacy loading
  }

  // SLOW PATH: Fallback for cities without complete index.json
  const monthlyDir = path.join(baseDir, 'monthly');
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];

  // Parallel fallback loading for all file types at once
  const loadFileWithFallbacks = async (filenames) => {
    for (const filename of filenames) {
      try {
        return JSON.parse(await fsPromises.readFile(path.join(baseDir, filename), 'utf8'));
      } catch {
        continue;
      }
    }
    return null;
  };

  try {
    // Load all file types in parallel. Phase D: read from the canonical
    // per-section files emitted by the content build under sections/.
    const [overview, attractions, neighborhoods, culinaryGuide, connections, seasonalActivities, summary, visitCalendar] = await Promise.all([
      loadFileWithFallbacks(['sections/overview.json']),
      loadFileWithFallbacks(['sections/attractions.json']),
      loadFileWithFallbacks(['sections/neighborhoods.json']),
      loadFileWithFallbacks(['sections/culinary.json']),
      loadFileWithFallbacks(['sections/connections.json']),
      loadFileWithFallbacks(['sections/seasonal-activities.json']),
      loadFileWithFallbacks(['summary.json']),
      loadFileWithFallbacks(['sections/visit-calendar.json']),
    ]);

    // Load priority months (current and next) in parallel
    const currentMonth = new Date().getMonth();
    const priorityMonths = [monthNames[currentMonth], monthNames[(currentMonth + 1) % 12]];

    const monthlyResults = await Promise.all(
      priorityMonths.map(async (monthName) => {
        try {
          const data = JSON.parse(await fsPromises.readFile(path.join(monthlyDir, `${monthName}.json`), 'utf8'));
          const monthKey = Object.keys(data)[0];
          return monthKey ? [monthKey.toLowerCase(), data[monthKey]] : null;
        } catch {
          return null;
        }
      })
    );

    const monthlyData = Object.fromEntries(monthlyResults.filter(Boolean));

    return {
      cityName: capitalize(cityName),
      country: cityMeta.country,
      overview: overview ? { ...overview, dataCountry: cityMeta.country } : null,
      attractions,
      neighborhoods,
      culinaryGuide,
      connections,
      seasonalActivities,
      monthlyEvents: monthlyData,
      summary,
      visitCalendar
    };
  } catch (error) {
    console.error(`Error loading data for ${cityName}:`, error);
    return null;
  }
}

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
  // default "Getting In" tab. The heavy fields (attractions, neighborhoods,
  // culinary, connections, seasonal, visit calendar, monthly) are fetched
  // client-side from `/data/{country}/{slug}/index.json`, which is served
  // with `Cache-Control: public, max-age=31536000, immutable` (see next.config).
  // This keeps the RSC payload small on navigation (~20KB vs ~500KB for Paris)
  // without duplicating data — the browser reuses the exact same JSON file.
  const shellCityData = {
    cityName: cityData.cityName,
    country: cityData.country,
    overview: cityData.overview,
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
