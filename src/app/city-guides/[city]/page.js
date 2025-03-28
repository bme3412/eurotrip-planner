import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import Image from "next/image";

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

// Get all available city folders
export async function generateStaticParams() {
  // Try multiple data directories
  const possibleDataDirs = [path.join(process.cwd(), "public/data")];

  let dataDir = null;

  // Find the first data directory that exists
  for (const dir of possibleDataDirs) {
    if (fs.existsSync(dir)) {
      dataDir = dir;
      console.log(`Found data directory for generateStaticParams at: ${dataDir}`);
      break;
    }
  }

  if (!dataDir) {
    console.error("No valid data directory found for generateStaticParams");
    return [];
  }

  // Check if countries can be listed
  let countries = [];
  try {
    countries = fs
      .readdirSync(dataDir)
      .filter(
        (item) =>
          !item.includes(".") &&
          !item.includes("compressed_videos") &&
          !item.includes("IMG_")
      );
  } catch (error) {
    console.error(`Error reading data directory: ${error}`);
    return [];
  }

  let cities = [];

  countries.forEach((country) => {
    const countryPath = path.join(dataDir, country);

    // Skip if not a directory
    if (
      !fs.existsSync(countryPath) ||
      !fs.statSync(countryPath).isDirectory()
    ) {
      return;
    }

    try {
      const countryCities = fs
        .readdirSync(countryPath)
        .filter(
          (item) =>
            !item.includes(".") &&
            fs.statSync(path.join(countryPath, item)).isDirectory()
        );

      countryCities.forEach((city) => {
        cities.push({ city });
      });
    } catch (error) {
      console.error(`Error reading country directory ${country}: ${error}`);
    }
  });

  return cities;
}

