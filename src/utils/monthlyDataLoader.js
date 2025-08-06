'use client';

/**
 * Monthly data loader utility
 * Provides cached loading of monthly data for cities
 */

// Cache for monthly data to avoid repeated fetches
const monthlyDataCache = new Map();

export const loadMonthlyDataCached = async (country, cityName) => {
  const cacheKey = `${country}_${cityName}`.toLowerCase();
  
  // Return cached data if available
  if (monthlyDataCache.has(cacheKey)) {
    return monthlyDataCache.get(cacheKey);
  }

  try {
    const normalizedCity = cityName.toLowerCase();
    
    // The monthly data is stored as individual month files in a monthly/ subdirectory
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const monthlyData = {};
    let loadedCount = 0;

    // Load each month's data individually
    for (const month of months) {
      try {
        const monthPath = `/data/${country}/${normalizedCity}/monthly/${month}.json`;
        const response = await fetch(monthPath);
        
        if (response.ok) {
          const monthData = await response.json();
          // The JSON file contains the month as a top-level key, so merge it directly
          Object.assign(monthlyData, monthData);
          loadedCount++;
        }
      } catch (monthError) {
        // Continue loading other months even if one fails
        console.warn(`Failed to load ${month} data for ${cityName}:`, monthError);
      }
    }

    if (loadedCount === 0) {
      console.warn(`No monthly data found for ${cityName} in ${country}`);
    } else {
      console.log(`Loaded ${loadedCount}/12 months of data for ${cityName}`);
    }

    // Cache the result (even if partially empty)
    monthlyDataCache.set(cacheKey, monthlyData);
    return monthlyData;

  } catch (error) {
    console.error(`Error loading monthly data for ${cityName}:`, error);
    const emptyData = {};
    monthlyDataCache.set(cacheKey, emptyData);
    return emptyData;
  }
};

// Clear cache function for testing or memory management
export const clearMonthlyDataCache = () => {
  monthlyDataCache.clear();
};

// Get cache stats for debugging
export const getMonthlyDataCacheStats = () => {
  return {
    size: monthlyDataCache.size,
    keys: Array.from(monthlyDataCache.keys())
  };
};

// Check if monthly data is available for a city (without loading it)
export const hasMonthlyData = async (country, cityName) => {
  try {
    const normalizedCity = cityName.toLowerCase();
    // Just check if January data exists as a quick test
    const testPath = `/data/${country}/${normalizedCity}/monthly/january.json`;
    const response = await fetch(testPath, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};