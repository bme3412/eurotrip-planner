#!/usr/bin/env node

/**
 * Data Quality Audit
 *
 * Generates detailed quality reports for all city data.
 *
 * Usage:
 *   node scripts/pipeline/audit.mjs [options]
 *
 * Options:
 *   --summary         Show summary only
 *   --threshold N     Fail if average quality below N (default: 0)
 *   --output FILE     Write report to file
 *   --json            Output JSON format
 *   --verbose         Show detailed output
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger, parseLoggerArgs } from './lib/logger.mjs';
import {
  calculateQualityScore,
  getCompletenessCheck,
  calculateAggregateStats,
  getQualityTier,
} from './lib/quality.mjs';

const DATA_DIR = path.join(process.cwd(), 'public/data');
const BRIDGE_FILE = path.join(process.cwd(), 'scripts/cityMetadata.json');

// Bridge data loaded once at startup
let bridgeData = null;

/**
 * Load the cityMetadata.json bridge file.
 * This contains coordinates, descriptions, and tourismCategories for cities
 * that may not have them in their index.json.
 */
async function loadBridgeData() {
  try {
    const content = await fs.readFile(BRIDGE_FILE, 'utf-8');
    bridgeData = JSON.parse(content);
  } catch (error) {
    // Bridge file is optional; if missing, just use empty object
    bridgeData = {};
  }
}

/**
 * Merge bridge data into city data for quality checking.
 * Bridge fields only fill gaps - index.json data takes precedence.
 */
function mergeWithBridgeData(data, cityId) {
  const bridge = bridgeData[cityId];
  if (!bridge) return data;

  const merged = { ...data };

  // Coordinates: use bridge if index.json lacks them
  if (!merged.coordinates?.lat && !merged.latitude && bridge.latitude && bridge.longitude) {
    merged.coordinates = { lat: bridge.latitude, lng: bridge.longitude };
  }

  // Description: use bridge if index.json lacks it
  if (!merged.description && !merged.overview?.brief_description && bridge.description) {
    merged.description = bridge.description;
  }

  // Tourism categories: use bridge if index.json lacks them
  if ((!merged.tourismCategories || merged.tourismCategories.length === 0) && bridge.tourismCategories?.length > 0) {
    merged.tourismCategories = bridge.tourismCategories;
  }

  return merged;
}

/**
 * Find all city index.json files.
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
        // City index.json files are at country/city/index.json (depth 2)
        files.push(fullPath);
      }
    }
  }

  await scanDir(DATA_DIR);
  return files;
}

/**
 * Audit a single city file.
 */
async function auditFile(filePath) {
  const relativePath = path.relative(DATA_DIR, filePath);
  const parts = relativePath.split(path.sep);
  const country = parts[0];
  const city = parts[1];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Derive city ID for bridge lookup
    const cityId = (data.id || data.cityId || city).toLowerCase();

    // Merge with bridge data (coordinates, description, tourismCategories)
    const mergedData = mergeWithBridgeData(data, cityId);

    const quality = calculateQualityScore(mergedData);
    const completeness = getCompletenessCheck(mergedData);

    return {
      country,
      city,
      cityId,
      displayName: data.name || data.city || city,
      qualityScore: quality.score,
      qualityTier: getQualityTier(quality.score),
      completeness,
      issues: quality.issues,
      breakdown: quality.breakdown,
      hasMeta: !!data._meta,
      dataVersion: data._meta?.dataVersion || null,
      source: data._meta?.source || 'unknown',
    };
  } catch (error) {
    return {
      country,
      city,
      cityId: city.toLowerCase(),
      error: error.message,
      qualityScore: 0,
      qualityTier: 'error',
    };
  }
}

/**
 * Format audit report as text.
 */
