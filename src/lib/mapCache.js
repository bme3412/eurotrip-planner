/**
 * Map Cache Utility
 * Provides caching functionality for map-related API calls and computed data
 */

import performanceMonitor from './performance';

// Cache storage
const cache = new Map();
const cacheExpiry = new Map();

// Cache configuration
const CACHE_CONFIG = {
  // Cache duration in milliseconds
  RATING_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  CALENDAR_CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
  CITY_DATA_CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
  MARKER_CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
  
  // Maximum cache size
  MAX_CACHE_SIZE: 1000,
  
  // Cleanup interval
  CLEANUP_INTERVAL: 5 * 60 * 1000 // 5 minutes
};

/**
 * Generate cache key for different types of data
 */
const generateCacheKey = (type, ...params) => {
  const keyParts = [type, ...params.map(param => 
    typeof param === 'object' ? JSON.stringify(param) : String(param)
  )];
  return keyParts.join('|');
};

/**
 * Check if cache entry is expired
 */
const isExpired = (key) => {
  const expiry = cacheExpiry.get(key);
  return expiry && Date.now() > expiry;
};

/**
 * Clean expired cache entries
 */
const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, expiry] of cacheExpiry.entries()) {
    if (now > expiry) {
      cache.delete(key);
      cacheExpiry.delete(key);
    }
  }
};

/**
 * Enforce cache size limit
 */
const enforceCacheSizeLimit = () => {
  if (cache.size > CACHE_CONFIG.MAX_CACHE_SIZE) {
    // Remove oldest entries
    const entries = Array.from(cache.entries());
    const sortedEntries = entries.sort((a, b) => {
      const expiryA = cacheExpiry.get(a[0]) || 0;
      const expiryB = cacheExpiry.get(b[0]) || 0;
      return expiryA - expiryB;
    });
    
    const toRemove = sortedEntries.slice(0, cache.size - CACHE_CONFIG.MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => {
      cache.delete(key);
      cacheExpiry.delete(key);
    });
  }
};

/**
 * Set cache entry with expiry
 */
const setCache = (key, value, duration = CACHE_CONFIG.RATING_CACHE_DURATION) => {
  // Cleanup before adding new entry
  cleanupExpiredCache();
  enforceCacheSizeLimit();
  
  cache.set(key, value);
  cacheExpiry.set(key, Date.now() + duration);
};

/**
 * Get cache entry if not expired
 */
const getCache = (key) => {
  if (isExpired(key)) {
    cache.delete(key);
    cacheExpiry.delete(key);
    return null;
  }
  
  const result = cache.get(key);
  if (result !== undefined) {
    performanceMonitor.recordCacheHit();
  }
  return result;
};

/**
 * Clear specific cache entries
 */
const clearCache = (pattern = null) => {
  if (!pattern) {
    cache.clear();
    cacheExpiry.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      cacheExpiry.delete(key);
    }
  }
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  cleanupExpiredCache();
  return {
    size: cache.size,
    maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
    hitRate: 0, // Would need to track hits/misses for this
    entries: Array.from(cache.keys())
  };
};

/**
 * Cached fetch function for API calls
 */
const cachedFetch = async (url, cacheKey, duration = CACHE_CONFIG.CITY_DATA_CACHE_DURATION) => {
  // Check cache first
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`[Cache] Hit for: ${cacheKey}`);
    return cached;
  }
  
  performanceMonitor.recordCacheMiss();
  performanceMonitor.recordApiCall();
  performanceMonitor.startTimer(`fetch_${cacheKey}`);
  
  try {
    console.log(`[Cache] Miss for: ${cacheKey}, fetching...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the successful response
    setCache(cacheKey, data, duration);
    
    performanceMonitor.endTimer(`fetch_${cacheKey}`, true);
    return data;
  } catch (error) {
    performanceMonitor.endTimer(`fetch_${cacheKey}`, false);
    console.error(`[Cache] Fetch error for ${url}:`, error);
    throw error;
  }
};

/**
 * Cached function wrapper
 */
const withCache = (fn, keyGenerator, duration = CACHE_CONFIG.RATING_CACHE_DURATION) => {
  return async (...args) => {
    const cacheKey = keyGenerator(...args);
    
    // Check cache first
    const cached = getCache(cacheKey);
    if (cached !== null) {
      console.log(`[Cache] Hit for: ${cacheKey}`);
      return cached;
    }
    
    performanceMonitor.recordCacheMiss();
    performanceMonitor.startTimer(`compute_${cacheKey}`);
    
    try {
      console.log(`[Cache] Miss for: ${cacheKey}, computing...`);
      const result = await fn(...args);
      
      // Cache the result
      setCache(cacheKey, result, duration);
      
      performanceMonitor.endTimer(`compute_${cacheKey}`, true);
      return result;
    } catch (error) {
      performanceMonitor.endTimer(`compute_${cacheKey}`, false);
      console.error(`[Cache] Function error for ${cacheKey}:`, error);
      throw error;
    }
  };
};

// Start periodic cleanup
setInterval(cleanupExpiredCache, CACHE_CONFIG.CLEANUP_INTERVAL);

// Export cache utilities
export {
  setCache,
  getCache,
  clearCache,
  getCacheStats,
  cachedFetch,
  withCache,
  generateCacheKey,
  CACHE_CONFIG
};

// Export cache instance for direct access if needed
export { cache as cacheInstance }; 