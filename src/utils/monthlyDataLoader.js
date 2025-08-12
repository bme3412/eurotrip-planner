'use client';
import { getDataUrl } from '@/utils/cdnUtils';

/**
 * Monthly data loader utility
 * Provides cached loading of monthly data for cities
 */

// Cache for monthly data to avoid repeated fetches
const monthlyDataCache = new Map();
const inflightRequests = new Map();

export const loadMonthlyDataCached = async (country, cityName) => {
  const cacheKey = `${country}_${cityName}`.toLowerCase();
  
  // Return cached data if available
  if (monthlyDataCache.has(cacheKey)) {
    return monthlyDataCache.get(cacheKey);
  }

  // De-dupe concurrent requests
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  try {
    const normalizedCity = cityName.toLowerCase();
    const indexPath = getDataUrl(`/data/${country}/${normalizedCity}/monthly/index.json`);

    const promise = (async () => {
      // Try consolidated index first
      try {
        const indexRes = await fetch(indexPath, { cache: 'force-cache' });
        if (indexRes.ok) {
          const allData = await indexRes.json();
          monthlyDataCache.set(cacheKey, allData);
          return allData;
        }
      } catch (e) {
        // fall through to per-month loader
      }

      // Fallback: load each month individually
      const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];

      const monthlyData = {};
      let loadedCount = 0;

      await Promise.allSettled(
        months.map(async (month) => {
          const monthPath = getDataUrl(`/data/${country}/${normalizedCity}/monthly/${month}.json`);
          const response = await fetch(monthPath, { cache: 'force-cache' });
          if (response.ok) {
            const monthData = await response.json();
            Object.assign(monthlyData, monthData);
            loadedCount++;
          }
        })
      );

      if (loadedCount === 0) {
        console.warn(`No monthly data found for ${cityName} in ${country}`);
      } else {
        console.log(`Loaded ${loadedCount}/12 months of data for ${cityName}`);
      }

      monthlyDataCache.set(cacheKey, monthlyData);
      return monthlyData;
    })();

    inflightRequests.set(cacheKey, promise);
    const result = await promise;
    inflightRequests.delete(cacheKey);
    return result;

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
    // Prefer index.json; fallback to January probe
    const testPath = `/data/${country}/${normalizedCity}/monthly/index.json`;
    const response = await fetch(testPath, { method: 'HEAD' });
    if (response.ok) return true;
    const janPath = `/data/${country}/${normalizedCity}/monthly/january.json`;
    const janRes = await fetch(janPath, { method: 'HEAD' });
    return janRes.ok;
  } catch (error) {
    return false;
  }
};