/**
 * Two-tier cache for Google Places *resolution* (place IDs, place details,
 * photo resource names, resolved photo URIs).
 *
 * L1: in-process Map (instant, per-instance).
 * L2: Upstash Redis when configured — durable and shared across serverless
 *     instances. Replaces the previous /tmp disk mirror, which didn't survive
 *     cold starts or span instances on Vercel, so production effectively ran
 *     uncached and re-billed Google on every cold lambda.
 *
 * Caches resolution metadata only — never photo *bytes* (Google Places terms).
 * Accepts either the canonical UPSTASH_REDIS_REST_* env names or the
 * KV_REST_API_* names that Vercel's Upstash integration injects.
 *
 * All getters/setters are async (Redis is networked); callers already await.
 */

import { Redis } from '@upstash/redis';

// TTLs in seconds (Redis granularity).
const TTL_7D = 7 * 24 * 60 * 60;
const TTL_1H = 60 * 60;

// Lazy Redis client; null when unconfigured → L1-only (dev / local).
let redis = null;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
}

/** @type {Map<string, { data: any, expiresAt: number }>} */
const store = new Map();
const MAX_L1_ENTRIES = 1000;

// ── L1 (in-process) ──────────────────────────────────────────────────

function l1Get(key) {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) store.delete(key);
    return undefined;
  }
  return entry.data;
}

function l1Set(key, data, ttlSec) {
  if (store.size >= MAX_L1_ENTRIES) {
    store.delete(store.keys().next().value); // evict oldest
  }
  store.set(key, { data, expiresAt: Date.now() + ttlSec * 1000 });
}

// ── Two-tier get/set ─────────────────────────────────────────────────
// Sentinel distinguishes "cached as empty/miss" (a real value we stored to
// avoid re-querying) from "not cached". Stored values are JSON; `undefined`
// from a getter means not-cached.

async function cacheGet(key, ttlSec) {
  const mem = l1Get(key);
  if (mem !== undefined) return mem;
  if (!redis) return undefined;
  try {
    const val = await redis.get(key);
    if (val === null || val === undefined) return undefined;
    const data = typeof val === 'string' ? JSON.parse(val) : val;
    l1Set(key, data, ttlSec); // promote to L1
    return data;
  } catch (err) {
    console.warn('[places-cache] redis get failed:', err.message);
    return undefined;
  }
}

async function cacheSet(key, data, ttlSec) {
  l1Set(key, data, ttlSec);
  if (!redis) return;
  try {
    await redis.setex(key, ttlSec, JSON.stringify(data));
  } catch (err) {
    console.warn('[places-cache] redis set failed:', err.message);
  }
}

// ── Public helpers keyed by domain concept ──────────────────────────

function normalizeFieldMask(fieldMask = '') {
  return String(fieldMask)
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
    .sort()
    .join(',');
}

export async function getCachedPlaceDetails(placeId, fieldMask = '') {
  return cacheGet(`place_details:${placeId}:${normalizeFieldMask(fieldMask)}`, TTL_7D);
}

export async function setCachedPlaceDetails(placeId, fieldMask = '', data, ttlSec = TTL_7D) {
  return cacheSet(`place_details:${placeId}:${normalizeFieldMask(fieldMask)}`, data, ttlSec);
}

export async function getCachedPlaceId(citySlug, attractionName) {
  return cacheGet(`place_id_map:${citySlug}:${attractionName}`, TTL_7D);
}

export async function setCachedPlaceId(citySlug, attractionName, placeId) {
  return cacheSet(`place_id_map:${citySlug}:${attractionName}`, placeId, TTL_7D);
}

/**
 * Photo-name resolution: free-text/location key → photo resource name.
 * Long TTL — the resource name is stable for a place. Stores '' for known
 * misses so we don't re-run Text Search for places with no photo.
 */
export async function getCachedPhotoName(key) {
  return cacheGet(`photo_name:${key}`, TTL_7D);
}

export async function setCachedPhotoName(key, photoName) {
  return cacheSet(`photo_name:${key}`, photoName, TTL_7D);
}

function photoUrlKey(photoName, width = 800, height) {
  return `photo_url:${photoName}:${width || 800}:${height || 'auto'}`;
}

/**
 * Resolved photo URI (googleusercontent). SHORT TTL — these URLs expire, so a
 * long cache would eventually hand out dead links. We re-resolve cheaply.
 */
export async function getCachedPhotoUrl(photoName, width = 800, height) {
  return cacheGet(photoUrlKey(photoName, width, height), TTL_1H);
}

export async function setCachedPhotoUrl(photoName, width = 800, height, url) {
  return cacheSet(photoUrlKey(photoName, width, height), url, TTL_1H);
}

export function clearCache() {
  store.clear();
}

export function cacheSize() {
  return store.size;
}

/** Whether the durable L2 (Redis) is configured. */
export function isDurableCacheEnabled() {
  return redis !== null;
}
