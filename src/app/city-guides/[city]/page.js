import { notFound } from "next/navigation";
// Re-introduce fs/promises and path
import fsPromises from "fs/promises";
import path from "path"; 
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

// Remove BASE_URL as it's no longer needed for build-time data fetching
// const BASE_URL = ... 

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

// Helper to check if a file path exists (optional but good practice)
async function pathExists(filePath) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    } else {
      throw error;
    }
  }
}

// Fetch manifest file helper using fs
async function getManifest() {
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json');
  try {
    // Check if manifest exists before reading
    if (!(await pathExists(manifestPath))) {
        console.error(`Manifest file not found at: ${manifestPath}`);
        return null;
    }
    const fileContent = await fsPromises.readFile(manifestPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading or parsing manifest.json from ${manifestPath}:`, error);
    return null; // Indicate failure
  }
}

// Refactored generateStaticParams using manifest (fetched via fs)
export async function generateStaticParams() {
  const manifest = await getManifest();

  if (!manifest || !manifest.cities) {
    console.error("Failed to load manifest or manifest has no cities for generateStaticParams.");
    return [];
  }

  // Extract city names (keys) from the manifest
  const cities = Object.keys(manifest.cities).map(cityKey => ({
    // Ensure the parameter matches the directory name ([city]) expected by the route
    // Use encodeURIComponent for city names that might contain special characters (like Tromsø)
    city: encodeURIComponent(cityKey) 
  }));

  console.log(`Found ${cities.length} potential city params from manifest.`);
  // console.log("Params:", cities); // Optional: Log generated params
  return cities; 
}

// Async helper to read JSON safely from filesystem
async function readJsonFile(filePath) {
  try {
    // Use the pathExists helper
    if (await pathExists(filePath)) { 
      const data = await fsPromises.readFile(filePath, "utf8");
      return JSON.parse(data);
    } else {
      // console.log(`File not found: ${filePath}`); // Optional: less verbose logging
      return null;
    }
  } catch (error) {
    // File reading or JSON parsing errors
    console.error(`Error reading or parsing JSON file ${filePath}:`, error);
    return null;
  }
}

// Refactored getCityData using fs and manifest.json
async function getCityData(cityName) {
  // Decode the city name from the URL param first
  const decodedCityName = decodeURIComponent(cityName);
  const lowerCaseCityName = decodedCityName.toLowerCase(); // Use lowercase for manifest lookup

  const manifest = await getManifest();
  if (!manifest || !manifest.cities) {
    console.error(`Failed to load manifest for city: ${decodedCityName}`);
    return null;
  }

  const cityManifest = manifest.cities[lowerCaseCityName];

  if (!cityManifest) {
    console.error(`City data retrieval failed: ${decodedCityName} (lookup: ${lowerCaseCityName}) not found in manifest.`);
    return null;
  }

  const country = cityManifest.country;
  const actualCityDirName = cityManifest.directoryName || capitalize(lowerCaseCityName); 
  // Construct the absolute base path to the city's data directory within /public
  const cityDataDir = path.join(process.cwd(), 'public', 'data', country, actualCityDirName);

  // Define potential filenames (same as before)
  const overviewFiles = [`${lowerCaseCityName}-overview.json`, `paris-overview.json`, `${lowerCaseCityName}_overview.json`, `overview.json`];
  const attractionsFiles = [`${lowerCaseCityName}_attractions.json`, `attractions.json`, `${lowerCaseCityName}-attractions.json`];
  const neighborhoodsFiles = [`${lowerCaseCityName}_neighborhoods.json`, `neighborhoods.json`, `${lowerCaseCityName}-neighborhoods.json`];
  const culinaryFiles = [`${lowerCaseCityName}_culinary_guide.json`, `culinary_guide.json`, `${lowerCaseCityName}-culinary-guide.json`, `culinary-guide.json`];
  const connectionsFiles = [`${lowerCaseCityName}_connections.json`, `connections.json`, `${lowerCaseCityName}-connections.json`];
  const seasonalFiles = [`${lowerCaseCityName}_seasonal_activities.json`, `seasonal_activities.json`, `${lowerCaseCityName}-seasonal-activities.json`, `seasonal-activities.json`];
  const summaryFiles = [`generation_summary.json`, `summary.json`, `${lowerCaseCityName}-summary.json`, `${lowerCaseCityName}_summary.json`];
  const monthlyCalendarFiles = [`${lowerCaseCityName}-visit-calendar.json`, `${lowerCaseCityName}_visit_calendar.json`, `visit-calendar.json`, `visit_calendar.json`];

  // Helper to try reading multiple files from filesystem until one succeeds
  const readWithFallbacks = async (baseDir, filenames) => {
    for (const filename of filenames) {
      const filePath = path.join(baseDir, filename);
      const data = await readJsonFile(filePath);
      if (data) return data; // Return the first successful read
    }
    // console.log(`Failed to find any valid file for ${baseDir} with options: ${filenames.join(', ')}`); // Optional logging
    return null; // Return null if all reads fail
  };

  // Read all data concurrently using the readWithFallbacks helper
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
    readWithFallbacks(cityDataDir, overviewFiles),
    readWithFallbacks(cityDataDir, attractionsFiles),
    readWithFallbacks(cityDataDir, neighborhoodsFiles),
    readWithFallbacks(cityDataDir, culinaryFiles),
    readWithFallbacks(cityDataDir, connectionsFiles),
    readWithFallbacks(cityDataDir, seasonalFiles),
    
    // Monthly Events logic using manifest and fs
    (async () => {
      let events = {};
      const monthlyDir = path.join(cityDataDir, 'monthly');
      
      // Try reading individual month files listed in manifest first
      if (cityManifest.monthlyFiles && cityManifest.monthlyFiles.length > 0 && await pathExists(monthlyDir)) {
        // console.log(`Reading monthly data for ${decodedCityName} from manifest files...`);
        await Promise.all(cityManifest.monthlyFiles.map(async (monthFile) => {
          try {
            const monthFilePath = path.join(monthlyDir, monthFile);
            const monthData = await readJsonFile(monthFilePath);
            if (monthData) {
              let monthName = monthFile.replace(".json", "").toLowerCase();
              events[monthName] = monthData[capitalize(monthName)] || monthData[monthName] || monthData;
            }
          } catch (e) { console.error(`Error processing read month file ${monthFile}`, e); }
        }));
      }
      
      // If no events found via manifest files OR manifest didn't list files, try fallback calendar files
      if (Object.keys(events).length === 0) {
         // console.log(`No events from monthly files for ${decodedCityName}, trying visit calendar fallbacks...`);
         const calendarData = await readWithFallbacks(cityDataDir, monthlyCalendarFiles);
         if (calendarData) {
             // console.log(`Using visit calendar data for ${decodedCityName}`);
             events = calendarData.months || calendarData;
         }
      }

      return events;
    })(),

    readWithFallbacks(cityDataDir, summaryFiles),
  ]);

  // --- Image Checking --- 
  // We can revert to checking the filesystem path during build 
  // OR keep the HEAD check (might be slower build) 
  // OR trust the manifest/convention.
  // Let's revert to simple path construction for SSG build.
  
  let cityImage = "/images/cities/default-city.jpg"; // Default public path
  const publicImageBase = path.join(process.cwd(), 'public');
  const possibleImagePaths = [
    // Lowercase checks first
    path.join('images', 'cities', `${lowerCaseCityName}.jpg`),
    path.join('images', 'cities', `${lowerCaseCityName}.png`),
    path.join('images', 'cities', `${lowerCaseCityName}.jpeg`),
    path.join('images', `${lowerCaseCityName}-thumbnail.jpg`),
    path.join('images', `${lowerCaseCityName}-thumbnail.png`),
    // Original case as fallback?
    // path.join('images', 'cities', `${decodedCityName}.jpg`), 
    // path.join('images', 'cities', `${decodedCityName}.png`),
  ];

  for (const relativeImagePath of possibleImagePaths) {
      const fullImagePath = path.join(publicImageBase, relativeImagePath);
      if (await pathExists(fullImagePath)) {
          cityImage = `/${relativeImagePath.replace(/\\/g, '/')}`; // Construct public URL path
          // console.log(`Found city image for ${decodedCityName} (fs check): ${cityImage}`);
          break;
      }
  }
  // Remove the fetch HEAD check block
  // if(await fetch(...)) { ... } else { ... }


  // Return the combined data
  return {
    cityName: capitalize(decodedCityName), // Use capitalized for display
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
  // No need to decode here anymore, getCityData handles it
  const cityName = params.city; 
  const cityData = await getCityData(cityName);

  if (!cityData) {
    console.log(`City data returned null for param: ${cityName}. Triggering notFound().`);
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
  const displayCityName = cityData?.cityName || capitalize(decodeURIComponent(cityName)); // Use name from data if available, fallback to decoded param
  
  // --- Process potentially null data safely ---
  const safeAttractions = (attractions?.sites && Array.isArray(attractions.sites)) 
                          ? attractions.sites 
                          : [];
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
  const center = CITY_COORDINATES[decodeURIComponent(cityName).toLowerCase()] || DEFAULT_COORDINATES.default;

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
          <MonthlyGuideSection monthlyData={safeMonthlyEvents} cityName={displayCityName} /> 
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 mt-12 bg-gray-800 text-white text-center">
        <p>&copy; {new Date().getFullYear()} EuroTrip Planner. Explore Europe!</p>
      </footer>
    </div>
  );
}
