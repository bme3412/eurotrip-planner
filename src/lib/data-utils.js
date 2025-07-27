// Data utilities for city information management
import fs from 'fs';
import path from 'path';
import { getImageUrl, isCDNEnabled } from '../utils/cdnUtils';

/**
 * Unified city data structure interface
 */
export const CITY_DATA_SCHEMA = {
  id: String,
  name: String,
  country: String,
  region: String,
  coordinates: { lat: Number, lng: Number },
  description: String,
  thumbnail: String,
  attractions: Array,
  neighborhoods: Array,
  culinary: Object,
  transport: Object,
  seasonal: Object,
  monthly: Object,
  metadata: {
    lastUpdated: Date,
    dataVersion: String,
    completeness: Number
  }
};

/**
 * Cache for city data to avoid repeated file system operations
 */
const cityDataCache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Generate thumbnail path for a city
 * Updated to use CDN for optimized images
 */
function generateThumbnailPath(cityId) {
  // If CDN is enabled, use optimized images from CloudFront
  if (isCDNEnabled()) {
    // Use the new optimized naming convention (city.jpeg)
    return getImageUrl(`/images/${cityId}.jpeg`);
  }
  
  // For local development, check optimized directory first
  const optimizedPath = `/images/optimized/${cityId}.jpeg`;
  const optimizedFullPath = path.join(process.cwd(), 'public', optimizedPath);
  if (fs.existsSync(optimizedFullPath)) {
    return optimizedPath;
  }
  
  // Fallback to local files for development
  const possiblePaths = [
    `/images/${cityId}-thumbnail.jpeg`,
    `/images/${cityId}-thumbnail.jpg`, 
    `/images/${cityId}-thumbnail.png`,
    `/images/${cityId}-thumbnail.webp`,
    `/images/${cityId}.jpeg`,
    `/images/${cityId}.jpg`,
    `/images/${cityId}.png`,
    `/images/${cityId}.webp`
  ];
  
  // Check which files actually exist
  for (const imagePath of possiblePaths) {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    try {
      if (fs.existsSync(fullPath)) {
        return imagePath;
      }
    } catch (error) {
      // Continue to next path
    }
  }
  
  // Return default placeholder if no image found
  return '/images/city-placeholder.svg';
}

/**
 * Get region for a city based on country
 */
function getRegionForCountry(country) {
  const regionMap = {
    'France': 'Atlantic Europe',
    'Germany': 'Central Europe', 
    'Netherlands': 'Atlantic Europe',
    'Spain': 'Mediterranean',
    'Italy': 'Mediterranean',
    'Austria': 'Alpine',
    'Belgium': 'Atlantic Europe',
    'Denmark': 'Nordic',
    'Ireland': 'Celtic & Nordic',
    'Portugal': 'Atlantic Europe',
    'Greece': 'Mediterranean',
    'Sweden': 'Nordic',
    'Norway': 'Nordic',
    'Finland': 'Nordic',
    'Switzerland': 'Alpine',
    'Czech Republic': 'Central Europe',
    'Hungary': 'Central Europe',
    'Poland': 'Central Europe',
    'Croatia': 'Mediterranean',
    'Estonia': 'Nordic',
    'Latvia': 'Nordic',
    'Lithuania': 'Nordic',
    'Slovenia': 'Alpine',
    'Slovakia': 'Central Europe'
  };
  
  return regionMap[country] || 'Other';
}

/**
 * Get all available cities with basic information
 */
export async function getAllCities() {
  const cacheKey = 'all-cities';
  const cached = cityDataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const dataPath = path.join(process.cwd(), 'public/data');
    const countries = await fs.promises.readdir(dataPath, { withFileTypes: true });
    
    const cities = [];
    
    for (const country of countries) {
      if (!country.isDirectory() || country.name.includes('.')) continue;
      
      const countryPath = path.join(dataPath, country.name);
      try {
        const cityDirs = await fs.promises.readdir(countryPath, { withFileTypes: true });
        
        for (const cityDir of cityDirs) {
          if (!cityDir.isDirectory()) continue;
          
          const cityData = {
            id: cityDir.name,
            name: formatCityName(cityDir.name),
            country: country.name,
            slug: cityDir.name,
            region: getRegionForCountry(country.name),
            thumbnail: generateThumbnailPath(cityDir.name)
          };
          
          // Try to get basic info from overview or summary
          const cityPath = path.join(countryPath, cityDir.name);
          const overview = await loadCityFile(cityPath, 'overview') || 
                          await loadCityFile(cityPath, 'summary');
          
          if (overview) {
            cityData.description = overview.brief_description || overview.description;
            cityData.coordinates = {
              lat: overview.latitude || overview.lat,
              lng: overview.longitude || overview.lng || overview.lon
            };
          }
          
          cities.push(cityData);
        }
      } catch (error) {
        console.warn(`Error processing country ${country.name}:`, error.message);
      }
    }
    
    const result = cities.sort((a, b) => a.name.localeCompare(b.name));
    cityDataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  } catch (error) {
    console.error('Error getting all cities:', error);
    return [];
  }
}

