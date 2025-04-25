import { notFound } from "next/navigation";
// import fs from "fs"; // Removed as fsPromises is used instead
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

// Function to capitalize the first letter of each word
const capitalize = (str) => {
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

// Helper to check if a path exists (async)
async function pathExists(filePath) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    } else {
      // Rethrow other errors (e.g., permissions)
      throw error;
    }
  }
}

// Get all available city folders (Async version)
export async function generateStaticParams() {
  const possibleDataDirs = [path.join(process.cwd(), "public/data")];
  let dataDir = null;

  for (const dir of possibleDataDirs) {
    // Use async check
    if (await pathExists(dir)) {
      dataDir = dir;
      console.log(`Found data directory for generateStaticParams at: ${dataDir}`);
      break;
    }
  }

  if (!dataDir) {
    console.error("No valid data directory found for generateStaticParams");
    return [];
  }

  let countries = [];
  try {
    // Use async readdir
    const items = await fsPromises.readdir(dataDir, { withFileTypes: true });
    countries = items
      .filter(item => item.isDirectory() && !item.name.includes("compressed_videos") && !item.name.includes("IMG_"))
      .map(item => item.name);

  } catch (error) {
    console.error(`Error reading data directory: ${error}`);
    return [];
  }

  let cities = [];

  // Use Promise.all for concurrent processing of countries
  await Promise.all(countries.map(async (country) => {
    const countryPath = path.join(dataDir, country);
    try {
      // Use async readdir with file types
      const countryItems = await fsPromises.readdir(countryPath, { withFileTypes: true });
      const countryCities = countryItems
        .filter(item => item.isDirectory() && !item.name.includes("."))
        .map(item => item.name);

      countryCities.forEach((city) => {
        cities.push({ city }); // Keep the original format for fetching
      });
    } catch (error) {
      // Log specific country error but continue with others
      console.error(`Error reading country directory ${country}: ${error}`);
    }
  }));

  // CORRECTED: Return only the city param object
  // NOTE: This will be empty until the directory structure/reading logic is fixed
  console.log(`Found ${cities.length} potential city params (before data validation).`);
  return cities; // Returns [{ city: '...' }, ...]
}

