#!/usr/bin/env node

/**
 * Data Enrichment Pipeline
 *
 * Enriches city data by:
 * 1. Deriving city coordinates from attractions
 * 2. Generating tourismCategories from attraction types
 * 3. Adding _meta blocks for versioning
 * 4. Normalizing data structure
 *
 * Usage:
 *   node scripts/pipeline/enrich.mjs [options]
 *
 * Options:
 *   --dry-run         Show what would change without writing
 *   --city SLUG       Only process specific city
 *   --verbose         Show detailed output
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger, parseLoggerArgs } from './lib/logger.mjs';
import { getCurrentVersion, calculateContentHash } from './lib/versioning.mjs';

const DATA_DIR = path.join(process.cwd(), 'public/data');

/**
 * Get attractions array (handles nested structure).
 */
function getAttractions(data) {
  if (Array.isArray(data.attractions)) return data.attractions;
  if (Array.isArray(data.attractions?.sites)) return data.attractions.sites;
  return [];
}

/**
 * Get neighborhoods array (handles nested structure).
 */
function getNeighborhoods(data) {
  if (Array.isArray(data.neighborhoods)) return data.neighborhoods;
  if (Array.isArray(data.neighborhoods?.neighborhoods)) return data.neighborhoods.neighborhoods;
  return [];
}

/**
 * Derive city coordinates from attractions.
 */
function deriveCoordinates(data) {
  const attractions = getAttractions(data);

  // Find attractions with coordinates
  const withCoords = attractions.filter(a =>
    (a.latitude && a.longitude) || (a.lat && a.lng)
  );

  if (withCoords.length === 0) return null;

  // Calculate centroid of all attractions
  let totalLat = 0;
  let totalLng = 0;

  for (const attr of withCoords) {
    totalLat += attr.latitude || attr.lat;
    totalLng += attr.longitude || attr.lng;
  }

  return {
    lat: Math.round((totalLat / withCoords.length) * 10000) / 10000,
    lng: Math.round((totalLng / withCoords.length) * 10000) / 10000,
    derived: true,
    fromAttractions: withCoords.length,
  };
}

/**
 * Tourism category mappings from attraction types.
 */
const CATEGORY_MAPPINGS = {
  // Type -> Categories
  'Museum': ['Cultural', 'Museums'],
  'Art Museum': ['Cultural', 'Museums', 'Art'],
  'History Museum': ['Cultural', 'Museums', 'Historical'],
  'Science Museum': ['Cultural', 'Museums', 'Family'],
  'Monument': ['Historical Landmarks', 'Cultural'],
  'Monument / Tower': ['Historical Landmarks', 'Cultural'],
  'Church': ['Historical Landmarks', 'Religious'],
  'Cathedral': ['Historical Landmarks', 'Religious'],
  'Basilica': ['Historical Landmarks', 'Religious'],
  'Palace': ['Historical Landmarks', 'Cultural'],
  'Castle': ['Historical Landmarks', 'Cultural'],
  'Park': ['Nature', 'Relaxation'],
  'Garden': ['Nature', 'Relaxation'],
  'Botanical Garden': ['Nature', 'Relaxation'],
  'Beach': ['Beach & Coastal', 'Relaxation'],
  'Market': ['Food & Wine', 'Shopping'],
  'Food Market': ['Food & Wine', 'Gastronomic'],
  'Restaurant': ['Gastronomic', 'Food & Wine'],
  'Nightclub': ['Nightlife'],
  'Bar': ['Nightlife'],
  'Theater': ['Cultural', 'Entertainment'],
  'Opera House': ['Cultural', 'Entertainment'],
  'Concert Hall': ['Cultural', 'Entertainment'],
  'Shopping': ['Shopping'],
  'Shopping District': ['Shopping', 'Urban Exploration'],
  'Neighborhood': ['Urban Exploration'],
  'Historic District': ['Historical Landmarks', 'Urban Exploration'],
  'Viewpoint': ['Nature', 'Photography'],
  'Bridge': ['Historical Landmarks', 'Photography'],
  'Square': ['Urban Exploration', 'Historical'],
  'Plaza': ['Urban Exploration', 'Historical'],
  'Spa': ['Wellness & Spa', 'Relaxation'],
  'Thermal Bath': ['Wellness & Spa', 'Relaxation'],
  'Adventure': ['Adventure Travel'],
  'Hiking': ['Adventure Travel', 'Nature'],
  'Sports': ['Adventure Travel', 'Sports'],
  'Family Attraction': ['Family'],
  'Theme Park': ['Family', 'Entertainment'],
  'Zoo': ['Family', 'Nature'],
  'Aquarium': ['Family', 'Nature'],
  'UNESCO': ['Cultural Tourism Hubs', 'Historical Landmarks'],
};

/**
 * Generate tourism categories from attractions.
 */