/**
 * Get detailed city data by city ID
 */
export async function getCityData(cityId) {
  const cacheKey = `city-${cityId}`;
  const cached = cityDataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const cityPath = await findCityPath(cityId);
    if (!cityPath) return null;

    const [overview, attractions, neighborhoods, culinary, transport, seasonal, monthly] = await Promise.all([
      loadCityFile(cityPath, 'overview'),
      loadCityFile(cityPath, 'attractions'),
      loadCityFile(cityPath, 'neighborhoods'),
      loadCityFile(cityPath, 'culinary_guide'),
      loadCityFile(cityPath, 'connections'),
      loadCityFile(cityPath, 'seasonal_activities'),
      loadMonthlyData(cityPath)
    ]);

    const country = path.basename(path.dirname(cityPath));
    const cityData = {
      id: cityId,
      name: formatCityName(cityId),
      country,
      region: getRegionForCountry(country),
      thumbnail: generateThumbnailPath(cityId),
      overview,
      attractions: attractions?.sites || [],
      neighborhoods: neighborhoods?.neighborhoods || [],
      culinary,
      transport,
      seasonal,
      monthly,
      metadata: {
        lastUpdated: new Date(),
        dataVersion: '1.0.0',
        completeness: calculateDataCompleteness({
          overview, attractions, neighborhoods, culinary, transport, seasonal, monthly
        })
      }
    };

    cityDataCache.set(cacheKey, { data: cityData, timestamp: Date.now() });
    return cityData;
  } catch (error) {
    console.error(`Error loading city data for ${cityId}:`, error);
    return null;
  }
}

/**
 * Find the file system path for a city
 */
async function findCityPath(cityId) {
  const dataPath = path.join(process.cwd(), 'public/data');
  const countries = await fs.promises.readdir(dataPath, { withFileTypes: true });
  
  for (const country of countries) {
    if (!country.isDirectory()) continue;
    
    const countryPath = path.join(dataPath, country.name);
    const cityPath = path.join(countryPath, cityId);
    
    try {
      await fs.promises.access(cityPath);
      return cityPath;
    } catch {
      // City not found in this country, continue
    }
  }
  
  return null;
}

/**
 * Load a specific data file for a city
 */
async function loadCityFile(cityPath, fileType) {
  const cityName = path.basename(cityPath);
  const possiblePaths = [
    path.join(cityPath, `${cityName}_${fileType}.json`),
    path.join(cityPath, `${cityName}-${fileType}.json`),
    path.join(cityPath, `${fileType}.json`)
  ];

  for (const filePath of possiblePaths) {
    try {
      await fs.promises.access(filePath);
      const data = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      // File not found, try next path
    }
  }
  
  return null;
}

/**
 * Load monthly data from the monthly directory
 */
async function loadMonthlyData(cityPath) {
  const monthlyPath = path.join(cityPath, 'monthly');
  
  try {
    await fs.promises.access(monthlyPath);
    const monthFiles = await fs.promises.readdir(monthlyPath);
    const monthData = {};
    
    for (const file of monthFiles) {
      if (!file.endsWith('.json')) continue;
      
      const monthName = file.replace('.json', '');
      const filePath = path.join(monthlyPath, file);
      
      try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        monthData[monthName] = JSON.parse(data);
      } catch (error) {
        console.warn(`Error loading monthly data for ${monthName}:`, error.message);
      }
    }
    
    return monthData;
  } catch {
    return {};
  }
}

/**
 * Format city name from slug
 */
function formatCityName(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calculate data completeness percentage
 */
function calculateDataCompleteness(data) {
  const fields = ['overview', 'attractions', 'neighborhoods', 'culinary', 'transport', 'seasonal', 'monthly'];
  const completedFields = fields.filter(field => data[field] && Object.keys(data[field]).length > 0);
  return Math.round((completedFields.length / fields.length) * 100);
}

/**
 * Search cities by name, country, or description
 */
export async function searchCities(query, limit = 10) {
  const allCities = await getAllCities();
  const searchTerm = query.toLowerCase();
  
  const matches = allCities.filter(city => 
    city.name.toLowerCase().includes(searchTerm) ||
    city.country.toLowerCase().includes(searchTerm) ||
    (city.description && city.description.toLowerCase().includes(searchTerm))
  );
  
  return matches.slice(0, limit);
}

/**
 * Get cities by country
 */
export async function getCitiesByCountry(country) {
  const allCities = await getAllCities();
  return allCities.filter(city => 
    city.country.toLowerCase() === country.toLowerCase()
  );
}

/**
 * Clear the data cache (useful for development)
 */
export function clearCache() {
  cityDataCache.clear();
} 