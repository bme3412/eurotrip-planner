#!/usr/bin/env node

/**
 * Data Validation Pipeline
 *
 * Validates all city data files against schema and quality rules.
 *
 * Usage:
 *   node scripts/pipeline/validate.mjs [options]
 *
 * Options:
 *   --ci              Run in CI mode (exit non-zero on warnings)
 *   --fail-on-warning Treat warnings as errors
 *   --verbose         Show detailed output
 *   --json            Output JSON format
 *   --fix             Auto-fix fixable issues
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger, parseLoggerArgs } from './lib/logger.mjs';
import { calculateQualityScore, getCompletenessCheck } from './lib/quality.mjs';

const DATA_DIR = path.join(process.cwd(), 'public/data');

// Helper to get attractions (handles nested structure)
function getAttractions(data) {
  if (Array.isArray(data.attractions)) return data.attractions;
  if (Array.isArray(data.attractions?.sites)) return data.attractions.sites;
  return [];
}

// Helper to get neighborhoods (handles nested structure)
function getNeighborhoods(data) {
  if (Array.isArray(data.neighborhoods)) return data.neighborhoods;
  if (Array.isArray(data.neighborhoods?.neighborhoods)) return data.neighborhoods.neighborhoods;
  return [];
}

// Validation rules
const RULES = {
  // Blocking rules (errors)
  errors: [
    {
      name: 'valid-json',
      check: async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          JSON.parse(content);
          return { pass: true };
        } catch (e) {
          return { pass: false, message: `Invalid JSON: ${e.message}` };
        }
      },
    },
    {
      name: 'has-city-name',
      check: async (filePath, data) => {
        if (!data.name && !data.city && !data.cityName) {
          return { pass: false, message: 'Missing city name field' };
        }
        return { pass: true };
      },
    },
    {
      name: 'valid-coordinates',
      check: async (filePath, data) => {
        const lat = data.coordinates?.lat ?? data.latitude;
        const lng = data.coordinates?.lng ?? data.longitude;

        if (lat !== undefined && lng !== undefined) {
          if (lat < -90 || lat > 90) {
            return { pass: false, message: `Invalid latitude: ${lat}` };
          }
          if (lng < -180 || lng > 180) {
            return { pass: false, message: `Invalid longitude: ${lng}` };
          }
        }
        return { pass: true };
      },
    },
    {
      name: 'no-empty-arrays',
      check: async (filePath, data) => {
        // Check if data has structure but empty arrays indicate incomplete data
        const hasAttractions = Array.isArray(data.attractions);
        const hasNeighborhoods = Array.isArray(data.neighborhoods);

        // Only error if the arrays exist but are empty AND no other data
        if (hasAttractions && data.attractions.length === 0 &&
            hasNeighborhoods && data.neighborhoods.length === 0 &&
            !data.description && !data.overview) {
          return { pass: false, message: 'City appears to have empty placeholder data' };
        }
        return { pass: true };
      },
    },
  ],

  // Warning rules (non-blocking)
  warnings: [
    {
      name: 'has-attractions',
      check: async (filePath, data) => {
        const attractions = getAttractions(data);
        if (attractions.length === 0) {
          return { pass: false, message: 'No attractions defined' };
        }
        return { pass: true };
      },
    },
    {
      name: 'has-visit-calendar',
      check: async (filePath, data) => {
        const months = data.visitCalendar?.months;
        // Handle both array and object formats
        const monthCount = months
          ? (Array.isArray(months) ? months.length : Object.keys(months).length)
          : 0;
        if (monthCount === 0) {
          return { pass: false, message: 'No visit calendar data' };
        }
        return { pass: true };
      },
    },
    {
      name: 'has-connections',
      check: async (filePath, data) => {
        const connections = data.connections || data.transport;
        if (!connections || (Array.isArray(connections) ? connections.length : Object.keys(connections).length) === 0) {
          return { pass: false, message: 'No transport connections defined' };
        }
        return { pass: true };
      },
    },
    {
      name: 'consistent-crowd-levels',
      check: async (filePath, data) => {
        const validLevels = ['very low', 'low', 'moderate', 'high', 'very high'];
        const months = Array.isArray(data.visitCalendar?.months) ? data.visitCalendar.months : [];

        for (const month of months) {
          if (!month) continue;
          const level = month.crowdLevel?.toLowerCase();
          if (level && !validLevels.includes(level)) {
            return { pass: false, message: `Non-standard crowd level: "${month.crowdLevel}"` };
          }
        }
        return { pass: true };
      },
    },
    {
      name: 'has-meta',
      check: async (filePath, data) => {
        if (!data._meta) {
          return { pass: false, message: 'Missing _meta block (no version tracking)' };
        }
        return { pass: true };
      },
    },
    {
      name: 'quality-threshold',
      check: async (filePath, data) => {
        const { score } = calculateQualityScore(data);
        if (score < 40) {
          return { pass: false, message: `Low quality score: ${score}/100` };
        }
        return { pass: true };
      },
    },
  ],
};

/**
 * Find all city data files.
 */
