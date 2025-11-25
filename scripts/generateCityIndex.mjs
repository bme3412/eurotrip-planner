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

async function buildCityIndex(country, cityDir) {
  const baseDir = path.join(dataRoot, country, cityDir);
  if (!(await pathExists(baseDir))) return false;
  const citySlug = cityDir.toLowerCase();

  const overview = await readWithFallbacks(baseDir, citySlug, [
    `${citySlug}-overview.json`, `${citySlug}_overview.json`, 'overview.json', 'city_overview.json'
  ]);
  const attractions = await readWithFallbacks(baseDir, citySlug, [
    `${citySlug}_attractions.json`, 'attractions.json', 'sites.json'
  ]);
  const neighborhoods = await readWithFallbacks(baseDir, citySlug, [
    `${citySlug}_neighborhoods.json`, 'neighborhoods.json', 'areas.json'
  ]);
  const culinaryGuide = await readWithFallbacks(baseDir, citySlug, [
    `${citySlug}_culinary_guide.json`, 'culinary_guide.json', 'food.json'
  ]);
  const connections = await readWithFallbacks(baseDir, citySlug, [
    `${citySlug}_connections.json`, 'connections.json', 'transport.json'
  ]);
  const seasonalActivities = await readWithFallbacks(baseDir, citySlug, [
    `${citySlug}_seasonal_activities.json`, 'seasonal_activities.json', 'activities.json'
  ]);
  const summary = await readWithFallbacks(baseDir, citySlug, [
    'summary.json', 'visit_summary.json'
  ]);
  const visitCalendar = await readWithFallbacks(baseDir, citySlug, [
    `${citySlug}-visit-calendar.json`, 'visit-calendar.json'
  ]);

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
    visitCalendar
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


