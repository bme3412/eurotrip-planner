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
import CityHeader from '@/components/city-guides/CityHeader';
import MapSection from '@/components/city-guides/MapSection'; // Client component wrapper
import MonthlyVisitGuide from '@/components/city-guides/MonthlyVisitGuide';

// Function to capitalize the first letter of each word
const capitalize = (str) => {
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Get all available city folders
export async function generateStaticParams() {
  const dataDir = path.join(process.cwd(), 'src/data');
  const countries = fs.readdirSync(dataDir).filter(item => 
    !item.includes('.') && !item.includes('compressed_videos') && !item.includes('IMG_')
  );
  
  let cities = [];
  
  countries.forEach(country => {
    const countryPath = path.join(dataDir, country);
    const countryCities = fs.readdirSync(countryPath).filter(item => !item.includes('.'));
    
    countryCities.forEach(city => {
      cities.push({ city });
    });
  });
  
  return cities;
}

async function getCityData(cityName) {
  const dataDir = path.join(process.cwd(), 'src/data');
  const countries = fs.readdirSync(dataDir).filter(item => 
    !item.includes('.') && !item.includes('compressed_videos') && !item.includes('IMG_')
  );
  
  for (const country of countries) {
    const countryPath = path.join(dataDir, country);
    const countryCities = fs.readdirSync(countryPath).filter(item => !item.includes('.'));
    
    if (countryCities.includes(cityName)) {
      // Found the city, now get all the JSON data
      const cityPath = path.join(countryPath, cityName);
      
      // Get attractions data
      let attractions = null;
      try {
        const attractionsPath = path.join(cityPath, `${cityName}_attractions.json`);
        const attractionsData = fs.readFileSync(attractionsPath, 'utf8');
        attractions = JSON.parse(attractionsData);
        
        // Add categories to attractions if they don't have them
        if (attractions && attractions.sites) {
          attractions.sites = attractions.sites.map(site => ({
            ...site,
            category: site.category || site.type // Use type as category if category not present
          }));
        }
      } catch (error) {
        console.error(`No attractions data found for ${cityName}:`, error);
      }
      
      // Get neighborhoods data
      let neighborhoods = null;
      try {
        const neighborhoodsPath = path.join(cityPath, `${cityName}_neighborhoods.json`);
        neighborhoods = JSON.parse(fs.readFileSync(neighborhoodsPath, 'utf8'));
        
        // Ensure each neighborhood has a unique ID to avoid key conflicts
        if (neighborhoods && neighborhoods.neighborhoods) {
          neighborhoods.neighborhoods = neighborhoods.neighborhoods.map((neighborhood, index) => ({
            ...neighborhood,
            id: neighborhood.id || `neighborhood-${index}`
          }));
        }
      } catch (error) {
        console.error(`No neighborhoods data found for ${cityName}`);
      }
      
      // Get culinary guide data
      let culinaryGuide = null;
      try {
        const culinaryPath = path.join(cityPath, `${cityName}_culinary_guide.json`);
        culinaryGuide = JSON.parse(fs.readFileSync(culinaryPath, 'utf8'));
      } catch (error) {
        console.error(`No culinary guide found for ${cityName}`);
      }
      
      // Get connections data
      let connections = null;
      try {
        const connectionsPath = path.join(cityPath, `${cityName}_connections.json`);
        connections = JSON.parse(fs.readFileSync(connectionsPath, 'utf8'));
      } catch (error) {
        console.error(`No connections data found for ${cityName}`);
      }
      
      // Get seasonal activities data
      let seasonalActivities = null;
      try {
        const seasonalPath = path.join(cityPath, `${cityName}_seasonal_activities.json`);
        seasonalActivities = JSON.parse(fs.readFileSync(seasonalPath, 'utf8'));
      } catch (error) {
        console.error(`No seasonal activities data found for ${cityName}`);
      }
      
      // Get monthly events (if available)
      const monthlyPath = path.join(cityPath, 'monthly');
      let monthlyEvents = {};
      
      if (fs.existsSync(monthlyPath)) {
        const months = fs.readdirSync(monthlyPath).filter(file => file.endsWith('.json'));
        
        for (const month of months) {
          try {
            const monthData = JSON.parse(fs.readFileSync(path.join(monthlyPath, month), 'utf8'));
            // Extract month name from filename (e.g., "june.json" becomes "June")
            let monthName = month.replace('.json', '');
            
            // Handle different month formats (first letter uppercase)
            monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            
            // Check if the month data has a month-specific property structure
            if (monthData[monthName]) {
              // Format like paris/monthly/june.json with { "June": { ... } }
              monthlyEvents[monthName] = monthData[monthName];
            } else if (['Spring', 'Summer', 'Fall', 'Winter'].includes(monthName)) {
              // Handle seasonal data
              monthlyEvents[monthName] = monthData;
            } else {
              // For other formats, just use the data as is
              monthlyEvents[monthName] = monthData;
            }
            
            console.log(`Loaded monthly data for ${monthName}:`, Object.keys(monthlyEvents[monthName]));
          } catch (error) {
            console.error(`Error reading monthly data for ${month} in ${cityName}:`, error);
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
        cityImage
      };
    }
  }
  
  return null;
}

export default async function CityPage({ params }) {
  // Get city data with proper params handling
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
    cityImage
  } = cityData;
  
  const cityDisplayName = capitalize(cityName.replace(/-/g, ' '));
  const countryDisplayName = capitalize(country.replace(/-/g, ' '));
  
  // Get current month for default display in seasonal section
  const currentDate = new Date();
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentDate);
  
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
    // Extract unique categories
    const uniqueCategories = [...new Set(attractions.sites.map(site => site.category || site.type || 'Uncategorized'))];
    
    // Group attractions by category
    attractionCategories = uniqueCategories.map(category => ({
      category,
      sites: attractions.sites.filter(site => (site.category || site.type || 'Uncategorized') === category)
    }));
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner with City Image and Summary - Smaller height */}
      <div className="relative h-64 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
        {cityImage && (
          <div className="absolute inset-0 z-0 opacity-40">
            <Image 
              src={cityImage}
              alt={`${cityDisplayName}, ${countryDisplayName}`}
              fill
              style={{ objectFit: 'cover' }}
              priority
              unoptimized={true} // Use this if image isn't rendering properly
            />
          </div>
        )}
        <div className="container mx-auto px-6 py-6 relative z-10 flex flex-col justify-center h-full">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold mb-1">{cityDisplayName}</h1>
            <p className="text-lg mb-3">{countryDisplayName}</p>
            {summary && summary.brief_description && (
              <p className="text-base opacity-90 leading-relaxed line-clamp-2">{summary.brief_description}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-6 py-12">
        {/* Interactive Map Section with Attractions - Prominent Placement */}
        {attractions && attractions.sites && (
          <section className="mb-16">
            <MapSection 
              attractions={attractions.sites} 
              categories={attractionCategories}
              cityName={cityDisplayName}
              center={mapCenter}
              zoom={13}
            />
          </section>
        )}
        
        {/* Best Time to Visit Section - New Addition */}
        {Object.keys(monthlyEvents).length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Best Time to Visit</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <MonthlyVisitGuide monthlyData={monthlyEvents} currentMonth={currentMonth} />
            </div>
          </section>
        )}

        {/* City Overview Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">City Overview</h2>
              {summary && summary.full_description && (
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">{summary.full_description}</p>
                </div>
              )}
              {!summary && (
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {cityDisplayName} is a captivating destination located in {countryDisplayName}. 
                    Explore the city's rich history, vibrant culture, and unique attractions through our comprehensive guide.
                  </p>
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Quick Facts</h3>
              <div className="bg-white rounded-xl shadow-md p-6">
                <ul className="space-y-4">
                  {summary && summary.population && (
                    <li className="flex items-center">
                      <span className="text-blue-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                      </span>
                      <span className="text-gray-700">Population: {summary.population.toLocaleString()}</span>
                    </li>
                  )}
                  {summary && summary.language && (
                    <li className="flex items-center">
                      <span className="text-blue-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.8 2H12a1 1 0 110 2H8.2l-.8 2H10a1 1 0 110 2H7.2l-.8 2H9a1 1 0 010 2H5a1 1 0 01-.928-1.371L7 4.3A1 1 0 017 4V3a1 1 0 011-1zm6 11a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-4-4a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zm3-4a1 1 0 011-1h3a1 1 0 110 2h-3a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-gray-700">Language: {summary.language}</span>
                    </li>
                  )}
                  {summary && summary.currency && (
                    <li className="flex items-center">
                      <span className="text-blue-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-gray-700">Currency: {summary.currency}</span>
                    </li>
                  )}
                  {summary && summary.timezone && (
                    <li className="flex items-center">
                      <span className="text-blue-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-gray-700">Timezone: {summary.timezone}</span>
                    </li>
                  )}
                  {/* Add default facts if summary is missing */}
                  {!summary && (
                    <>
                      <li className="flex items-center">
                        <span className="text-blue-600 mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">Country: {countryDisplayName}</span>
                      </li>
                      {attractions && attractions.sites && (
                        <li className="flex items-center">
                          <span className="text-blue-600 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span className="text-gray-700">Attractions: {attractions.sites.length} places to visit</span>
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>
        
        {/* Attractions Section - Now with categorized listings */}
        {attractions && attractions.sites && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Top Attractions</h2>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <AttractionsList attractions={attractions.sites} />
            </div>
          </section>
        )}
        
        {/* Neighborhoods Section */}
        {neighborhoods && neighborhoods.neighborhoods && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Neighborhoods</h2>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <NeighborhoodsList neighborhoods={neighborhoods.neighborhoods} />
            </div>
          </section>
        )}
        
        {/* Food & Drink Section */}
        {culinaryGuide && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Food & Drink</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <CulinaryGuide culinaryData={culinaryGuide} />
            </div>
          </section>
        )}
        
        {/* Getting Around Section */}
        {connections && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Getting Around</h2>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <TransportConnections connections={connections} />
            </div>
          </section>
        )}
        
        {/* Seasonal Activities Section */}
        {seasonalActivities && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Seasonal Activities</h2>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <SeasonalActivities activities={seasonalActivities} />
            </div>
          </section>
        )}
        
        {/* Monthly Events Section - Now moved to a separate More Details section */}
        {Object.keys(monthlyEvents).length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Monthly Events Calendar</h2>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <MonthlyEvents monthlyData={monthlyEvents} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}