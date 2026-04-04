/**
 * In-memory cache with TTL for Google Places API responses.
 *
 * Photo URL entries are also mirrored to disk at PHOTO_CACHE_PATH so they
 * survive server restarts. Place detail and place-ID entries are kept
 * in-memory only (fast to re-fetch, larger payloads).
 */

import fs from 'fs';
import path from 'path';

const TTL_24H = 24 * 60 * 60 * 1000;
const TTL_7D = 7 * 24 * 60 * 60 * 1000;

// Writable in both macOS /tmp and Vercel serverless /tmp
const PHOTO_CACHE_PATH = path.join('/tmp', 'google-photo-cache.json');

/** @type {Map<string, { data: any, expiresAt: number }>} */
const store = new Map();

// ── Disk persistence (photo URLs only) ──────────────────────────────

function loadPhotoCacheFromDisk() {
  try {
    const raw = fs.readFileSync(PHOTO_CACHE_PATH, 'utf-8');
    const entries = JSON.parse(raw);
    const now = Date.now();
    for (const [key, entry] of Object.entries(entries)) {
      if (entry.expiresAt > now) {
        store.set(key, entry);
      }
    }
  } catch {
    // File doesn't exist yet or is corrupt — start fresh
  }
}

function persistPhotoCache() {
  try {
    const now = Date.now();
    const toWrite = {};
    for (const [key, entry] of store.entries()) {
      if (key.startsWith('photo_url:') && entry.expiresAt > now) {
        toWrite[key] = entry;
      }
    }
    fs.writeFileSync(PHOTO_CACHE_PATH, JSON.stringify(toWrite), 'utf-8');
  } catch {
    // Non-fatal — in-memory cache still works
  }
}

// Hydrate photo URLs from disk on module load
loadPhotoCacheFromDisk();

// ── Core helpers ─────────────────────────────────────────────────────

function isExpired(entry) {
  return !entry || Date.now() > entry.expiresAt;
}

function get(key) {
  const entry = store.get(key);
  if (isExpired(entry)) {
    store.delete(key);
    return undefined;
  }
  return entry.data;
}

function set(key, data, ttlMs) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── Public helpers keyed by domain concept ──────────────────────────

export function getCachedPlaceDetails(placeId) {
  return get(`place_details:${placeId}`);
}

export function setCachedPlaceDetails(placeId, data, ttlMs = TTL_7D) {
  set(`place_details:${placeId}`, data, ttlMs);
}

export function getCachedPlaceId(citySlug, attractionName) {
  return get(`place_id_map:${citySlug}:${attractionName}`);
}

export function setCachedPlaceId(citySlug, attractionName, placeId) {
  set(`place_id_map:${citySlug}:${attractionName}`, placeId, TTL_7D);
}

export function getCachedPhotoUrl(photoName) {
  return get(`photo_url:${photoName}`);
}

export function setCachedPhotoUrl(photoName, url) {
  set(`photo_url:${photoName}`, url, TTL_24H);
  persistPhotoCache();
}

export function clearCache() {
  store.clear();
}

export function cacheSize() {
  return store.size;
}