async function getCityData(cityName) {
  // Try multiple data directories
  const possibleDataDirs = [path.join(process.cwd(), "public/data")];

  let dataDir = null;

  // Find the first data directory that exists
  for (const dir of possibleDataDirs) {
    if (fs.existsSync(dir)) {
      dataDir = dir;
      console.log(`Found data directory at: ${dataDir}`);
      break;
    }
  }

  if (!dataDir) {
    console.error("No valid data directory found");
    return null;
  }

  // List all countries in the data directory
  let countries = [];
  try {
    countries = fs
      .readdirSync(dataDir)
      .filter(
        (item) =>
          !item.includes(".") &&
          !item.includes("compressed_videos") &&
          !item.includes("IMG_")
      );
  } catch (error) {
    console.error(`Error reading data directory: ${error}`);
    return null;
  }

  for (const country of countries) {
    const countryPath = path.join(dataDir, country);

    // Skip if not a directory
    if (
      !fs.existsSync(countryPath) ||
      !fs.statSync(countryPath).isDirectory()
    ) {
      continue;
    }

    let countryCities = [];
    try {
      countryCities = fs
        .readdirSync(countryPath)
        .filter(
          (item) =>
            !item.includes(".") &&
            fs.statSync(path.join(countryPath, item)).isDirectory()
        );
    } catch (error) {
      console.error(`Error reading country directory ${country}: ${error}`);
      continue;
    }

    if (countryCities.includes(cityName)) {
      const cityPath = path.join(countryPath, cityName);

      // Get overview data - NEW SECTION
      let overview = null;
      try {
        const possibleOverviewPaths = [
          path.join(cityPath, `${cityName}-overview.json`),
          path.join(cityPath, `paris-overview.json`), // Special case for Paris
          path.join(cityPath, `${cityName}_overview.json`),
          path.join(cityPath, `overview.json`),
        ];

        for (const overviewPath of possibleOverviewPaths) {
          if (fs.existsSync(overviewPath)) {
            const overviewData = fs.readFileSync(overviewPath, "utf8");
            overview = JSON.parse(overviewData);
            console.log(`Found overview file at: ${overviewPath}`);
            break;
          }
        }

        if (!overview) {
          console.log(`No overview file found for ${cityName}`);
        }
      } catch (error) {
        console.error(`Error loading overview data for ${cityName}:`, error);
      }

      // Get attractions data
      let attractions = null;
      try {
        const possibleAttractionPaths = [
          path.join(cityPath, `${cityName}_attractions.json`),
          path.join(cityPath, `attractions.json`),
          path.join(cityPath, `${cityName}-attractions.json`),
        ];

        for (const attractionsPath of possibleAttractionPaths) {
          if (fs.existsSync(attractionsPath)) {
            const attractionsData = fs.readFileSync(attractionsPath, "utf8");
            attractions = JSON.parse(attractionsData);
            if (attractions && attractions.sites) {
              attractions.sites = attractions.sites.map((site) => ({
                ...site,
                category: site.category || site.type,
              }));
            }
            break;
          }
        }

        if (!attractions) {
          console.log(`No attractions file found for ${cityName}`);
        }
      } catch (error) {
        console.error(`Error loading attractions data for ${cityName}:`, error);
      }

      // Get neighborhoods data
      let neighborhoods = null;
      try {
        const possibleNeighborhoodPaths = [
          path.join(cityPath, `${cityName}_neighborhoods.json`),
          path.join(cityPath, `neighborhoods.json`),
          path.join(cityPath, `${cityName}-neighborhoods.json`),
        ];

        for (const neighborhoodsPath of possibleNeighborhoodPaths) {
          if (fs.existsSync(neighborhoodsPath)) {
            neighborhoods = JSON.parse(
              fs.readFileSync(neighborhoodsPath, "utf8")
            );
            if (neighborhoods && neighborhoods.neighborhoods) {
              neighborhoods.neighborhoods = neighborhoods.neighborhoods.map(
                (neighborhood, index) => ({
                  ...neighborhood,
                  id: neighborhood.id || `neighborhood-${index}`,
                })
              );
            }
            break;
          }
        }

        if (!neighborhoods) {
          console.log(`No neighborhoods file found for ${cityName}`);
        }
      } catch (error) {
        console.error(
          `Error loading neighborhoods data for ${cityName}:`,
          error
        );
      }

      // Get culinary guide data
      let culinaryGuide = null;
      try {
        const possibleCulinaryPaths = [
          path.join(cityPath, `${cityName}_culinary_guide.json`),
          path.join(cityPath, `culinary_guide.json`),
          path.join(cityPath, `${cityName}-culinary-guide.json`),
          path.join(cityPath, `culinary-guide.json`),
        ];

        for (const culinaryPath of possibleCulinaryPaths) {
          if (fs.existsSync(culinaryPath)) {
            culinaryGuide = JSON.parse(fs.readFileSync(culinaryPath, "utf8"));
            break;
          }
        }

        if (!culinaryGuide) {
          console.log(`No culinary guide found for ${cityName}`);
        }
      } catch (error) {
        console.error(`Error loading culinary guide for ${cityName}:`, error);
      }

      // Get connections data
      let connections = null;
      try {
        const possibleConnectionsPaths = [
          path.join(cityPath, `${cityName}_connections.json`),
          path.join(cityPath, `connections.json`),
          path.join(cityPath, `${cityName}-connections.json`),
        ];

        for (const connectionsPath of possibleConnectionsPaths) {
          if (fs.existsSync(connectionsPath)) {
            connections = JSON.parse(fs.readFileSync(connectionsPath, "utf8"));
            break;
          }
        }

        if (!connections) {
          console.log(`No connections data found for ${cityName}`);
        }
      } catch (error) {
        console.error(`Error loading connections data for ${cityName}:`, error);
      }

      // Get seasonal activities data
      let seasonalActivities = null;
      try {
        const possibleSeasonalPaths = [
          path.join(cityPath, `${cityName}_seasonal_activities.json`),
          path.join(cityPath, `seasonal_activities.json`),
          path.join(cityPath, `${cityName}-seasonal-activities.json`),
          path.join(cityPath, `seasonal-activities.json`),
        ];

        for (const seasonalPath of possibleSeasonalPaths) {
          if (fs.existsSync(seasonalPath)) {
            seasonalActivities = JSON.parse(
              fs.readFileSync(seasonalPath, "utf8")
            );
            break;
          }
        }

        if (!seasonalActivities) {
          console.log(`No seasonal activities data found for ${cityName}`);
        }
      } catch (error) {
        console.error(
          `Error loading seasonal activities for ${cityName}:`,
          error
        );
      }

      // Get monthly events (if available)
      const monthlyPath = path.join(cityPath, "monthly");
      let monthlyEvents = {};

      if (
        fs.existsSync(monthlyPath) &&
        fs.statSync(monthlyPath).isDirectory()
      ) {
        try {
          const months = fs
            .readdirSync(monthlyPath)
            .filter((file) => file.endsWith(".json"));

          for (const month of months) {
            try {
              const monthData = JSON.parse(
                fs.readFileSync(path.join(monthlyPath, month), "utf8")
              );
              let monthName = month.replace(".json", "");
              monthName =
                monthName.charAt(0).toUpperCase() + monthName.slice(1);

              if (monthData[monthName]) {
                monthlyEvents[monthName.toLowerCase()] = monthData[monthName];
              } else if (
                ["Spring", "Summer", "Fall", "Winter"].includes(monthName)
              ) {
                monthlyEvents[monthName.toLowerCase()] = monthData;
              } else {
                monthlyEvents[monthName.toLowerCase()] = monthData;
              }
            } catch (error) {
              console.error(
                `Error reading monthly data for ${month} in ${cityName}:`,
                error
              );
            }
          }
        } catch (error) {
          console.error(`Error reading monthly directory: ${error}`);
        }
      } else {
        console.log(`No monthly directory found for ${cityName}`);

        // Try to load visit calendar as an alternative
        try {
          const possibleCalendarPaths = [
            path.join(cityPath, `${cityName}-visit-calendar.json`),
            path.join(cityPath, `${cityName}_visit_calendar.json`),
            path.join(cityPath, `visit-calendar.json`),
            path.join(cityPath, `visit_calendar.json`),
          ];

          for (const calendarPath of possibleCalendarPaths) {
            if (fs.existsSync(calendarPath)) {
              console.log(`Found visit calendar at: ${calendarPath}`);
              const calendarData = JSON.parse(
                fs.readFileSync(calendarPath, "utf8")
              );

              if (calendarData.months) {
                monthlyEvents = calendarData.months;
              } else {
                const seasonalKeys = ["Spring", "Summer", "Fall", "Winter"];
                const monthlyKeys = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ];

                const hasSeasonalData = seasonalKeys.some(
                  (key) => key in calendarData
                );
                const hasMonthlyData = monthlyKeys.some(
                  (key) => key in calendarData
                );

                if (hasSeasonalData || hasMonthlyData) {
                  monthlyEvents = { ...calendarData };
                }
              }
              break;
            }
          }
        } catch (error) {
          console.error(`Error loading visit calendar for ${cityName}:`, error);
        }
      }

      // Get summary if available
      let summary = null;
      try {
        const possibleSummaryPaths = [
          path.join(cityPath, "generation_summary.json"),
          path.join(cityPath, "summary.json"),
          path.join(cityPath, `${cityName}-summary.json`),
          path.join(cityPath, `${cityName}_summary.json`),
        ];

        for (const summaryPath of possibleSummaryPaths) {
          if (fs.existsSync(summaryPath)) {
            summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
            break;
          }
        }

        if (!summary) {
          console.log(`No summary data found for ${cityName}`);
        }
      } catch (error) {
        console.error(`Error loading summary for ${cityName}:`, error);
      }

      // Check for city image in public directory
      let cityImage = "/images/cities/default-city.jpg";
      const possibleImagePaths = [
        path.join(
          process.cwd(),
          "public",
          "images",
          "cities",
          `${cityName}.jpg`
        ),
        path.join(
          process.cwd(),
          "public",
          "images",
          "cities",
          `${cityName.toLowerCase()}.jpg`
        ),
        path.join(
          process.cwd(),
          "public",
          "images",
          `${cityName}-thumbnail.jpg`
        ),
        path.join(
          process.cwd(),
          "public",
          "images",
          `${cityName.toLowerCase()}-thumbnail.jpg`
        ),
      ];

      for (const imagePath of possibleImagePaths) {
        if (fs.existsSync(imagePath)) {
          const relativePath = imagePath.replace(
            path.join(process.cwd(), "public"),
            ""
          );
          cityImage = relativePath;
          console.log(`Found city image at: ${cityImage}`);
          break;
        }
      }

      return {
        cityName,
        country,
        overview,
        attractions,
        neighborhoods,
        culinaryGuide,
        connections,
        seasonalActivities,
        monthlyEvents,
        summary,
        cityImage,
      };
    }
  }

  console.error(`City not found: ${cityName}`);
  return null;
}

