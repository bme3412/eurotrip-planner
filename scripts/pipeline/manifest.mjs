#!/usr/bin/env node

/**
 * Manifest Generator
 *
 * Generates an enhanced manifest.json with quality scores, content hashes,
 * and completeness tracking for all city data.
 *
 * Usage:
 *   node scripts/pipeline/manifest.mjs [options]
 *
 * Options:
 *   --with-hashes     Include content hashes for change detection
 *   --output FILE     Output file path (default: public/data/manifest.json)
 *   --verbose         Show detailed output
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger, parseLoggerArgs } from './lib/logger.mjs';
import { getCurrentVersion, calculateContentHash } from './lib/versioning.mjs';
import {
  calculateQualityScore,
  getCompletenessCheck,
  calculateAggregateStats,
} from './lib/quality.mjs';

const DATA_DIR = path.join(process.cwd(), 'public/data');
const DEFAULT_OUTPUT = path.join(DATA_DIR, 'manifest.json');

/**
 * Find all country/city directories.
 */
async function findCities() {
  const cities = [];

  const countries = await fs.readdir(DATA_DIR, { withFileTypes: true });

  for (const country of countries) {
    if (!country.isDirectory()) continue;
    if (country.name.startsWith('.')) continue;
    if (country.name === 'generated') continue;

    const countryPath = path.join(DATA_DIR, country.name);
    const cityDirs = await fs.readdir(countryPath, { withFileTypes: true });

    for (const city of cityDirs) {
      if (!city.isDirectory()) continue;

      const indexPath = path.join(countryPath, city.name, 'index.json');

      try {
        await fs.access(indexPath);
        cities.push({
          country: country.name,
          cityDir: city.name,
          indexPath,
        });
      } catch {
        // No index.json, skip
      }
    }
  }

  return cities;
}

/**
 * Load and analyze a city's data.
 */
async function analyzeCityData(cityInfo, includeHashes, logger) {
  try {
    const content = await fs.readFile(cityInfo.indexPath, 'utf-8');
    const data = JSON.parse(content);

    // Calculate quality score
    const quality = calculateQualityScore(data);

    // Get completeness checks
    const completeness = getCompletenessCheck(data);

    // Calculate content hash if requested
    let contentHash = null;
    if (includeHashes) {
      const dataWithoutMeta = { ...data };
      delete dataWithoutMeta._meta;
      contentHash = calculateContentHash(dataWithoutMeta);
    }

    // Get city ID (slug)
    const cityId = data.id || data.cityId || cityInfo.cityDir.toLowerCase();

    return {
      cityId,
      country: cityInfo.country,
      directoryName: cityInfo.cityDir,
      displayName: data.name || data.city || cityInfo.cityDir,
      meta: {
        dataVersion: data._meta?.dataVersion || null,
        qualityScore: quality.score,
        contentHash,
        completeness,
        source: data._meta?.source || 'unknown',
      },
      stats: {
        attractions: data.attractions?.length || 0,
        neighborhoods: data.neighborhoods?.length || 0,
        calendarMonths: data.visitCalendar?.months?.length || 0,
      },
    };
  } catch (error) {
    logger.warn(`Failed to analyze ${cityInfo.indexPath}`, { error: error.message });
    return null;
  }
}

/**
 * Main manifest generation function.
 */
async function main() {
  const args = process.argv.slice(2);
  const loggerOpts = parseLoggerArgs(args);
  const logger = createLogger(loggerOpts);

  const includeHashes = args.includes('--with-hashes');
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : DEFAULT_OUTPUT;

  logger.info('Starting manifest generation', { dataDir: DATA_DIR, includeHashes });

  // Find all cities
  const cityInfos = await findCities();
  logger.info(`Found ${cityInfos.length} city directories`);

  // Analyze each city
  const cities = {};
  const qualityScores = [];

  for (const cityInfo of cityInfos) {
    const result = await analyzeCityData(cityInfo, includeHashes, logger);

    if (result) {
      cities[result.cityId] = {
        country: result.country,
        directoryName: result.directoryName,
        displayName: result.displayName,
        meta: result.meta,
        stats: result.stats,
      };

      qualityScores.push({ cityId: result.cityId, score: result.meta.qualityScore });
    }
  }

  // Calculate aggregate stats
  const aggregateStats = calculateAggregateStats(qualityScores);

  // Categorize cities by completeness
  const citiesComplete = Object.values(cities).filter(c => c.meta.qualityScore >= 60).length;
  const citiesPartial = Object.values(cities).filter(c => c.meta.qualityScore >= 30 && c.meta.qualityScore < 60).length;
  const citiesEmpty = Object.values(cities).filter(c => c.meta.qualityScore < 30).length;

  // Build manifest
  const manifest = {
    manifestVersion: '2.0.0',
    dataVersion: getCurrentVersion(),
    generatedAt: new Date().toISOString(),

    stats: {
      totalCities: Object.keys(cities).length,
      citiesComplete,
      citiesPartial,
      citiesEmpty,
      avgQualityScore: aggregateStats.avg,
      qualityDistribution: aggregateStats.distribution,
      dataFreshness: {
        static: new Date().toISOString().split('T')[0],
      },
    },

    cities,
  };

  // Write manifest
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));

  logger.success(`Manifest written to ${outputPath}`);
  logger.info('Stats', manifest.stats);
}

main().catch((error) => {
  console.error('Manifest generation failed:', error);
  process.exit(1);
});
