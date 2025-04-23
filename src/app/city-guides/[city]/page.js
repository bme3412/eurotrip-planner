import { notFound } from "next/navigation";
// import fs from "fs"; // Removed as fsPromises is used instead
import fsPromises from "fs/promises";
import path from "path";
import Image from "next/image";
import Link from "next/link";

// Import components
import CityOverview from "@/components/city-guides/CityOverview";
import AttractionsList from "@/components/city-guides/AttractionsList";
import NeighborhoodsList from "@/components/city-guides/NeighborhoodsList";
import CulinaryGuide from "@/components/city-guides/CulinaryGuide";
import TransportConnections from "@/components/city-guides/TransportConnections";
import SeasonalActivities from "@/components/city-guides/SeasonalActivities";
import MapSection from "@/components/city-guides/MapSection";
import CityVisitSection from "@/components/city-guides/CityVisitSection";
import MonthlyGuideSection from "@/components/city-guides/MonthlyGuideSection";

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
  // Await the props object to ensure params are resolved (though usually implicit in async components)
  // const { params } = await props; // Removed this line
  // Destructure city (which comes from the URL path, likely lowercase)
  const { city } = params;
  // Fetch data using the city param from the URL (likely lowercase)
  const cityData = await getCityData(city);

  // If cityData fetch failed based on the URL param
  if (!cityData) {
    console.error(`City data fetch failed for: ${city}`);
    notFound(); // Trigger 404 if data is missing
  }

  // Capitalize city name for display if needed (using the original name from cityData)
  const displayCityName = cityData.cityName ? capitalize(cityData.cityName) : capitalize(city);

  // Destructure data from cityData
  const {
    overview = {},
    attractions = [],
    neighborhoods = [],
    culinary_guide = {},
    connections = {},
    seasonal_activities = [],
    monthly_events = {},
    summary
  } = cityData;

  const {
    cityName,
    country,
    overview: cityOverview,
    attractions: cityAttractions,
    neighborhoods: cityNeighborhoods,
    culinaryGuide,
    connections: cityConnections,
    seasonalActivities,
    monthlyEvents,
    summary: citySummary,
    cityImage,
  } = cityData;

  const cityDisplayName = capitalize(cityName.replace(/-/g, " "));
  const countryDisplayName = capitalize(country.replace(/-/g, " "));

  // FIXED SECTION: Get proper map center based on city or country
  let mapCenter;
  const cityNameLower = cityName.toLowerCase();

  if (CITY_COORDINATES[cityNameLower]) {
    mapCenter = CITY_COORDINATES[cityNameLower];
    console.log(`Using CITY_COORDINATES for ${cityName}: [${mapCenter}]`);
  } else if (DEFAULT_COORDINATES[cityDisplayName]) {
    mapCenter = DEFAULT_COORDINATES[cityDisplayName];
    console.log(
      `Using DEFAULT_COORDINATES (cityDisplayName) for ${cityName}: [${mapCenter}]`
    );
  } else if (DEFAULT_COORDINATES[country]) {
    mapCenter = DEFAULT_COORDINATES[country];
    console.log(
      `Using DEFAULT_COORDINATES (country) for ${cityName}: [${mapCenter}]`
    );
  } else {
    mapCenter = DEFAULT_COORDINATES["default"];
    console.log(
      `Using DEFAULT_COORDINATES (default) for ${cityName}: [${mapCenter}]`
    );
  }

  // Override with first attraction coordinates if available
  if (cityAttractions && cityAttractions.sites && cityAttractions.sites.length > 0) {
    const firstAttraction = cityAttractions.sites[0];
    if (firstAttraction.longitude && firstAttraction.latitude) {
      mapCenter = [firstAttraction.longitude, firstAttraction.latitude];
      console.log(
        `Using attraction coordinates for ${cityName}: [${mapCenter}]`
      );
    }
  }

  let attractionCategories = [];
  if (cityAttractions && cityAttractions.sites) {
    const uniqueCategories = [
      ...new Set(
        cityAttractions.sites.map(
          (site) => site.category || site.type || "Uncategorized"
        )
      ),
    ];
    attractionCategories = uniqueCategories.map((category) => ({
      category,
      sites: cityAttractions.sites.filter(
        (site) => (site.category || site.type || "Uncategorized") === category
      ),
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact City Header */}
      <div className="relative h-32 bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
        <div className="container mx-auto px-4 md:px-6 py-3 flex h-full">
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center mb-1">
              <div className="px-2 py-0.5 bg-blue-600 bg-opacity-75 rounded-md text-xs font-medium mr-2">
                {countryDisplayName}
              </div>
              <h1 className="text-xl md:text-2xl font-bold">
                {cityDisplayName}
              </h1>
            </div>
            {citySummary && citySummary.brief_description && (
              <p className="text-xs opacity-90 leading-tight max-w-2xl line-clamp-1">
                {citySummary.brief_description}
              </p>
            )}
          </div>
          <div className="hidden md:flex flex-col justify-center items-end text-xs gap-1">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              <span>Best time: {citySummary?.best_time_to_visit || 'May-Sept'}</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Avg. visit: {citySummary?.recommended_duration || '2-3 days'}</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Currency: {countryDisplayName === "France" ? "Euro (€)" : 
                countryDisplayName === "United Kingdom" ? "Pound (£)" : "Euro (€)"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-6">
          <nav
            className="flex overflow-x-auto py-2.5 scrollbar-none"
            aria-label="City guide sections"
          >
            <ul className="flex space-x-6 min-w-full">
              {cityOverview && (
                <li>
                  <a
                    href="#overview"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    Overview
                  </a>
                </li>
              )}
              <li>
                <a
                  href="#map"
                  className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                >
                  Map
                </a>
              </li>
              <li>
                <a
                  href="#monthly-guide"
                  className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                >
                  Monthly Guide
                </a>
              </li>
              {Object.keys(monthlyEvents).length > 0 && (
                <li>
                  <a
                    href="#when-to-visit"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    When to Visit
                  </a>
                </li>
              )}
              {cityAttractions && cityAttractions.sites && (
                <li>
                  <a
                    href="#attractions"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    Attractions
                  </a>
                </li>
              )}
              {cityNeighborhoods && cityNeighborhoods.neighborhoods && (
                <li>
                  <a
                    href="#neighborhoods"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    Neighborhoods
                  </a>
                </li>
              )}
              {culinaryGuide && (
                <li>
                  <a
                    href="#food"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    Food &amp; Drink
                  </a>
                </li>
              )}
              {cityConnections && (
                <li>
                  <a
                    href="#transport"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    Transport
                  </a>
                </li>
              )}
              {seasonalActivities && (
                <li>
                  <a
                    href="#seasonal"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    Seasonal
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* City Overview Section */}
        {cityOverview && (
          <section id="overview" className="mb-6 scroll-mt-16">
            <div className="bg-white rounded-xl shadow-lg p-5 md:p-6 border border-gray-100">
              <h2 className="text-2xl font-bold">Paris</h2>
              <p className="text-gray-600 italic">City of Light ✨</p>
              <p className="text-gray-700 mt-2">The capital of France stands as a global icon of art, architecture, cuisine, and fashion. With its scenic riverbanks, historic monuments, and cultural treasures, Paris continues to enchant visitors with an atmosphere that balances historic grandeur with modern energy. From the iconic Eiffel Tower to charming café terraces, the city exemplifies joie de vivre. 🗼</p>
            </div>
          </section>
        )}

        {/* Map Section */}
        {cityAttractions && cityAttractions.sites && (
          <section id="map" className="mb-10 scroll-mt-16">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="border-b border-gray-100 px-5 py-3 flex justify-between items-center">
                <h3 className="font-medium text-gray-700">City Map</h3>
                <span className="text-xs text-gray-500">{cityAttractions.sites.length} attractions</span>
              </div>
              <MapSection
                attractions={cityAttractions.sites}
                categories={attractionCategories}
                cityName={cityDisplayName}
                center={mapCenter}
                zoom={13}
                showHeader={false}
              />
            </div>
          </section>
        )}

        {/* Best Time to Visit Section */}
        {Object.keys(monthlyEvents).length > 0 && (
          <section id="when-to-visit" className="mb-12 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Best Time to Visit
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <CityVisitSection
              city={city}
              cityName={cityDisplayName}
              countryName={countryDisplayName}
              monthlyData={monthlyEvents}
            />
          </section>
        )}

        {/* Monthly Guide Section */}
        <section id="monthly-guide" className="mb-10 scroll-mt-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Monthly Guide
            </h2>
            <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-5 md:p-6 border border-gray-100">
            {Object.keys(monthlyEvents).length > 0 ? (
              <MonthlyGuideSection
                city={city}
                cityName={cityDisplayName}
                monthlyData={monthlyEvents}
              />
            ) : (
              <div className="text-center py-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-10 w-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-3 text-base font-medium text-gray-900">
                  No Monthly Guide Available
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  We don&apos;t have specific monthly information for{" "}
                  {cityDisplayName} yet. Check back later for detailed monthly
                  guides.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Attractions Section */}
        {cityAttractions && cityAttractions.sites && (
          <section id="attractions" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Top Attractions
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <AttractionsList attractions={cityAttractions.sites} />
            </div>
          </section>
        )}

        {/* Neighborhoods Section */}
        {cityNeighborhoods && cityNeighborhoods.neighborhoods && (
          <section id="neighborhoods" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Neighborhoods
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <NeighborhoodsList neighborhoods={cityNeighborhoods.neighborhoods} />
            </div>
          </section>
        )}

        {/* Food & Drink Section */}
        {culinaryGuide && (
          <section id="food" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Food &amp; Drink
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <CulinaryGuide culinaryData={culinaryGuide} />
            </div>
          </section>
        )}

        {/* Getting Around Section */}
        {cityConnections && (
          <section id="transport" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Getting Around
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <TransportConnections
                connections={cityConnections}
                currentCity={city}
              />
            </div>
          </section>
        )}

        {/* Seasonal Activities Section */}
        {seasonalActivities && (
          <section id="seasonal" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Seasonal Activities
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <SeasonalActivities activities={seasonalActivities} />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Eurotrip Planner</h3>
              <p className="text-gray-300 mb-4">
                Your comprehensive guide to exploring Europe&apos;s most
                beautiful cities.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <Link href="/" className="hover:text-white transition">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/city-guides"
                    className="hover:text-white transition"
                  >
                    City Guides
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition">
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <Link href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} Eurotrip Planner. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
