#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

async function readJSON(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

async function listJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.json'))
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b));
}

function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .map(s => (s[0] ? s[0].toUpperCase() + s.slice(1) : s))
    .join(' ');
}

async function collectOnDiskCities() {
  const countries = await listDirs(DATA_DIR);
  const ignored = new Set([
    'compressed_videos'
  ]);
  const countryDirs = countries.filter(c => !ignored.has(c));

  const cityEntries = [];
  for (const country of countryDirs) {
    const countryPath = path.join(DATA_DIR, country);
    const potentialCities = await listDirs(countryPath);
    for (const citySlug of potentialCities) {
      const cityPath = path.join(countryPath, citySlug);
      cityEntries.push({ country, citySlug, cityPath });
    }
  }
  return cityEntries;
}

async function deriveCityFiles(cityPath) {
  const monthlyDir = path.join(cityPath, 'monthly');
  const hasMonthlyDir = await pathExists(monthlyDir);
  const monthlyFiles = hasMonthlyDir ? await listJsonFiles(monthlyDir) : [];

  const allFiles = await listJsonFiles(cityPath);
  // Exclude monthly files directory; keep only top-level jsons
  const additionalFiles = allFiles;

  return { monthlyFiles, additionalFiles };
}

async function validateAndFix({ fix = false, normalize = false } = {}) {
  const manifest = await readJSON(MANIFEST_PATH).catch(async (e) => {
    console.error(`Failed to read manifest at ${MANIFEST_PATH}:`, e.message);
    process.exit(1);
  });
  if (!manifest.cities || typeof manifest.cities !== 'object') {
    console.error('Manifest missing "cities" object');
    process.exit(1);
  }

  // Optional: normalize keys to lowercase for consistent lookups
  if (normalize) {
    const normalized = {};
    for (const [key, value] of Object.entries(manifest.cities)) {
      const lower = key.toLowerCase();
      if (!normalized[lower]) normalized[lower] = value;
    }
    manifest.cities = normalized;
  }

  const onDisk = await collectOnDiskCities();
  const onDiskSlugs = new Set(onDisk.map(e => e.citySlug));
  const manifestSlugs = new Set(Object.keys(manifest.cities));

  const missing = [...onDiskSlugs].filter(s => !manifestSlugs.has(s));
  const extra = [...manifestSlugs].filter(s => !onDiskSlugs.has(s));

  console.log(`Found ${onDisk.length} city folders on disk`);
  console.log(`Manifest contains ${Object.keys(manifest.cities).length} cities`);
  console.log(`Missing in manifest: ${missing.length}`);
  if (missing.length) console.log('  - ' + missing.join(', '));
  console.log(`Extra in manifest (no folder on disk): ${extra.length}`);
  if (extra.length) console.log('  - ' + extra.join(', '));

  if (fix && missing.length) {
    console.log('\nAdding missing cities to manifest...');
    for (const slug of missing) {
      const entry = onDisk.find(e => e.citySlug === slug);
      if (!entry) continue;
      const { monthlyFiles, additionalFiles } = await deriveCityFiles(entry.cityPath);
      const key = slug.toLowerCase();
      manifest.cities[key] = {
        country: entry.country,
        directoryName: slug,
        monthlyFiles,
        additionalFiles
      };
      console.log(`  + Added ${slug} (${entry.country}) with ${monthlyFiles.length} monthly and ${additionalFiles.length} files`);
    }

    const formatted = JSON.stringify(manifest, null, 2) + '\n';
    await fs.writeFile(MANIFEST_PATH, formatted, 'utf8');
    console.log(`\nManifest updated at ${MANIFEST_PATH}`);
  }

  return { missing, extra };
}

const args = new Set(process.argv.slice(2));
validateAndFix({ fix: args.has('--fix') || args.has('-f'), normalize: args.has('--normalize') || args.has('-n') })
  .then(({ missing, extra }) => {
    if (missing.length === 0) {
      console.log('\n✅ Manifest includes all on-disk cities.');
    } else if (!args.has('--fix') && !args.has('-f')) {
      console.log('\nTip: run with --fix to add missing entries.');
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error('Validation failed:', e);
    process.exit(1);
  });


