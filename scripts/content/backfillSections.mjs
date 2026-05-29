#!/usr/bin/env node
/**
 * Backfill per-section files from each city's consolidated index.json.
 *
 * Phase B serves city data from `sections/*.json`, but historically those
 * files were only emitted for cities whose source went through the content
 * reader (~39% coverage). Because the per-section files are byte-identical
 * extracts of the matching camelCase keys in `index.json`, we can backfill
 * the rest directly from `index.json` to reach ~100% coverage.
 *
 * Writes are atomic and idempotent (skip when byte-identical), so re-running
 * with no changes produces zero writes. Only files derived from existing
 * index.json keys are written — monthly/*.json and prose/* are untouched.
 *
 * Usage:
 *   node scripts/content/backfillSections.mjs                 # all cities
 *   node scripts/content/backfillSections.mjs --city paris    # one city slug
 *   node scripts/content/backfillSections.mjs --country France # one country
 *   node scripts/content/backfillSections.mjs --dry-run       # nothing written
 *   node scripts/content/backfillSections.mjs --verbose
 *
 * Exits 0 on success, non-zero on fatal error.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { listDir, readJsonOrNull, writeJsonAtomic } from './lib/fs.mjs';
import { makeLogger, parseArgs } from './lib/cli.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'public', 'data');

/**
 * Map from index.json key -> path under `sections/`.
 * `photos` is intentionally omitted (no source data in index.json).
 */
const KEY_TO_SECTION_FILE = {
  overview: 'overview.json',
  attractions: 'attractions.json',
  neighborhoods: 'neighborhoods.json',
  culinaryGuide: 'culinary.json',
  connections: 'connections.json',
  visitCalendar: 'visit-calendar.json',
  seasonalActivities: 'seasonal-activities.json',
};

async function discoverCityDirs() {
  const out = [];
  const countries = await listDir(DATA_ROOT);
  for (const country of countries) {
    if (!country.isDirectory) continue;
    const cities = await listDir(country.path);
    for (const city of cities) {
      if (!city.isDirectory) continue;
      out.push({
        country: country.name,
        city: city.name,
        dir: city.path,
      });
    }
  }
  return out;
}

async function backfillCity(entry, { dryRun, logger }) {
  const idx = await readJsonOrNull(join(entry.dir, 'index.json'));
  if (!idx || typeof idx !== 'object') {
    return { written: 0, skipped: 0, hadIndex: false };
  }

  let written = 0;
  let skipped = 0;

  for (const [key, filename] of Object.entries(KEY_TO_SECTION_FILE)) {
    const data = idx[key];
    if (data == null) continue;

    const path = join(entry.dir, 'sections', filename);
    if (dryRun) {
      // Determine whether a write would occur without touching disk.
      const existing = await readJsonOrNull(path);
      if (JSON.stringify(existing) === JSON.stringify(data)) {
        skipped += 1;
      } else {
        written += 1;
        logger.debug(`[dry-run] would write ${path}`);
      }
      continue;
    }

    const res = await writeJsonAtomic(path, data);
    if (res.written) {
      written += 1;
      logger.debug(`wrote ${path}`);
    } else {
      skipped += 1;
    }
  }

  return { written, skipped, hadIndex: true };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const logger = makeLogger({ verbose: !!args.verbose, quiet: !!args.quiet });
  const dryRun = !!args['dry-run'] || !!args.dryRun;

  const filterCity = args.city ? String(args.city).toLowerCase() : null;
  const filterCountry = args.country ? String(args.country).toLowerCase() : null;

  logger.info(`backfill-sections start${dryRun ? ' (dry-run)' : ''}`);

  let dirs = await discoverCityDirs();
  if (filterCountry) dirs = dirs.filter((d) => d.country.toLowerCase() === filterCountry);
  if (filterCity) dirs = dirs.filter((d) => d.city.toLowerCase() === filterCity);
  dirs.sort((a, b) => `${a.country}/${a.city}`.localeCompare(`${b.country}/${b.city}`));

  const summary = { cities: 0, withIndex: 0, filesWritten: 0, filesSkipped: 0, errors: [] };

  for (const entry of dirs) {
    const tag = `${entry.country}/${entry.city}`;
    try {
      const res = await backfillCity(entry, { dryRun, logger });
      summary.cities += 1;
      if (!res.hadIndex) {
        logger.debug(`${tag}: no index.json, skipped`);
        continue;
      }
      summary.withIndex += 1;
      summary.filesWritten += res.written;
      summary.filesSkipped += res.skipped;
      if (res.written > 0) {
        logger.ok(`${tag}: ${res.written} written, ${res.skipped} unchanged${dryRun ? ' (dry-run)' : ''}`);
      } else {
        logger.debug(`${tag}: ${res.skipped} unchanged`);
      }
    } catch (err) {
      summary.errors.push({ city: tag, message: err.message });
      logger.error(`${tag}: ${err.message}`);
      if (args.verbose) logger.error(err.stack);
    }
  }

  logger.info(
    `done: ${summary.cities} dirs (${summary.withIndex} with index.json), ` +
    `${summary.filesWritten} files ${dryRun ? 'to write' : 'written'}, ` +
    `${summary.filesSkipped} unchanged, ${summary.errors.length} errors`
  );

  process.exit(summary.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal:', err);
  process.exit(2);
});
