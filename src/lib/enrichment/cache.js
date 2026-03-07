/**
 * Multi-layer cache for city enrichment data.
 *
 * Layer 1: In-memory Map with short TTL (5 minutes)
 * Layer 2: Supabase city_enrichment_cache table with longer TTL
 *
 * This ensures fast repeated lookups while persisting across server restarts.
 */

import { getSupabaseAdmin } from '@/lib/supabase/server';

// TTL values in milliseconds
const TTL = {
  weather: 3 * 60 * 60 * 1000,    // 3 hours
  events: 24 * 60 * 60 * 1000,    // 24 hours
  crowds: 6 * 60 * 60 * 1000,     // 6 hours
  pricing: 12 * 60 * 60 * 1000,   // 12 hours
};

// In-memory cache (Layer 1)
const MEMORY_TTL = 5 * 60 * 1000; // 5 minutes
const memoryCache = new Map();

function formatDate(date) {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

function isMemoryExpired(entry) {
  return !entry || Date.now() > entry.expiresAt;
}

function getCacheKey(citySlug, type, startDate, endDate) {
  return `${citySlug}:${type}:${formatDate(startDate)}:${formatDate(endDate)}`;
}

// ── Memory Cache (Layer 1) ────────────────────────────────────────────

function getFromMemory(citySlug, type, startDate, endDate) {
  const key = getCacheKey(citySlug, type, startDate, endDate);
  const entry = memoryCache.get(key);

  if (isMemoryExpired(entry)) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

function setInMemory(citySlug, type, startDate, endDate, data) {
  const key = getCacheKey(citySlug, type, startDate, endDate);
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + MEMORY_TTL,
  });
}

// ── Supabase Cache (Layer 2) ──────────────────────────────────────────

async function getFromSupabase(citySlug, type, startDate, endDate) {
  try {
    const supabase = await getSupabaseAdmin();

    const { data, error } = await supabase
      .from('city_enrichment_cache')
      .select('*')
      .eq('city_slug', citySlug)
      .eq('enrichment_type', type)
      .eq('date_range_start', formatDate(startDate))
      .eq('date_range_end', formatDate(endDate))
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    return {
      data: data.data,
      fetchedAt: data.fetched_at,
      confidence: data.confidence,
      source: data.source,
    };
  } catch (err) {
    console.error('Supabase cache read error:', err);
    return null;
  }
}

async function setInSupabase(citySlug, type, startDate, endDate, data, source = 'api', confidence = 1.0) {
  try {
    const supabase = await getSupabaseAdmin();
    const ttlMs = TTL[type] || TTL.weather;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const { error } = await supabase
      .from('city_enrichment_cache')
      .upsert({
        city_slug: citySlug,
        enrichment_type: type,
        date_range_start: formatDate(startDate),
        date_range_end: formatDate(endDate),
        data,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt,
        source,
        confidence,
      }, {
        onConflict: 'city_slug,enrichment_type,date_range_start,date_range_end',
      });

    if (error) {
      console.error('Supabase cache write error:', error);
    }
  } catch (err) {
    console.error('Supabase cache write error:', err);
  }
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Get cached enrichment data, checking memory first, then Supabase.
 */
export async function getCachedEnrichment(citySlug, type, startDate, endDate) {
  // Layer 1: Memory
  const memoryResult = getFromMemory(citySlug, type, startDate, endDate);
  if (memoryResult) {
    return { ...memoryResult, source: 'memory' };
  }

  // Layer 2: Supabase
  const supabaseResult = await getFromSupabase(citySlug, type, startDate, endDate);
  if (supabaseResult) {
    // Populate memory cache for next request
    setInMemory(citySlug, type, startDate, endDate, supabaseResult);
    return { ...supabaseResult, source: 'supabase' };
  }

  return null;
}

/**
 * Set enrichment data in both cache layers.
 */
export async function setCachedEnrichment(citySlug, type, startDate, endDate, data, source = 'api', confidence = 1.0) {
  const cacheEntry = { data, fetchedAt: new Date().toISOString(), confidence, source };

  // Layer 1: Memory (sync)
  setInMemory(citySlug, type, startDate, endDate, cacheEntry);

  // Layer 2: Supabase (async, don't block)
  setInSupabase(citySlug, type, startDate, endDate, data, source, confidence).catch(() => {});

  return cacheEntry;
}

/**
 * Check if cached data is stale (past TTL but not necessarily expired from DB).
 */
export function isStale(fetchedAt, type) {
  if (!fetchedAt) return true;
  const ttlMs = TTL[type] || TTL.weather;
  const fetchedTime = new Date(fetchedAt).getTime();
  return Date.now() - fetchedTime > ttlMs;
}

/**
 * Get TTL for a given enrichment type in milliseconds.
 */
export function getTTL(type) {
  return TTL[type] || TTL.weather;
}

/**
 * Clear memory cache (useful for testing).
 */
export function clearMemoryCache() {
  memoryCache.clear();
}

/**
 * Get current memory cache size.
 */
export function getMemoryCacheSize() {
  return memoryCache.size;
}
