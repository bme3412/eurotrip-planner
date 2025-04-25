import { notFound } from "next/navigation";
// Remove fsPromises and path imports as they are no longer needed for data loading
// import fsPromises from "fs/promises";
// import path from "path"; 
import Image from "next/image";
import Link from "next/link";
// Remove dynamic import: import dynamic from 'next/dynamic';

// Import components
import CityOverview from "@/components/city-guides/CityOverview";
import AttractionsList from "@/components/city-guides/AttractionsList";
import NeighborhoodsList from "@/components/city-guides/NeighborhoodsList";
import CulinaryGuide from "@/components/city-guides/CulinaryGuide";
import TransportConnections from "@/components/city-guides/TransportConnections";
import SeasonalActivities from "@/components/city-guides/SeasonalActivities";
// Remove direct MapSection import
// import MapSection from "@/components/city-guides/MapSection"; 
import CityVisitSection from "@/components/city-guides/CityVisitSection";
import MonthlyGuideSection from "@/components/city-guides/MonthlyGuideSection";
// Import the new loader component
import CityMapLoader from "@/components/city-guides/CityMapLoader"; 

// Base URL for fetching data - Adjust if necessary for local dev vs production
// process.env.VERCEL_URL provides the deployment URL on Vercel
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000'; // Default for local development

// Function to capitalize the first letter of each word
const capitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Default coordinates for various European regions
const DEFAULT_COORDINATES = {
  France: [2.3522, 48.8566], // Paris
  Nice: [7.262, 43.7102], // Nice, France
  Italy: [12.4964, 41.9028], // Rome
  Germany: [13.405, 52.52], // Berlin
  Spain: [-3.7038, 40.4168], // Madrid
  Netherlands: [4.9041, 52.3676], // Amsterdam
  Belgium: [4.3517, 50.8503], // Brussels
  Austria: [16.3738, 48.2082], // Vienna
  Denmark: [12.5683, 55.6761], // Copenhagen
  Ireland: [-6.2603, 53.3498], // Dublin
  default: [9.19, 48.66], // Central Europe
};

// Add city-specific coordinates using lowercase keys
const CITY_COORDINATES = {
  paris: [2.3522, 48.8566],
  nice: [7.262, 43.7102],
  rome: [12.4964, 41.9028],
  berlin: [13.405, 52.52],
  madrid: [-3.7038, 40.4168],
  amsterdam: [4.9041, 52.3676],
  brussels: [4.3517, 50.8503],
  vienna: [16.3738, 48.2082],
  copenhagen: [12.5683, 55.6761],
  dublin: [-6.2603, 53.3498],
  barcelona: [2.1734, 41.3851],
  munich: [11.582, 48.1351],
  prague: [14.4378, 50.0755],
  milan: [9.19, 45.4642],
  florence: [11.2558, 43.7696],
  salzburg: [13.055, 47.8095],
  innsbruck: [11.4041, 47.2692],
  antwerp: [4.4024, 51.2194],
  seville: [-5.9845, 37.3891],
};

