#!/usr/bin/env node
/**
 * P0 dataset backfill — wire scripts/cityMetadata.json into each city's index.json.
 *
 * cityMetadata.json (keyed by city slug) already carries curated `tourismCategories`,
 * `region`, and `latitude`/`longitude` for ~227 cities, but none of it reaches the
 * V4 scoring engine, which reads `public/data/{Country}/{dir}/index.json` and finds
 * those fields absent (0% coverage). This script patches index.json directly — that is
 * the file the running site + scoring read in the current "Phase A" layout (the content
 * build only writes sections/*.json, which scoring does not consume yet).
 *
 * What it adds (non-destructively — existing values are kept unless --force):
 *   - tourismCategories: string[]   → CultureFactor category sub-score + `tags` (real,
 *                                      curated values instead of runtime inference)
 *   - coordinates: { lat, lng }     → unblocks the P1 weather backfill (Open-Meteo by lat/lng)
 *   - region: string                → grouping / UI
 * Each patched field is recorded under index.json `provenance` so "measured" vs
 * "inferred" stays visible (and so future confidence-weighting can use it).
 *
 * Usage:
 *   node scripts/backfillCityMetadata.mjs --dry-run        # preview, write nothing
 *   node scripts/backfillCityMetadata.mjs                  # apply
 *   node scripts/backfillCityMetadata.mjs --force          # overwrite existing values too
 *   node scripts/backfillCityMetadata.mjs --city salzburg  # one city
 *   node scripts/backfillCityMetadata.mjs --country Austria # one country
 *
 * After applying, run `npm run build:scores` to recompute monthly scores.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const METADATA_PATH = path.join(ROOT, 'scripts', 'cityMetadata.json');
const MANIFEST_PATH = path.join(ROOT, 'public', 'data', 'manifest.json');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const DRY_RUN = has('--dry-run') || has('-n');
const FORCE = has('--force');
const ONLY_CITY = valueOf('--city');
const ONLY_COUNTRY = valueOf('--country');
const VERBOSE = has('--verbose') || has('-v');

const SOURCE = 'cityMetadata.json';

const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

const stats = {
  scanned: 0,
  patched: 0,
  unchanged: 0,
  noMetadata: [],
  missingIndex: [],
  fields: { tourismCategories: 0, coordinates: 0, region: 0 },
};

for (const [slug, entry] of Object.entries(manifest.cities)) {
  if (ONLY_CITY && slug !== ONLY_CITY) continue;
  if (ONLY_COUNTRY && entry.country !== ONLY_COUNTRY) continue;

  const meta = metadata[slug];
  if (!meta) {
    stats.noMetadata.push(slug);
    continue;
  }

  const indexPath = path.join(ROOT, 'public', 'data', entry.country, entry.directoryName, 'index.json');
  if (!fs.existsSync(indexPath)) {
    stats.missingIndex.push(slug);
    continue;
  }

  stats.scanned += 1;
  const idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  const provenance = { ...(idx.provenance || {}) };
  const patchedFields = [];

  // tourismCategories — only set when absent/empty (or --force) and metadata has them.
  if (Array.isArray(meta.tourismCategories) && meta.tourismCategories.length) {
    const present = Array.isArray(idx.tourismCategories) && idx.tourismCategories.length;
    if (!present || FORCE) {
      idx.tourismCategories = [...meta.tourismCategories];
      provenance.tourismCategories = SOURCE;
      patchedFields.push('tourismCategories');
      stats.fields.tourismCategories += 1;
    }
  }

  // coordinates — { lat, lng }
  if (typeof meta.latitude === 'number' && typeof meta.longitude === 'number') {
    const present = idx.coordinates && typeof idx.coordinates.lat === 'number';
    if (!present || FORCE) {
      idx.coordinates = { lat: meta.latitude, lng: meta.longitude };
      provenance.coordinates = SOURCE;
      patchedFields.push('coordinates');
      stats.fields.coordinates += 1;
    }
  }

  // region
  if (typeof meta.region === 'string' && meta.region) {
    if (!idx.region || FORCE) {
      idx.region = meta.region;
      provenance.region = SOURCE;
      patchedFields.push('region');
      stats.fields.region += 1;
    }
  }

  if (patchedFields.length === 0) {
    stats.unchanged += 1;
    continue;
  }

  idx.provenance = provenance;
  stats.patched += 1;
  if (VERBOSE || DRY_RUN) {
    console.log(`  ${DRY_RUN ? '[dry-run] would patch' : 'patched'} ${slug}: ${patchedFields.join(', ')}`);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2) + '\n', 'utf-8');
  }
}

console.log(`\n${DRY_RUN ? '🔍 Dry run — no files written' : '✅ Backfill complete'}`);
console.log(`   scanned (had metadata + index): ${stats.scanned}`);
console.log(`   ${DRY_RUN ? 'would patch' : 'patched'}: ${stats.patched}   unchanged: ${stats.unchanged}`);
console.log(`   fields → tourismCategories: ${stats.fields.tourismCategories}, coordinates: ${stats.fields.coordinates}, region: ${stats.fields.region}`);
if (stats.noMetadata.length) {
  console.log(`\n⚠️  ${stats.noMetadata.length} manifest cities have NO cityMetadata entry (will need P4 / a metadata entry):`);
  console.log(`   ${stats.noMetadata.join(', ')}`);
}
if (stats.missingIndex.length) {
  console.log(`\n⚠️  ${stats.missingIndex.length} cities missing index.json: ${stats.missingIndex.join(', ')}`);
}
if (!DRY_RUN && stats.patched > 0) {
  console.log(`\nNext: run 'npm run build:scores' to recompute monthly scores.\n`);
}
