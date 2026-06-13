/**
 * Suggestions Cache Layer
 *
 * Provides multi-tier caching for city suggestions:
 * 1. Pre-computed monthly scores (build-time, fastest)
 * 2. Redis cache (optional, for custom date queries)
 * 3. Live computation (fallback)
 *
 * Usage:
 *   import { getCachedSuggestions, setCachedSuggestions, getPrecomputedMonthlyScores } from '@/lib/cache/suggestions';
 */

import { Redis } from '@upstash/redis';
import { getRedisRestConfig } from '@/lib/redisEnv';

// Initialize Redis client if environment variables are set (accepts either the
// UPSTASH_REDIS_REST_* names or the KV_REST_API_* names from the Vercel integration)
let redis = null;
const { url: redisUrl, token: redisToken } = getRedisRestConfig();
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
}

// Cache TTLs in seconds
const CACHE_TTL = {
  suggestions: 3600,      // 1 hour for suggestions
  monthly: 86400,         // 24 hours for monthly scores
  llmDescriptions: 604800, // 7 days for LLM descriptions
};

// In-memory L1 cache (checked before Redis)
const memoryCache = new Map();
const MAX_MEMORY_ENTRIES = 50;

// Month name mapping
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

/**
 * Build a cache key from query parameters.
 */
export function buildCacheKey(params) {
  const {
    startDate,
    endDate,
    travelerType = 'everyone',
    budget = 'moderate',
    originCity = '',
    version = 'v4',
    // Response SHAPE differs between the flat list and the tiered object. They
    // MUST NOT share a key — otherwise a flat request can read back a cached
    // tiered payload (or vice versa), leaving `data.items` undefined → an empty
    // "0 best cities" result. Only the tiered branch writes the cache today, so
    // this collision was real.
    flat = false,
  } = params;

  // Normalize dates to YYYY-MM-DD format
  const start = typeof startDate === 'string' ? startDate : startDate?.toISOString?.()?.split('T')[0];
  const end = typeof endDate === 'string' ? endDate : endDate?.toISOString?.()?.split('T')[0];

  const shape = flat ? 'flat' : 'tiered';
  return `suggestions:${version}:${shape}:${start}:${end}:${travelerType}:${budget}:${originCity}`;
}

/**
 * Check if a date range falls within a single month.
 * Used to determine if we can use pre-computed monthly scores.
 */
/**
 * Year + 1-based month from a date input, timezone-safe.
 *
 * `new Date('2026-07-01')` parses as UTC midnight, but `.getMonth()` reads local
 * time — so on a machine behind UTC the 1st of a month rolls back to the previous
 * month. Since the default homepage dates are the 1st of the month, that quietly
 * broke single-month detection (and sent the most common query down the slow live
 * path). Parse YYYY-MM-DD strings by their components instead.
 */
function yearAndMonth(input) {
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})/);
    if (m) return { year: Number(m[1]), month: Number(m[2]) };
  }
  const d = new Date(input);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function isSingleMonthQuery(startDate, endDate) {
  const a = yearAndMonth(startDate);
  const b = yearAndMonth(endDate);
  return a.year === b.year && a.month === b.month;
}

/**
 * Get the (lowercase) month name from a date input.
 */
export function getMonthName(date) {
  return MONTH_NAMES[yearAndMonth(date).month - 1];
}

// Cached monthly scores (loaded once, reused across requests)
let monthlyScoresCache = null;

/**
 * Get pre-computed monthly scores if available.
 * Returns null if not available or dates don't match a pre-computed month.
 */
export async function getPrecomputedMonthlyScores(startDate, endDate) {
  // Only use pre-computed scores for single-month queries
  if (!isSingleMonthQuery(startDate, endDate)) {
    return null;
  }

  const monthName = getMonthName(startDate);

  try {
    // Load once and cache (static data, doesn't change at runtime)
    if (!monthlyScoresCache) {
      monthlyScoresCache = await import('@/generated/monthlyScores.json', {
        with: { type: 'json' }
      }).then(m => m.default);
    }

    const monthData = monthlyScoresCache[monthName];
    if (!monthData || monthData.error) {
      return null;
    }

    return {
      source: 'precomputed',
      month: monthName,
      ...monthData,
    };
  } catch (error) {
    console.warn('[Cache] Failed to load pre-computed scores:', error.message);
    return null;
  }
}

/**
 * Get cached suggestions from memory (L1) or Redis (L2).
 * Returns null if not cached.
 */
export async function getCachedSuggestions(cacheKey) {
  // L1: in-memory (instant)
  const mem = memoryCache.get(cacheKey);
  if (mem && Date.now() - mem.ts < CACHE_TTL.suggestions * 1000) {
    return { source: 'memory', data: mem.data };
  }
  if (mem) memoryCache.delete(cacheKey); // expired

  // L2: Redis (network)
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      // Promote to L1
      setMemoryCache(cacheKey, data);
      return { source: 'redis', data };
    }
  } catch (error) {
    console.warn('[Cache] Redis get failed:', error.message);
  }

  return null;
}

/**
 * Set in-memory cache entry with LRU eviction.
 */
function setMemoryCache(key, data) {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { data, ts: Date.now() });
}

/**
 * Set cached suggestions in memory (L1) and Redis (L2).
 */
export async function setCachedSuggestions(cacheKey, data, ttl = CACHE_TTL.suggestions) {
  // Always write to L1
  setMemoryCache(cacheKey, data);

  if (!redis) {
    return false;
  }

  try {
    await redis.setex(cacheKey, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('[Cache] Redis set failed:', error.message);
    return false;
  }
}

/**
 * Cache LLM-generated descriptions.
 */
export async function cacheLLMDescriptions(tierHash, descriptions) {
  if (!redis) return false;

  const cacheKey = `llm:descriptions:${tierHash}`;
  return setCachedSuggestions(cacheKey, descriptions, CACHE_TTL.llmDescriptions);
}

/**
 * Get cached LLM descriptions.
 */
export async function getCachedLLMDescriptions(tierHash) {
  if (!redis) return null;

  const cacheKey = `llm:descriptions:${tierHash}`;
  return getCachedSuggestions(cacheKey);
}

/**
 * Check if Redis is available.
 */
export function isRedisAvailable() {
  return redis !== null;
}

/**
 * Get cache status for debugging.
 */
export function getCacheStatus() {
  return {
    redis: isRedisAvailable(),
    precomputed: true, // Always available after build
  };
}