// Async helper to read JSON safely
async function readJsonFile(filePath) {
  try {
    if (await pathExists(filePath)) {
      const data = await fsPromises.readFile(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading or parsing JSON file ${filePath}:`, error);
  }
  return null;
}

// Async version of getCityData
async function getCityData(cityName) {
  // Convert cityName to lowercase to handle case-insensitive file systems and ensure consistency
  const lowerCaseCityName = cityName.toLowerCase();

  const possibleDataDirs = [path.join(process.cwd(), "public/data")];
  let dataDir = null;

  for (const dir of possibleDataDirs) {
    if (await pathExists(dir)) {
      dataDir = dir;
      // console.log(`Found data directory at: ${dataDir}`); // Less verbose logging
      break;
    }
  }

  if (!dataDir) {
    console.error("No valid data directory found");
    return null;
  }

  let countries = [];
  try {
    const items = await fsPromises.readdir(dataDir, { withFileTypes: true });
     countries = items
      .filter(item => item.isDirectory() && !item.name.includes("compressed_videos") && !item.name.includes("IMG_"))
      .map(item => item.name);
  } catch (error) {
    console.error(`Error reading data directory: ${error}`);
    return null;
  }

  for (const country of countries) {
    const countryPath = path.join(dataDir, country);
    try {
       const countryItems = await fsPromises.readdir(countryPath, { withFileTypes: true });
       // Find the directory matching the original cityName (case might matter for directory check)
       const cityDirEntry = countryItems.find(item => item.isDirectory() && item.name.toLowerCase() === lowerCaseCityName);

      if (cityDirEntry) {
         // Use the actual directory name found for the path
        const actualCityDirName = cityDirEntry.name;
        const cityPath = path.join(countryPath, actualCityDirName);

        // Use Promise.all to fetch all data concurrently - USE lowerCaseCityName for filenames
        const [overview, attractions, neighborhoods, culinaryGuide, connections, seasonalActivities, monthlyEventsData, summary] = await Promise.all([
          // Overview
          readJsonFile(path.join(cityPath, `${lowerCaseCityName}-overview.json`))
            .then(data => data || readJsonFile(path.join(cityPath, `paris-overview.json`))) // Special Paris case remains
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}_overview.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `overview.json`))),

          // Attractions
          readJsonFile(path.join(cityPath, `${lowerCaseCityName}_attractions.json`))
            .then(data => data || readJsonFile(path.join(cityPath, `attractions.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}-attractions.json`))),

          // Neighborhoods
          readJsonFile(path.join(cityPath, `${lowerCaseCityName}_neighborhoods.json`))
            .then(data => data || readJsonFile(path.join(cityPath, `neighborhoods.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}-neighborhoods.json`))),

          // Culinary Guide
          readJsonFile(path.join(cityPath, `${lowerCaseCityName}_culinary_guide.json`))
            .then(data => data || readJsonFile(path.join(cityPath, `culinary_guide.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}-culinary-guide.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `culinary-guide.json`))),

          // Connections
          readJsonFile(path.join(cityPath, `${lowerCaseCityName}_connections.json`))
            .then(data => data || readJsonFile(path.join(cityPath, `connections.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}-connections.json`))),

          // Seasonal Activities
          readJsonFile(path.join(cityPath, `${lowerCaseCityName}_seasonal_activities.json`))
            .then(data => data || readJsonFile(path.join(cityPath, `seasonal_activities.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}-seasonal-activities.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `seasonal-activities.json`))),
            
          // Monthly Events / Visit Calendar (Complex logic handled separately below)
          (async () => {
            // Use actualCityDirName for the monthly path
            const monthlyPath = path.join(cityPath, "monthly");
            let events = {};
            if (await pathExists(monthlyPath)) {
              try {
                const monthFiles = (await fsPromises.readdir(monthlyPath)).filter(file => file.endsWith(".json"));
                await Promise.all(monthFiles.map(async (monthFile) => {
                   try {
                      const monthData = await readJsonFile(path.join(monthlyPath, monthFile));
                      if(monthData) {
                         let monthName = monthFile.replace(".json", "");
                         monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                         // Simplified logic: assume file name is key
                         events[monthName.toLowerCase()] = monthData[monthName] || monthData; // Handle cases where key matches filename or not
                      }
                   } catch (e) { console.error(`Error processing month file ${monthFile}`, e); }
                }));
              } catch (error) {
                console.error(`Error reading monthly directory: ${error}`);
              }
            } else {
               // Try visit calendar as fallback - USE lowerCaseCityName
               const possibleCalendarPaths = [
                   path.join(cityPath, `${lowerCaseCityName}-visit-calendar.json`),
                   path.join(cityPath, `${lowerCaseCityName}_visit_calendar.json`),
                   path.join(cityPath, `visit-calendar.json`),
                   path.join(cityPath, `visit_calendar.json`),
               ];
               for (const calendarPath of possibleCalendarPaths) {
                   const calendarData = await readJsonFile(calendarPath);
                   if (calendarData) {
                       console.log(`Using visit calendar from: ${calendarPath}`);
                       events = calendarData.months || calendarData; // Use months property or whole object
                       break;
                   }
               }
            }
            return events;
          })(),

          // Summary - USE lowerCaseCityName
          readJsonFile(path.join(cityPath, "generation_summary.json")) // Keep generic name
            .then(data => data || readJsonFile(path.join(cityPath, "summary.json"))) // Keep generic name
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}-summary.json`)))
            .then(data => data || readJsonFile(path.join(cityPath, `${lowerCaseCityName}_summary.json`))),
        ]);
        
        // Post-process fetched data (only if needed, e.g., normalizing structures)
        if (attractions && attractions.sites) {
            attractions.sites = attractions.sites.map((site) => ({
                ...site,
                category: site.category || site.type,
            }));
        }
         if (neighborhoods && neighborhoods.neighborhoods) {
              neighborhoods.neighborhoods = neighborhoods.neighborhoods.map(
                (neighborhood, index) => ({
                  ...neighborhood,
                  id: neighborhood.id || `neighborhood-${index}`,
                })
              );
          }

        // Check for city image (can remain synchronous if check is quick, or make async)
        let cityImage = "/images/cities/default-city.jpg";
        // USE lowerCaseCityName for image checks
        const possibleImagePaths = [
          path.join(process.cwd(), "public", "images", "cities", `${lowerCaseCityName}.jpg`),
          path.join(process.cwd(), "public", "images", "cities", `${lowerCaseCityName}.png`),
          path.join(process.cwd(), "public", "images", "cities", `${lowerCaseCityName}.jpeg`),
          // Keep original cityName checks as well in case some images use capitalization? Maybe remove later.
          path.join(process.cwd(), "public", "images", "cities", `${cityName}.jpg`),
          path.join(process.cwd(), "public", "images", "cities", `${cityName}.png`),
          path.join(process.cwd(), "public", "images", "cities", `${cityName}.jpeg`),
          path.join(process.cwd(), "public", "images", `${lowerCaseCityName}-thumbnail.jpg`),
          path.join(process.cwd(), "public", "images", `${lowerCaseCityName}-thumbnail.png`),
          path.join(process.cwd(), "public", "images", `${cityName}-thumbnail.jpg`), // Keep original case check
          path.join(process.cwd(), "public", "images", `${cityName}-thumbnail.png`), // Keep original case check
        ];

        for (const imagePath of possibleImagePaths) {
          if (await pathExists(imagePath)) {
            const relativePath = imagePath.replace(path.join(process.cwd(), "public"), "").replace(/\\/g, '/');
            cityImage = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
            console.log(`Found city image for ${cityName} (checked as ${lowerCaseCityName}) at: ${cityImage}`);
            break;
          }
        }

        return {
          // Return the original cityName from the directory for display purposes if needed,
          // but ensure data corresponds to lowerCaseCityName lookups.
          cityName: actualCityDirName,
          country,
          overview,
          attractions,
          neighborhoods,
          culinaryGuide,
          connections,
          seasonalActivities,
          monthlyEvents: monthlyEventsData, // Use the resolved data
          summary,
          cityImage,
        };
      }
    } catch (error) {
       console.error(`Error checking country directory ${country}: ${error}`);
       // Continue to next country
    }
  }

  console.error(`City data retrieval failed for: ${cityName}`);
  return null;
}