function formatTextReport(audits, stats) {
  let report = '';

  report += '╔══════════════════════════════════════════════════════════════╗\n';
  report += '║               DATA QUALITY AUDIT REPORT                      ║\n';
  report += '╚══════════════════════════════════════════════════════════════╝\n\n';

  report += `Generated: ${new Date().toISOString()}\n\n`;

  // Summary stats
  report += '┌─────────────────────────────────────────────────────────────┐\n';
  report += '│ SUMMARY                                                      │\n';
  report += '├─────────────────────────────────────────────────────────────┤\n';
  report += `│ Total Cities:        ${String(stats.total).padStart(6)}                              │\n`;
  report += `│ Average Quality:     ${String(stats.avg).padStart(6)}/100                           │\n`;
  report += `│ Min/Max:             ${String(stats.min).padStart(6)} / ${String(stats.max).padEnd(6)}                       │\n`;
  report += '├─────────────────────────────────────────────────────────────┤\n';
  report += '│ DISTRIBUTION                                                 │\n';
  report += `│   Excellent (80+):   ${String(stats.distribution.excellent).padStart(6)} cities                        │\n`;
  report += `│   Good (60-79):      ${String(stats.distribution.good).padStart(6)} cities                        │\n`;
  report += `│   Fair (40-59):      ${String(stats.distribution.fair).padStart(6)} cities                        │\n`;
  report += `│   Poor (20-39):      ${String(stats.distribution.poor).padStart(6)} cities                        │\n`;
  report += `│   Minimal (<20):     ${String(stats.distribution.minimal).padStart(6)} cities                        │\n`;
  report += '└─────────────────────────────────────────────────────────────┘\n\n';

  // Top issues
  const issueCounts = {};
  for (const audit of audits) {
    for (const issue of audit.issues || []) {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }
  }

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topIssues.length > 0) {
    report += '┌─────────────────────────────────────────────────────────────┐\n';
    report += '│ TOP ISSUES                                                   │\n';
    report += '├─────────────────────────────────────────────────────────────┤\n';
    for (const [issue, count] of topIssues) {
      const paddedIssue = issue.slice(0, 45).padEnd(45);
      report += `│ ${paddedIssue} ${String(count).padStart(5)} │\n`;
    }
    report += '└─────────────────────────────────────────────────────────────┘\n\n';
  }

  // Lowest quality cities
  const lowestQuality = [...audits]
    .filter(a => !a.error)
    .sort((a, b) => a.qualityScore - b.qualityScore)
    .slice(0, 15);

  if (lowestQuality.length > 0) {
    report += '┌─────────────────────────────────────────────────────────────┐\n';
    report += '│ CITIES NEEDING ATTENTION                                     │\n';
    report += '├─────────────────────────────────────────────────────────────┤\n';
    for (const audit of lowestQuality) {
      const name = `${audit.displayName} (${audit.country})`.slice(0, 40).padEnd(40);
      report += `│ ${name} ${String(audit.qualityScore).padStart(3)}/100 │\n`;
    }
    report += '└─────────────────────────────────────────────────────────────┘\n';
  }

  return report;
}

/**
 * Main audit function.
 */
async function main() {
  const args = process.argv.slice(2);
  const loggerOpts = parseLoggerArgs(args);
  const logger = createLogger(loggerOpts);

  const summaryOnly = args.includes('--summary');
  const jsonOutput = args.includes('--json');
  const thresholdIndex = args.indexOf('--threshold');
  const threshold = thresholdIndex >= 0 ? parseInt(args[thresholdIndex + 1], 10) : 0;
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;

  logger.info('Starting data quality audit', { dataDir: DATA_DIR });

  // Load bridge data (coordinates, descriptions, categories from scripts/cityMetadata.json)
  await loadBridgeData();
  const bridgeCount = Object.keys(bridgeData).length;
  if (bridgeCount > 0) {
    logger.info(`Loaded bridge data for ${bridgeCount} cities`);
  }

  // Find all city files
  const files = await findCityFiles();
  logger.info(`Found ${files.length} city data files`);

  // Audit each file
  const audits = [];
  for (const file of files) {
    const audit = await auditFile(file);
    audits.push(audit);
  }

  // Calculate aggregate stats
  const qualityScores = audits
    .filter(a => !a.error)
    .map(a => ({ cityId: a.cityId, score: a.qualityScore }));
  const stats = calculateAggregateStats(qualityScores);

  // Generate report
  let output;
  if (jsonOutput) {
    output = JSON.stringify({ stats, audits: summaryOnly ? null : audits }, null, 2);
  } else {
    output = formatTextReport(audits, stats);
  }

  // Output
  if (outputPath) {
    await fs.writeFile(outputPath, output);
    logger.success(`Audit report written to ${outputPath}`);
  } else {
    console.log(output);
  }

  // Check threshold
  if (threshold > 0 && stats.avg < threshold) {
    logger.error(`Average quality ${stats.avg} is below threshold ${threshold}`);
    process.exit(1);
  }

  logger.success('Audit complete');
}

main().catch((error) => {
  console.error('Audit failed:', error);
  process.exit(1);
});