// Fetch manifest file helper
async function getManifest() {
  try {
    const res = await fetch(`${BASE_URL}/data/manifest.json`, { next: { revalidate: 3600 } }); // Revalidate manifest periodically
    if (!res.ok) {
      console.error(`Failed to fetch manifest: ${res.status} ${res.statusText}`);
      throw new Error(`Manifest fetch failed: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching or parsing manifest.json:", error);
    return null; // Indicate failure
  }
}

// Refactored generateStaticParams using manifest.json
export async function generateStaticParams() {
  const manifest = await getManifest();

  if (!manifest || !manifest.cities) {
    console.error("Failed to load manifest or manifest has no cities for generateStaticParams.");
    return [];
  }

  // Extract city names (keys) from the manifest
  const cities = Object.keys(manifest.cities).map(cityKey => ({
    // Ensure the parameter matches the directory name ([city]) expected by the route
    city: cityKey 
  }));

  console.log(`Found ${cities.length} potential city params from manifest.`);
  return cities; 
}

// Async helper to fetch JSON safely from a URL
async function fetchJsonFile(url) {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // Add revalidation strategy
    if (!res.ok) {
      if (res.status === 404) {
        // console.log(`File not found (404): ${url}`); // Optional: less verbose logging
        return null; // Treat 404 as file not found, return null
      }
      // Log other errors
      console.error(`Failed to fetch JSON file ${url}: ${res.status} ${res.statusText}`);
      return null; 
    }
    // Check content type before parsing
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return await res.json();
    } else {
        console.error(`Expected JSON but received Content-Type: ${contentType} from ${url}`);
        return null;
    }
  } catch (error) {
    // Network errors or JSON parsing errors
    console.error(`Error fetching or parsing JSON file ${url}:`, error);
    return null;
  }
}

// Refactored getCityData using fetch and manifest.json
async function getCityData(cityName) {
  const lowerCaseCityName = cityName.toLowerCase(); // Use lowercase for manifest lookup

  const manifest = await getManifest();
  if (!manifest || !manifest.cities) {
    console.error(`Failed to load manifest for city: ${cityName}`);
    return null;
  }

  const cityManifest = manifest.cities[lowerCaseCityName];

  if (!cityManifest) {
    console.error(`City data retrieval failed: ${cityName} not found in manifest.`);
    return null;
  }

  const country = cityManifest.country;
  // Use the directoryName from manifest for constructing paths, fallback to capitalized cityName
  const actualCityDirName = cityManifest.directoryName || capitalize(lowerCaseCityName); 
  const cityDataPath = `/data/${country}/${actualCityDirName}`; // Base path for this city's data

  // Define potential filenames using lowerCaseCityName for consistency
  const overviewFiles = [`${lowerCaseCityName}-overview.json`, `paris-overview.json`, `${lowerCaseCityName}_overview.json`, `overview.json`];
  const attractionsFiles = [`${lowerCaseCityName}_attractions.json`, `attractions.json`, `${lowerCaseCityName}-attractions.json`];
  const neighborhoodsFiles = [`${lowerCaseCityName}_neighborhoods.json`, `neighborhoods.json`, `${lowerCaseCityName}-neighborhoods.json`];
  const culinaryFiles = [`${lowerCaseCityName}_culinary_guide.json`, `culinary_guide.json`, `${lowerCaseCityName}-culinary-guide.json`, `culinary-guide.json`];
  const connectionsFiles = [`${lowerCaseCityName}_connections.json`, `connections.json`, `${lowerCaseCityName}-connections.json`];
  const seasonalFiles = [`${lowerCaseCityName}_seasonal_activities.json`, `seasonal_activities.json`, `${lowerCaseCityName}-seasonal-activities.json`, `seasonal-activities.json`];
  const summaryFiles = [`generation_summary.json`, `summary.json`, `${lowerCaseCityName}-summary.json`, `${lowerCaseCityName}_summary.json`];
  const monthlyCalendarFiles = [`${lowerCaseCityName}-visit-calendar.json`, `${lowerCaseCityName}_visit_calendar.json`, `visit-calendar.json`, `visit_calendar.json`];

  // Helper to try fetching multiple files until one succeeds
  const fetchWithFallbacks = async (basePath, filenames) => {
    for (const filename of filenames) {
      const data = await fetchJsonFile(`${BASE_URL}${basePath}/${filename}`);
      if (data) return data; // Return the first successful fetch
    }
    return null; // Return null if all fetches fail
  };

  // Fetch all data concurrently using the fetchWithFallbacks helper
  const [
    overview, 
    attractions, 
    neighborhoods, 
    culinaryGuide, 
    connections, 
    seasonalActivities, 
    monthlyEventsData, 
    summary
  ] = await Promise.all([
    fetchWithFallbacks(cityDataPath, overviewFiles),
    fetchWithFallbacks(cityDataPath, attractionsFiles),
    fetchWithFallbacks(cityDataPath, neighborhoodsFiles),
    fetchWithFallbacks(cityDataPath, culinaryFiles),
    fetchWithFallbacks(cityDataPath, connectionsFiles),
    fetchWithFallbacks(cityDataPath, seasonalFiles),
    
    // Monthly Events logic using manifest
    (async () => {
      let events = {};
      const monthlyBasePath = `${cityDataPath}/monthly`;
      
      // Try fetching individual month files listed in manifest first
      if (cityManifest.monthlyFiles && cityManifest.monthlyFiles.length > 0) {
        console.log(`Fetching monthly data for ${cityName} from manifest files...`);
        await Promise.all(cityManifest.monthlyFiles.map(async (monthFile) => {
          try {
            const monthData = await fetchJsonFile(`${BASE_URL}${monthlyBasePath}/${monthFile}`);
            if (monthData) {
              // Assuming filename (without .json) is the key, or data is structured { monthName: {...} }
              let monthName = monthFile.replace(".json", "").toLowerCase();
              events[monthName] = monthData[capitalize(monthName)] || monthData[monthName] || monthData; // Handle different potential structures
            }
          } catch (e) { console.error(`Error processing fetched month file ${monthFile}`, e); }
        }));
      }
      
      // If no events found via manifest files OR manifest didn't list files, try fallback calendar files
      if (Object.keys(events).length === 0) {
         console.log(`No events from monthly files for ${cityName}, trying visit calendar fallbacks...`);
         const calendarData = await fetchWithFallbacks(cityDataPath, monthlyCalendarFiles);
         if (calendarData) {
             console.log(`Using visit calendar data for ${cityName}`);
             events = calendarData.months || calendarData; // Use months property or whole object
         }
      }

      return events;
    })(),

    fetchWithFallbacks(cityDataPath, summaryFiles),
  ]);

  // Post-process fetched data (remains the same)
  if (attractions && attractions.sites && Array.isArray(attractions.sites)) {
      attractions.sites = attractions.sites.map((site) => ({
          ...site,
          category: site.category || site.type,
      }));
  } else if (attractions && !Array.isArray(attractions)) {
      console.warn(`Expected attractions.sites to be an array, but got:`, attractions);
      // Potentially reset attractions or handle error
  }
  
  if (neighborhoods && neighborhoods.neighborhoods && Array.isArray(neighborhoods.neighborhoods)) {
       neighborhoods.neighborhoods = neighborhoods.neighborhoods.map(
         (neighborhood, index) => ({
           ...neighborhood,
           id: neighborhood.id || `neighborhood-${index}`,
         })
       );
   } else if (neighborhoods && !Array.isArray(neighborhoods)) {
       console.warn(`Expected neighborhoods.neighborhoods to be an array, but got:`, neighborhoods);
   }

  // --- Refactored Image Checking ---
  // Construct potential image URLs directly instead of checking filesystem paths
  let cityImage = "/images/cities/default-city.jpg"; // Default
  const possibleImageUrls = [
      `/images/cities/${lowerCaseCityName}.jpg`,
      `/images/cities/${lowerCaseCityName}.png`,
      `/images/cities/${lowerCaseCityName}.jpeg`,
      `/images/${lowerCaseCityName}-thumbnail.jpg`,
      `/images/${lowerCaseCityName}-thumbnail.png`,
      // Add variations with original casing if needed, but lowercase is safer
      `/images/cities/${cityName}.jpg`, 
      `/images/cities/${cityName}.png`,
      `/images/${cityName}-thumbnail.jpg`,
      `/images/${cityName}-thumbnail.png`,
  ];

  // Optional: Check if image exists using HEAD request (more robust but adds latency)
  // This requires careful implementation to avoid issues in serverless envs.
  // Simpler approach: Just construct the path and let the browser handle 404s.
  // Let's try the first plausible path based on lowercase convention.
  // You might pre-calculate the correct image path in the manifest for certainty.
  
  // Prioritize lowercase paths:
  const preferredImagePath = `/images/cities/${lowerCaseCityName}.jpg`; // Example preference
  // A simple check based on convention (can be improved with HEAD or manifest data)
  // For now, just using a common pattern, adjust as needed
  if(await fetch(`${BASE_URL}/images/cities/${lowerCaseCityName}.jpg`, { method: 'HEAD' }).then(res => res.ok)) {
      cityImage = `/images/cities/${lowerCaseCityName}.jpg`;
      console.log(`Found city image for ${cityName} (HEAD check): ${cityImage}`);
  } else if (await fetch(`${BASE_URL}/images/cities/${lowerCaseCityName}.png`, { method: 'HEAD' }).then(res => res.ok)) {
      cityImage = `/images/cities/${lowerCaseCityName}.png`;
      console.log(`Found city image for ${cityName} (HEAD check): ${cityImage}`);
  } else if (await fetch(`${BASE_URL}/images/${lowerCaseCityName}-thumbnail.png`, { method: 'HEAD' }).then(res => res.ok)) {
      cityImage = `/images/${lowerCaseCityName}-thumbnail.png`;
      console.log(`Found city image for ${cityName} (HEAD check): ${cityImage}`);
  } else {
      console.log(`City image for ${cityName} not found via HEAD check, using default.`);
      // Could try other possibleImageUrls here...
  }


  // Return the combined data
  return {
    cityName: capitalize(cityName), // Use capitalized for display
    country,
    overview,
    attractions,
    neighborhoods,
    culinaryGuide,
    connections,
    seasonalActivities,
    monthlyEvents: monthlyEventsData || {}, // Ensure it's an object
    summary,
    cityImage,
  };
}

// Main page component
export default async function CityPage({ params }) {
  // Decode URI component for city names with special characters like Tromsø
  const cityName = decodeURIComponent(params.city); 
  const cityData = await getCityData(cityName);

  if (!cityData) {
    console.log(`City data not found for param: ${params.city}, decoded: ${cityName}. Triggering notFound().`);
    notFound();
  }

  // Extract data with defaults (Add checks for null/undefined from fetch failures)
  const { 
    overview = {},
    attractions = null, // Default to null to handle fetch failures gracefully
    neighborhoods = null,
    culinaryGuide = {},
    connections = {},
    seasonalActivities = {},
    monthlyEvents: rawMonthlyEvents = {}, 
    summary = {},
    cityImage = "/images/cities/default-city.jpg", // Use default from cityData if available
  } = cityData || {}; // Add safeguard if cityData itself is null

  // Capitalize city name for display
  const displayCityName = cityData?.cityName || capitalize(cityName); // Use name from data if available
  
  // --- Process potentially null data safely ---
  // Ensure attractions structure is valid or default to empty array
  const safeAttractions = (attractions?.sites && Array.isArray(attractions.sites)) 
                          ? attractions.sites 
                          : [];
  // Ensure categories are handled (assuming they might come from attractions or elsewhere)
  // If categories are expected within attractions data, extract safely
  const safeCategories = safeAttractions
      .map(site => site.category)
      .filter((value, index, self) => value && self.indexOf(value) === index); // Get unique categories

  // Ensure neighborhoods structure is valid or default to empty array
   const safeNeighborhoods = (neighborhoods?.neighborhoods && Array.isArray(neighborhoods.neighborhoods))
                             ? neighborhoods.neighborhoods
                             : [];
                             
  // Ensure monthlyEvents is a non-null object
  const safeMonthlyEvents = rawMonthlyEvents !== null && typeof rawMonthlyEvents === 'object' 
                           ? rawMonthlyEvents 
                           : {}; 

  // Get center coordinates for the map
  const center = CITY_COORDINATES[cityName.toLowerCase()] || DEFAULT_COORDINATES.default;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Page Header */}
      <header className="py-8 bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center text-gray-800">
            {displayCityName} Travel Guide
          </h1>
          <p className="text-center text-lg text-gray-600 mt-2">
            Your complete guide to exploring {displayCityName}
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column (Overview, Attractions, Neighborhoods) */}
          <div className="md:col-span-2 space-y-8">
            {/* Pass potentially empty objects/arrays safely */}
            <CityOverview overview={overview || {}} cityName={displayCityName} />
            <AttractionsList attractions={safeAttractions} categories={safeCategories} cityName={displayCityName} />
            <NeighborhoodsList neighborhoods={safeNeighborhoods} cityName={displayCityName} />
          </div>

          {/* Right Column (Culinary, Transport, Seasonal) */}
          <div className="md:col-span-1 space-y-8">
            <CulinaryGuide guide={culinaryGuide || {}} cityName={displayCityName} />
            <TransportConnections connections={connections || {}} cityName={displayCityName} />
            <SeasonalActivities activities={seasonalActivities || {}} cityName={displayCityName} />
          </div>
        </div>

        {/* Full Width Sections (Map, Visit Planner, Monthly Guide) */}
        <div className="mt-12 space-y-12">
          <section className="bg-white rounded-lg shadow-md overflow-hidden">
             <CityMapLoader
              attractions={safeAttractions}
              categories={safeCategories} 
              cityName={displayCityName}
              center={center}
              zoom={12} 
              title={`${displayCityName} Interactive Map`}
              subtitle="Explore attractions, neighborhoods, and more"
             />
          </section>

          <CityVisitSection summary={summary || {}} cityName={displayCityName} />
          {/* Pass safeMonthlyEvents which is guaranteed to be an object */}
          <MonthlyGuideSection monthlyEvents={safeMonthlyEvents} cityName={displayCityName} /> 
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 mt-12 bg-gray-800 text-white text-center">
        <p>&copy; {new Date().getFullYear()} EuroTrip Planner. Explore Europe!</p>
      </footer>
    </div>
  );
}
