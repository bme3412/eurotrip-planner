// src/app/city-guides/[city]/page.js
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import Image from 'next/image';

// Import components
import AttractionsList from '@/components/city-guides/AttractionsList';
import NeighborhoodsList from '@/components/city-guides/NeighborhoodsList';
import CulinaryGuide from '@/components/city-guides/CulinaryGuide';
import TransportConnections from '@/components/city-guides/TransportConnections';
import SeasonalActivities from '@/components/city-guides/SeasonalActivities';
import MonthlyEvents from '@/components/city-guides/MonthlyEvents';
import MapSection from '@/components/city-guides/MapSection';
import CityVisitSection from '@/components/city-guides/CityVisitSection';

// Function to capitalize the first letter of each word
const capitalize = (str) => {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Get all available city folders
export async function generateStaticParams() {
  const dataDir = path.join(process.cwd(), 'src/data');
  const countries = fs
    .readdirSync(dataDir)
    .filter(
      (item) =>
        !item.includes('.') &&
        !item.includes('compressed_videos') &&
        !item.includes('IMG_')
    );

  let cities = [];

  countries.forEach((country) => {
    const countryPath = path.join(dataDir, country);
    const countryCities = fs.readdirSync(countryPath).filter(
      (item) => !item.includes('.')
    );

    countryCities.forEach((city) => {
      cities.push({ city });
    });
  });

  return cities;
}

async function getCityData(cityName) {
  const dataDir = path.join(process.cwd(), 'src/data');
  const countries = fs
    .readdirSync(dataDir)
    .filter(
      (item) =>
        !item.includes('.') &&
        !item.includes('compressed_videos') &&
        !item.includes('IMG_')
    );

  for (const country of countries) {
    const countryPath = path.join(dataDir, country);
    const countryCities = fs
      .readdirSync(countryPath)
      .filter((item) => !item.includes('.'));

    if (countryCities.includes(cityName)) {
      const cityPath = path.join(countryPath, cityName);

      // Get attractions data
      let attractions = null;
      try {
        const attractionsPath = path.join(
          cityPath,
          `${cityName}_attractions.json`
        );
        const attractionsData = fs.readFileSync(attractionsPath, 'utf8');
        attractions = JSON.parse(attractionsData);

        // Add categories to attractions if they don't have them
        if (attractions && attractions.sites) {
          attractions.sites = attractions.sites.map((site) => ({
            ...site,
            category: site.category || site.type, // Use type as category if category not present
          }));
        }
      } catch (error) {
        console.error(`No attractions data found for ${cityName}:`, error);
      }

      // Get neighborhoods data
      let neighborhoods = null;
      try {
        const neighborhoodsPath = path.join(
          cityPath,
          `${cityName}_neighborhoods.json`
        );
        neighborhoods = JSON.parse(fs.readFileSync(neighborhoodsPath, 'utf8'));

        // Ensure each neighborhood has a unique ID to avoid key conflicts
        if (neighborhoods && neighborhoods.neighborhoods) {
          neighborhoods.neighborhoods = neighborhoods.neighborhoods.map(
            (neighborhood, index) => ({
              ...neighborhood,
              id: neighborhood.id || `neighborhood-${index}`,
            })
          );
        }
      } catch (error) {
        console.error(`No neighborhoods data found for ${cityName}`);
      }

      // Get culinary guide data
      let culinaryGuide = null;
      try {
        const culinaryPath = path.join(
          cityPath,
          `${cityName}_culinary_guide.json`
        );
        culinaryGuide = JSON.parse(fs.readFileSync(culinaryPath, 'utf8'));
      } catch (error) {
        console.error(`No culinary guide found for ${cityName}`);
      }

      // Get connections data
      let connections = null;
      try {
        const connectionsPath = path.join(
          cityPath,
          `${cityName}_connections.json`
        );
        connections = JSON.parse(fs.readFileSync(connectionsPath, 'utf8'));
      } catch (error) {
        console.error(`No connections data found for ${cityName}`);
      }

      // Get seasonal activities data
      let seasonalActivities = null;
      try {
        const seasonalPath = path.join(
          cityPath,
          `${cityName}_seasonal_activities.json`
        );
        seasonalActivities = JSON.parse(fs.readFileSync(seasonalPath, 'utf8'));
      } catch (error) {
        console.error(`No seasonal activities data found for ${cityName}`);
      }

      // Get monthly events (if available)
      const monthlyPath = path.join(cityPath, 'monthly');
      let monthlyEvents = {};

      if (fs.existsSync(monthlyPath)) {
        const months = fs
          .readdirSync(monthlyPath)
          .filter((file) => file.endsWith('.json'));

        for (const month of months) {
          try {
            const monthData = JSON.parse(
              fs.readFileSync(path.join(monthlyPath, month), 'utf8')
            );
            // Extract month name from filename (e.g., "june.json" becomes "June")
            let monthName = month.replace('.json', '');
            monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            if (monthData[monthName]) {
              monthlyEvents[monthName] = monthData[monthName];
            } else if (['Spring', 'Summer', 'Fall', 'Winter'].includes(monthName)) {
              monthlyEvents[monthName] = monthData;
            } else {
              monthlyEvents[monthName] = monthData;
            }
          } catch (error) {
            console.error(
              `Error reading monthly data for ${month} in ${cityName}:`,
              error
            );
          }
        }
      }

      // Get summary if available
      let summary = null;
      try {
        const summaryPath = path.join(cityPath, 'generation_summary.json');
        summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      } catch (error) {
        console.error(`No summary data found for ${cityName}`);
      }

      // Set a default city image
      let cityImage = '/images/cities/default-city.jpg';

      return {
        cityName,
        country,
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

  return null;
}

export default async function CityPage({ params }) {
  // Fixed: Make sure params.city is properly awaited
  const cityData = await getCityData(params.city);

  if (!cityData) {
    notFound();
  }

  const {
    cityName,
    country,
    attractions,
    neighborhoods,
    culinaryGuide,
    connections,
    seasonalActivities,
    monthlyEvents,
    summary,
    cityImage,
  } = cityData;

  const cityDisplayName = capitalize(cityName.replace(/-/g, ' '));
  const countryDisplayName = capitalize(country.replace(/-/g, ' '));

  // Find the center coordinates for the map (use the first attraction or a default)
  let mapCenter = [2.3522, 48.8566]; // Default to Paris coordinates
  if (attractions && attractions.sites && attractions.sites.length > 0) {
    const firstAttraction = attractions.sites[0];
    if (firstAttraction.longitude && firstAttraction.latitude) {
      mapCenter = [firstAttraction.longitude, firstAttraction.latitude];
    }
  }

  // Group attractions by category for map display
  let attractionCategories = [];
  if (attractions && attractions.sites) {
    const uniqueCategories = [
      ...new Set(
        attractions.sites.map(
          (site) => site.category || site.type || 'Uncategorized'
        )
      ),
    ];
    attractionCategories = uniqueCategories.map((category) => ({
      category,
      sites: attractions.sites.filter(
        (site) => (site.category || site.type || 'Uncategorized') === category
      ),
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner with City Image and Summary */}
      <div className="relative h-56 md:h-72 bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
        {cityImage && (
          <div className="absolute inset-0 z-0 opacity-40">
            <Image
              src={cityImage}
              alt={`${cityDisplayName}, ${countryDisplayName}`}
              fill
              style={{ objectFit: 'cover' }}
              priority
              unoptimized={true}
            />
          </div>
        )}
        {/* Overlay with valid z-index */}
        <div className="absolute inset-0 bg-black bg-opacity-20 z-10"></div>
        <div className="container mx-auto px-4 md:px-6 py-6 relative z-20 flex flex-col justify-end h-full">
          <div className="max-w-4xl">
            <div className="inline-block px-2 py-1 bg-blue-600 bg-opacity-75 rounded-md text-xs font-medium mb-1">
              {countryDisplayName}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {cityDisplayName}
            </h1>
            {summary && summary.brief_description && (
              <p className="text-sm md:text-base opacity-95 leading-relaxed max-w-3xl line-clamp-2">
                {summary.brief_description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <div className="container mx-auto px-4 md:px-6">
          <nav
            className="flex overflow-x-auto py-3 scrollbar-none"
            aria-label="City guide sections"
          >
            <ul className="flex space-x-6 min-w-full">
              <li>
                <a
                  href="#overview"
                  className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                >
                  Overview
                </a>
              </li>
              {Object.keys(monthlyEvents).length > 0 && (
                <li>
                  <a
                    href="#when-to-visit"
                    className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                  >
                    When to Visit
                  </a>
                </li>
              )}
              {attractions && attractions.sites && (
                <li>
                  <a
                    href="#attractions"
                    className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                  >
                    Attractions
                  </a>
                </li>
              )}
              {neighborhoods && neighborhoods.neighborhoods && (
                <li>
                  <a
                    href="#neighborhoods"
                    className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                  >
                    Neighborhoods
                  </a>
                </li>
              )}
              {culinaryGuide && (
                <li>
                  <a
                    href="#food"
                    className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                  >
                    Food &amp; Drink
                  </a>
                </li>
              )}
              {connections && (
                <li>
                  <a
                    href="#transport"
                    className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                  >
                    Transport
                  </a>
                </li>
              )}
              {seasonalActivities && (
                <li>
                  <a
                    href="#seasonal"
                    className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                  >
                    Seasonal
                  </a>
                </li>
              )}
              {Object.keys(monthlyEvents).length > 0 && (
                <li>
                  <a
                    href="#events"
                    className="text-blue-700 font-medium whitespace-nowrap hover:text-blue-900 transition"
                  >
                    Events
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Interactive Map Section with Attractions */}
        {attractions && attractions.sites && (
          <section className="mb-16">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <MapSection
                attractions={attractions.sites}
                categories={attractionCategories}
                cityName={cityDisplayName}
                center={mapCenter}
                zoom={13}
              />
            </div>
          </section>
        )}

        {/* Best Time to Visit Section */}
        {Object.keys(monthlyEvents).length > 0 && (
          <section id="when-to-visit" className="mb-16 scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Best Time to Visit
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            
            {/* Use the client component wrapper for all calendar functionality */}
            <CityVisitSection 
              cityName={cityDisplayName}
              countryName={countryDisplayName}
              monthlyData={monthlyEvents}
            />
          </section>
        )}

        {/* City Overview Section */}
        <section id="overview" className="mb-16 scroll-mt-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              City Overview
            </h2>
            <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                {summary && summary.full_description ? (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {summary.full_description}
                    </p>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {cityDisplayName} is a captivating destination located in{' '}
                      {countryDisplayName}. Explore the city&apos;s rich history,
                      vibrant culture, and unique attractions through our
                      comprehensive guide.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 pb-3 border-b">
                  Quick Facts
                </h3>
                <ul className="space-y-4 mt-4">
                  {/* Country */}
                  <li className="flex items-center">
                    <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mr-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <div>
                      <span className="block text-sm text-gray-500">
                        Country
                      </span>
                      <span className="text-gray-800 font-medium">
                        {countryDisplayName}
                      </span>
                    </div>
                  </li>
                  {/* Population */}
                  {summary && summary.population && (
                    <li className="flex items-center">
                      <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mr-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                      </span>
                      <div>
                        <span className="block text-sm text-gray-500">
                          Population
                        </span>
                        <span className="text-gray-800 font-medium">
                          {summary.population.toLocaleString()}
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Attractions Section */}
        {attractions && attractions.sites && (
          <section id="attractions" className="mb-16 scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Top Attractions
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <AttractionsList attractions={attractions.sites} />
            </div>
          </section>
        )}

        {/* Neighborhoods Section */}
        {neighborhoods && neighborhoods.neighborhoods && (
          <section id="neighborhoods" className="mb-16 scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Neighborhoods
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <NeighborhoodsList neighborhoods={neighborhoods.neighborhoods} />
            </div>
          </section>
        )}

        {/* Food & Drink Section */}
        {culinaryGuide && (
          <section id="food" className="mb-16 scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Food &amp; Drink
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <CulinaryGuide culinaryData={culinaryGuide} />
            </div>
          </section>
        )}

        {/* Getting Around Section */}
        {connections && (
          <section id="transport" className="mb-16 scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Getting Around
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <TransportConnections connections={connections} />
            </div>
          </section>
        )}

        {/* Seasonal Activities Section */}
        {seasonalActivities && (
          <section id="seasonal" className="mb-16 scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Seasonal Activities
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <SeasonalActivities activities={seasonalActivities} />
            </div>
          </section>
        )}

        {/* Monthly Events Section */}
        {Object.keys(monthlyEvents).length > 0 && (
          <section id="events" className="mb-16 scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Monthly Events Calendar
              </h2>
              <div className="hidden md:block h-px bg-gray-200 flex-grow ml-4"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <MonthlyEvents monthlyData={monthlyEvents} />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-16">
        {/* Footer content... */}
      </footer>

      {/* Back to top button */}
      <div className="fixed bottom-8 right-8">
        <a
          href="#"
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
          aria-label="Back to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}