async function findCityFiles() {
  const files = [];

  async function scanDir(dir, depth = 0) {
    if (depth > 2) return; // country/city level only

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip monthly, generated, and hidden directories
      if (entry.isDirectory() && !entry.name.startsWith('.') &&
          entry.name !== 'monthly' && entry.name !== 'generated') {
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
 * Validate a single city file.
 */
async function validateFile(filePath, logger) {
  const relativePath = path.relative(DATA_DIR, filePath);
  const results = {
    file: relativePath,
    errors: [],
    warnings: [],
  };

  // Load file
  let data;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (e) {
    results.errors.push({ rule: 'valid-json', message: e.message });
    return results;
  }

  // Run error rules
  for (const rule of RULES.errors) {
    const result = await rule.check(filePath, data);
    if (!result.pass) {
      results.errors.push({ rule: rule.name, message: result.message });
    }
  }

  // Run warning rules
  for (const rule of RULES.warnings) {
    const result = await rule.check(filePath, data);
    if (!result.pass) {
      results.warnings.push({ rule: rule.name, message: result.message });
    }
  }

  return results;
}

/**
 * Main validation function.
 */
async function main() {
  const args = process.argv.slice(2);
  const loggerOpts = parseLoggerArgs(args);
  const logger = createLogger(loggerOpts);

  const ciMode = args.includes('--ci');
  const failOnWarning = args.includes('--fail-on-warning');

  logger.info('Starting data validation', { dataDir: DATA_DIR });

  // Find all city files
  const files = await findCityFiles();
  logger.info(`Found ${files.length} city data files`);

  // Validate each file
  const allResults = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of files) {
    const results = await validateFile(file, logger);
    allResults.push(results);

    totalErrors += results.errors.length;
    totalWarnings += results.warnings.length;

    // Log results
    if (results.errors.length > 0) {
      for (const err of results.errors) {
        logger.error(`${results.file}: ${err.message}`, { rule: err.rule });
      }
    }

    if (results.warnings.length > 0 && !ciMode) {
      for (const warn of results.warnings) {
        logger.warn(`${results.file}: ${warn.message}`, { rule: warn.rule });
      }
    }
  }

  // Summary
  logger.info('Validation complete', {
    files: files.length,
    errors: totalErrors,
    warnings: totalWarnings,
  });

  // Categorize files
  const filesWithErrors = allResults.filter(r => r.errors.length > 0);
  const filesWithWarnings = allResults.filter(r => r.warnings.length > 0 && r.errors.length === 0);
  const filesOk = allResults.filter(r => r.errors.length === 0 && r.warnings.length === 0);

  logger.info(`Files OK: ${filesOk.length}`, { status: 'pass' });
  logger.info(`Files with warnings: ${filesWithWarnings.length}`, { status: 'warn' });
  logger.info(`Files with errors: ${filesWithErrors.length}`, { status: 'error' });

  // Exit code
  if (totalErrors > 0) {
    logger.error('Validation failed with errors');
    process.exit(1);
  }

  if (totalWarnings > 0 && (ciMode || failOnWarning)) {
    logger.error('Validation failed with warnings (CI mode)');
    process.exit(1);
  }

  logger.success('Validation passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