function generateTourismCategories(data) {
  const attractions = getAttractions(data);
  const neighborhoods = getNeighborhoods(data);

  if (attractions.length === 0) return null;

  const categoryCounts = {};

  // Process attractions
  for (const attr of attractions) {
    const type = attr.type || attr.category;
    if (!type) continue;

    // Direct mapping
    const mappedCategories = CATEGORY_MAPPINGS[type] || [];
    for (const cat of mappedCategories) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Keyword-based inference
    const typeStr = type.toLowerCase();
    if (typeStr.includes('museum')) {
      categoryCounts['Cultural'] = (categoryCounts['Cultural'] || 0) + 1;
      categoryCounts['Museums'] = (categoryCounts['Museums'] || 0) + 1;
    }
    if (typeStr.includes('church') || typeStr.includes('cathedral') || typeStr.includes('basilica')) {
      categoryCounts['Historical Landmarks'] = (categoryCounts['Historical Landmarks'] || 0) + 1;
    }
    if (typeStr.includes('park') || typeStr.includes('garden')) {
      categoryCounts['Nature'] = (categoryCounts['Nature'] || 0) + 1;
    }
    if (typeStr.includes('market') || typeStr.includes('food')) {
      categoryCounts['Food & Wine'] = (categoryCounts['Food & Wine'] || 0) + 1;
    }
    if (typeStr.includes('palace') || typeStr.includes('castle') || typeStr.includes('historic')) {
      categoryCounts['Historical Landmarks'] = (categoryCounts['Historical Landmarks'] || 0) + 1;
    }

    // Check for UNESCO
    if (attr.mustSee || attr.unesco || typeStr.includes('unesco')) {
      categoryCounts['Cultural Tourism Hubs'] = (categoryCounts['Cultural Tourism Hubs'] || 0) + 1;
    }
  }

  // Add Urban Exploration if has neighborhoods
  if (neighborhoods.length >= 3) {
    categoryCounts['Urban Exploration'] = (categoryCounts['Urban Exploration'] || 0) + 3;
  }

  // Sort by count and take top categories
  const sorted = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat]) => cat);

  return sorted.length > 0 ? sorted : null;
}

/**
 * Generate _meta block.
 */
function generateMeta(data, source = 'enrichment') {
  const dataWithoutMeta = { ...data };
  delete dataWithoutMeta._meta;

  return {
    schemaVersion: 2,
    dataVersion: getCurrentVersion(),
    generatedAt: new Date().toISOString(),
    source: data._meta?.source || source,
    contentHash: calculateContentHash(dataWithoutMeta),
  };
}

/**
 * Find all city index.json files.
 */
async function findCityFiles() {
  const files = [];

  async function scanDir(dir, depth = 0) {
    if (depth > 2) return; // country/city/index.json

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'monthly' && entry.name !== 'generated') {
        await scanDir(fullPath, depth + 1);
      } else if (entry.name === 'index.json' && depth === 2) {
        files.push(fullPath);
      }
    }
  }

  await scanDir(DATA_DIR);
  return files;
}

/**
 * Enrich a single city file.
 */
async function enrichCity(filePath, logger, dryRun) {
  const relativePath = path.relative(DATA_DIR, filePath);
  const changes = [];

  // Load data
  let data;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    logger.error(`Failed to read ${relativePath}`, { error: error.message });
    return { file: relativePath, changes: [], error: error.message };
  }

  // 1. Derive coordinates if missing
  if (!data.coordinates?.lat && !data.latitude) {
    const coords = deriveCoordinates(data);
    if (coords) {
      data.coordinates = coords;
      changes.push(`Added coordinates (${coords.lat}, ${coords.lng}) from ${coords.fromAttractions} attractions`);
    }
  }

  // 2. Generate tourism categories if missing
  if (!data.tourismCategories || data.tourismCategories.length === 0) {
    const categories = generateTourismCategories(data);
    if (categories) {
      data.tourismCategories = categories;
      changes.push(`Generated ${categories.length} tourism categories: ${categories.slice(0, 3).join(', ')}...`);
    }
  }

  // 3. Add/update _meta block
  if (!data._meta || !data._meta.contentHash) {
    data._meta = generateMeta(data, data._meta?.source);
    changes.push('Added _meta block with version tracking');
  }

  // Write if changes made and not dry-run
  if (changes.length > 0) {
    if (!dryRun) {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }
    logger.info(`${relativePath}: ${changes.length} changes`, { dryRun });
    for (const change of changes) {
      logger.debug(`  - ${change}`);
    }
  }

  return { file: relativePath, changes };
}

/**
 * Main enrichment function.
 */
async function main() {
  const args = process.argv.slice(2);
  const loggerOpts = parseLoggerArgs(args);
  const logger = createLogger(loggerOpts);

  const dryRun = args.includes('--dry-run');
  const cityFilter = args.includes('--city') ? args[args.indexOf('--city') + 1] : null;

  logger.info('Starting data enrichment', { dryRun, cityFilter });

  // Find city files
  let files = await findCityFiles();
  logger.info(`Found ${files.length} city data files`);

  // Filter if specific city requested
  if (cityFilter) {
    files = files.filter(f => f.toLowerCase().includes(cityFilter.toLowerCase()));
    logger.info(`Filtered to ${files.length} files matching "${cityFilter}"`);
  }

  // Process each file
  let totalChanges = 0;
  let citiesModified = 0;
  const results = [];

  for (const file of files) {
    const result = await enrichCity(file, logger, dryRun);
    results.push(result);

    if (result.changes.length > 0) {
      citiesModified++;
      totalChanges += result.changes.length;
    }
  }

  // Summary
  logger.info('Enrichment complete', {
    citiesProcessed: files.length,
    citiesModified,
    totalChanges,
    dryRun,
  });

  if (dryRun) {
    logger.warn('Dry run - no files were modified. Remove --dry-run to apply changes.');
  }

  // Breakdown of changes
  const changeCounts = {};
  for (const result of results) {
    for (const change of result.changes) {
      const type = change.split(':')[0].split('(')[0].trim();
      changeCounts[type] = (changeCounts[type] || 0) + 1;
    }
  }

  if (Object.keys(changeCounts).length > 0) {
    logger.info('Change breakdown:', changeCounts);
  }
}

main().catch((error) => {
  console.error('Enrichment failed:', error);
  process.exit(1);
});
