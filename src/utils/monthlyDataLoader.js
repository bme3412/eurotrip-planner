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
  
  // Return cached data if available and non-empty; otherwise refresh
  if (monthlyDataCache.has(cacheKey)) {
    const cached = monthlyDataCache.get(cacheKey);
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      return cached;
    }
    // fall through to reload if cache is empty
  }

  // De-dupe concurrent requests
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  try {
    // Build candidate directory casings to handle mixed-case folders in data
    const normalizedCity = cityName.toLowerCase();
    const capitalizedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
    const candidates = Array.from(new Set([
      normalizedCity,
      cityName, // as provided (slug)
      capitalizedCity
    ]));

    const promise = (async () => {
      // Helper to try CDN path first, then local fallback
      const tryJsonWithFallback = async (pathBuilder) => {
        // CDN (via getDataUrl)
        const cdnUrl = getDataUrl(pathBuilder());
        try {
          const res = await fetch(cdnUrl, { cache: 'force-cache' });
          if (res.ok) return res.json();
        } catch (e) { /* fall through */ }
        // Local fallback (bypass CDN mapping)
        try {
          const localUrl = `/${pathBuilder().replace(/^\//, '')}`;
          const res2 = await fetch(localUrl, { cache: 'force-cache' });
          if (res2.ok) return res2.json();
        } catch (e2) { /* ignore */ }
        return null;
      };

      // Try consolidated index first across candidate casings
      for (const candidate of candidates) {
        const allData = await tryJsonWithFallback(() => `/data/${country}/${candidate}/monthly/index.json`);
        if (allData && typeof allData === 'object' && Object.keys(allData).length > 0) {
          monthlyDataCache.set(cacheKey, allData);
          return allData;
        }
      }

      // Fallback: load each month individually
      const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];

      const monthlyData = {};
      let loadedCount = 0;

      // Fallback: try to load each month using the first casing that works
      await Promise.allSettled(
        months.map(async (month) => {
          for (const candidate of candidates) {
            const monthData = await tryJsonWithFallback(() => `/data/${country}/${candidate}/monthly/${month}.json`);
            if (monthData && typeof monthData === 'object' && Object.keys(monthData).length > 0) {
              Object.assign(monthlyData, monthData);
              loadedCount++;
              return; // stop trying other candidates for this month
            }
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