export default async function CityPage({ params }) {
  // Make sure params is resolved before destructuring
  const resolvedParams = await params;
  const { city } = resolvedParams;

  const cityData = await getCityData(city);

  if (!cityData) {
    notFound();
  }

  const {
    cityName,
    country,
    overview,
    attractions,
    neighborhoods,
    culinaryGuide,
    connections,
    seasonalActivities,
    monthlyEvents,
    summary,
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
  if (attractions && attractions.sites && attractions.sites.length > 0) {
    const firstAttraction = attractions.sites[0];
    if (firstAttraction.longitude && firstAttraction.latitude) {
      mapCenter = [firstAttraction.longitude, firstAttraction.latitude];
      console.log(
        `Using attraction coordinates for ${cityName}: [${mapCenter}]`
      );
    }
  }

  let attractionCategories = [];
  if (attractions && attractions.sites) {
    const uniqueCategories = [
      ...new Set(
        attractions.sites.map(
          (site) => site.category || site.type || "Uncategorized"
        )
      ),
    ];
    attractionCategories = uniqueCategories.map((category) => ({
      category,
      sites: attractions.sites.filter(
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
            {summary && summary.brief_description && (
              <p className="text-xs opacity-90 leading-tight max-w-2xl line-clamp-1">
                {summary.brief_description}
              </p>
            )}
          </div>
          <div className="hidden md:flex flex-col justify-center items-end text-xs gap-1">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              <span>Best time: {summary?.best_time_to_visit || 'May-Sept'}</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Avg. visit: {summary?.recommended_duration || '2-3 days'}</span>
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
              {overview && (
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
              {attractions && attractions.sites && (
                <li>
                  <a
                    href="#attractions"
                    className="text-blue-700 text-sm font-medium whitespace-nowrap hover:text-blue-900 transition border-b-2 border-transparent hover:border-blue-700 py-1.5 px-0.5"
                  >
                    Attractions
                  </a>
                </li>
              )}
              {neighborhoods && neighborhoods.neighborhoods && (
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
              {connections && (
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
        {overview && (
          <section id="overview" className="mb-6 scroll-mt-16">
            <div className="bg-white rounded-xl shadow-lg p-5 md:p-6 border border-gray-100">
              <h2 className="text-2xl font-bold">Paris</h2>
              <p className="text-gray-600 italic">City of Light ✨</p>
              <p className="text-gray-700 mt-2">The capital of France stands as a global icon of art, architecture, cuisine, and fashion. With its scenic riverbanks, historic monuments, and cultural treasures, Paris continues to enchant visitors with an atmosphere that balances historic grandeur with modern energy. From the iconic Eiffel Tower to charming café terraces, the city exemplifies joie de vivre. 🗼</p>
            </div>
          </section>
        )}

        {/* Map Section */}
        {attractions && attractions.sites && (
          <section id="map" className="mb-10 scroll-mt-16">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="border-b border-gray-100 px-5 py-3 flex justify-between items-center">
                <h3 className="font-medium text-gray-700">City Map</h3>
                <span className="text-xs text-gray-500">{attractions.sites.length} attractions</span>
              </div>
              <MapSection
                attractions={attractions.sites}
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
              city={cityName}
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
                city={cityName}
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
        {attractions && attractions.sites && (
          <section id="attractions" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Top Attractions
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <AttractionsList attractions={attractions.sites} />
            </div>
          </section>
        )}

        {/* Neighborhoods Section */}
        {neighborhoods && neighborhoods.neighborhoods && (
          <section id="neighborhoods" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Neighborhoods
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <NeighborhoodsList neighborhoods={neighborhoods.neighborhoods} />
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
        {connections && (
          <section id="transport" className="mb-10 scroll-mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Getting Around
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <TransportConnections
                connections={connections}
                currentCity={cityName}
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
                  <a href="/" className="hover:text-white transition">
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="/city-guides"
                    className="hover:text-white transition"
                  >
                    City Guides
                  </a>
                </li>
                <li>
                  <a href="/about" className="hover:text-white transition">
                    About
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </a>
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
