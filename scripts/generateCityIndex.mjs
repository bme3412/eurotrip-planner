#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const dataRoot = path.join(process.cwd(), 'public', 'data');

async function pathExists(p) {
  try { await fs.promises.access(p); return true; } catch { return false; }
}

async function readJsonIfExists(p) {
  if (!(await pathExists(p))) return null;
  try { return JSON.parse(await fs.promises.readFile(p, 'utf8')); } catch { return null; }
}

async function readWithFallbacks(baseDir, citySlug, names) {
  for (const name of names) {
    const p = path.join(baseDir, name);
    if (await pathExists(p)) {
      const json = await readJsonIfExists(p);
      if (json) return json;
    }
  }
  return null;
}

async function loadMonthlyData(baseDir) {
  const monthlyDir = path.join(baseDir, 'monthly');
  if (!(await pathExists(monthlyDir))) return null;

  try {
    const monthFiles = await fs.promises.readdir(monthlyDir);
    const jsonFiles = monthFiles.filter(f => f.endsWith('.json') && f !== 'index.json');

    if (jsonFiles.length === 0) return null;

    // Load all months in parallel
    const results = await Promise.all(
      jsonFiles.map(async (file) => {
        const monthName = file.replace('.json', '').toLowerCase();
        const data = await readJsonIfExists(path.join(monthlyDir, file));
        if (!data) return null;
        // Handle nested month data structure (e.g., { "January": {...} })
        const monthKey = Object.keys(data)[0];
        if (monthKey && data[monthKey]) {
          return [monthName, data[monthKey]];
        }
        return [monthName, data];
      })
    );

    const monthlyObj = Object.fromEntries(results.filter(Boolean));
    return Object.keys(monthlyObj).length > 0 ? monthlyObj : null;
  } catch {
    return null;
  }
}

// Toggle to omit monthly data from the consolidated index. Set
// EUROTRIP_INDEX_INCLUDE_MONTHLY=false to drop it (~35% smaller index.json
// for cities like Paris). Monthly data still lives in `monthly/index.json`
// and is fetched lazily by useMonthlyData when needed.
const includeMonthly = process.env.EUROTRIP_INDEX_INCLUDE_MONTHLY !== 'false';

async function buildCityIndex(country, cityDir) {
  const baseDir = path.join(dataRoot, country, cityDir);
  if (!(await pathExists(baseDir))) return false;
  const citySlug = cityDir.toLowerCase();

  // Phase D: read from the canonical per-section files emitted by the
  // content build under sections/. The legacy `{slug}_*.json` files have
  // been removed; summary.json remains at the city root.
  const fieldLoaders = [
    readWithFallbacks(baseDir, citySlug, ['sections/overview.json']),
    readWithFallbacks(baseDir, citySlug, ['sections/attractions.json']),
    readWithFallbacks(baseDir, citySlug, ['sections/neighborhoods.json']),
    readWithFallbacks(baseDir, citySlug, ['sections/culinary.json']),
    readWithFallbacks(baseDir, citySlug, ['sections/connections.json']),
    readWithFallbacks(baseDir, citySlug, ['sections/seasonal-activities.json']),
    readWithFallbacks(baseDir, citySlug, ['summary.json']),
    readWithFallbacks(baseDir, citySlug, ['sections/visit-calendar.json']),
    includeMonthly ? loadMonthlyData(baseDir) : Promise.resolve(null),
  ];

  const [overview, attractions, neighborhoods, culinaryGuide, connections, seasonalActivities, summary, visitCalendar, monthly] = await Promise.all(fieldLoaders);

  const indexObj = {
    city: citySlug,
    country,
    overview,
    attractions,
    neighborhoods,
    culinaryGuide,
    connections,
    seasonalActivities,
    summary,
    visitCalendar,
    // Sentinel so the client knows to lazy-fetch instead of treating absence as "no data"
    monthly: includeMonthly ? monthly : null,
    monthlyLazy: !includeMonthly,
  };

  const outPath = path.join(baseDir, 'index.json');
  await fs.promises.writeFile(outPath, JSON.stringify(indexObj));
  return true;
}

async function main() {
  const manifestPath = path.join(dataRoot, 'manifest.json');
  const manifest = await readJsonIfExists(manifestPath);
  let count = 0;
  if (manifest?.cities) {
    for (const [slug, meta] of Object.entries(manifest.cities)) {
      const ok = await buildCityIndex(meta.country, meta.directoryName);
      if (ok) count++;
    }
  } else {
    // Fallback: scan directories if manifest is missing
    const countries = await fs.promises.readdir(dataRoot, { withFileTypes: true });
    for (const country of countries) {
      if (!country.isDirectory() || country.name.includes('.')) continue;
      const countryDir = path.join(dataRoot, country.name);
      const cities = await fs.promises.readdir(countryDir, { withFileTypes: true });
      for (const city of cities) {
        if (!city.isDirectory()) continue;
        const ok = await buildCityIndex(country.name, city.name);
        if (ok) count++;
      }
    }
  }
  console.log(`Generated city index.json for ${count} cities`);
}

main().catch((e) => { console.error(e); process.exit(1); });