// Main page component
export default async function CityPage({ params }) {
  const cityName = params.city;
  const cityData = await getCityData(cityName);

  if (!cityData) {
    notFound();
  }

  // Extract data with defaults
  const { 
    overview = {},
    attractions = [], 
    categories = [],
    neighborhoods = [],
    culinaryGuide = {},
    connections = {},
    seasonalActivities = {},
    monthlyEvents = {},
    summary = {},
  } = cityData;

  // Capitalize city name for display
  const displayCityName = capitalize(cityName);

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
            <CityOverview overview={overview} cityName={displayCityName} />
            <AttractionsList attractions={attractions} categories={categories} cityName={displayCityName} />
            <NeighborhoodsList neighborhoods={neighborhoods} cityName={displayCityName} />
          </div>

          {/* Right Column (Culinary, Transport, Seasonal) */}
          <div className="md:col-span-1 space-y-8">
            <CulinaryGuide guide={culinaryGuide} cityName={displayCityName} />
            <TransportConnections connections={connections} cityName={displayCityName} />
            <SeasonalActivities activities={seasonalActivities} cityName={displayCityName} />
          </div>
        </div>

        {/* Full Width Sections (Map, Visit Planner, Monthly Guide) */}
        <div className="mt-12 space-y-12">
           {/* Replace MapSection with CityMapLoader */}
          <section className="bg-white rounded-lg shadow-md overflow-hidden">
             <CityMapLoader
              attractions={attractions}
              categories={categories} 
              cityName={displayCityName}
              center={center}
              zoom={12} // Default zoom or adjust as needed
              title={`${displayCityName} Interactive Map`}
              subtitle="Explore attractions, neighborhoods, and more"
             />
          </section>

          <CityVisitSection summary={summary} cityName={displayCityName} />
          <MonthlyGuideSection monthlyEvents={monthlyEvents} cityName={displayCityName} />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 mt-12 bg-gray-800 text-white text-center">
        <p>&copy; {new Date().getFullYear()} EuroTrip Planner. Explore Europe!</p>
      </footer>
    </div>
  );
}
