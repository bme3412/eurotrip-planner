/**
 * Centralized manifest utilities for O(1) city lookups
 * Caches the manifest in memory to avoid repeated file system reads
 */
import fs from 'fs';
import path from 'path';

const MANIFEST_PATH = path.join(process.cwd(), 'public', 'data', 'manifest.json');

// Module-level cache
let manifestCache = null;

/**
 * Get manifest synchronously (for use in generateStaticParams, etc.)
 * @returns {object|null} The parsed manifest or null on error
 */
export function getManifestSync() {
  if (manifestCache) return manifestCache;

  try {
    manifestCache = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    return manifestCache;
  } catch (error) {
    console.error('Error reading manifest.json:', error.message);
    return null;
  }
}

/**
 * Get manifest asynchronously (preferred for async contexts)
 * @returns {Promise<object|null>} The parsed manifest or null on error
 */
export async function getManifest() {
  if (manifestCache) return manifestCache;

  try {
    const content = await fs.promises.readFile(MANIFEST_PATH, 'utf8');
    manifestCache = JSON.parse(content);
    return manifestCache;
  } catch (error) {
    console.error('Error reading manifest.json:', error.message);
    return null;
  }
}

/**
 * Get metadata for a specific city (O(1) lookup)
 * @param {string} slug - City slug (e.g., "paris", "london")
 * @returns {{country: string, directoryName: string, monthlyFiles?: string[], additionalFiles?: string[]}|null}
 */
export function getCityMeta(slug) {
  const manifest = getManifestSync();
  return manifest?.cities?.[slug.toLowerCase()] ?? null;
}

/**
 * Get the filesystem path for a city's data directory
 * @param {string} slug - City slug
 * @returns {string|null} Full path to city data directory or null if not found
 */
export function getCityPath(slug) {
  const meta = getCityMeta(slug);
  if (!meta) return null;
  return path.join(process.cwd(), 'public', 'data', meta.country, meta.directoryName);
}

/**
 * Get all city slugs from the manifest
 * @returns {string[]} Array of city slugs
 */
export function getAllCitySlugs() {
  const manifest = getManifestSync();
  return manifest?.cities ? Object.keys(manifest.cities) : [];
}

/**
 * Clear the manifest cache (useful for development/testing)
 */
export function clearManifestCache() {
  manifestCache = null;
}
