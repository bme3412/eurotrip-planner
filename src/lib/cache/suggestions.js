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

// Initialize Redis client if environment variables are set
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Cache TTLs in seconds
const CACHE_TTL = {
  suggestions: 3600,      // 1 hour for suggestions
  monthly: 86400,         // 24 hours for monthly scores
  llmDescriptions: 604800, // 7 days for LLM descriptions
};

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
  } = params;

  // Normalize dates to YYYY-MM-DD format
  const start = typeof startDate === 'string' ? startDate : startDate?.toISOString?.()?.split('T')[0];
  const end = typeof endDate === 'string' ? endDate : endDate?.toISOString?.()?.split('T')[0];

  return `suggestions:${version}:${start}:${end}:${travelerType}:${budget}:${originCity}`;
}

/**
 * Check if a date range falls within a single month.
 * Used to determine if we can use pre-computed monthly scores.
 */
export function isSingleMonthQuery(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  );
}

/**
 * Get the month name from a date.
 */
export function getMonthName(date) {
  const d = new Date(date);
  return MONTH_NAMES[d.getMonth()];
}

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
    // Dynamic import to avoid issues at build time
    const monthlyScores = await import('@/generated/monthlyScores.json', {
      with: { type: 'json' }
    }).then(m => m.default);

    const monthData = monthlyScores[monthName];
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
 * Get cached suggestions from Redis.
 * Returns null if not cached or Redis is not available.
 */
export async function getCachedSuggestions(cacheKey) {
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        source: 'redis',
        data: typeof cached === 'string' ? JSON.parse(cached) : cached,
      };
    }
  } catch (error) {
    console.warn('[Cache] Redis get failed:', error.message);
  }

  return null;
}

/**
 * Set cached suggestions in Redis.
 */
export async function setCachedSuggestions(cacheKey, data, ttl = CACHE_TTL.suggestions) {
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
