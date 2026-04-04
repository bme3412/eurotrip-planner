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

async function buildCityIndex(country, cityDir) {
  const baseDir = path.join(dataRoot, country, cityDir);
  if (!(await pathExists(baseDir))) return false;
  const citySlug = cityDir.toLowerCase();

  // Load all data types in parallel for faster builds
  const [overview, attractions, neighborhoods, culinaryGuide, connections, seasonalActivities, summary, visitCalendar, monthly] = await Promise.all([
    readWithFallbacks(baseDir, citySlug, [
      `${citySlug}-overview.json`, `${citySlug}_overview.json`, 'overview.json', 'city_overview.json'
    ]),
    readWithFallbacks(baseDir, citySlug, [
      `${citySlug}_attractions.json`, 'attractions.json', 'sites.json'
    ]),
    readWithFallbacks(baseDir, citySlug, [
      `${citySlug}_neighborhoods.json`, 'neighborhoods.json', 'areas.json'
    ]),
    readWithFallbacks(baseDir, citySlug, [
      `${citySlug}_culinary_guide.json`, 'culinary_guide.json', 'food.json'
    ]),
    readWithFallbacks(baseDir, citySlug, [
      `${citySlug}_connections.json`, 'connections.json', 'transport.json'
    ]),
    readWithFallbacks(baseDir, citySlug, [
      `${citySlug}_seasonal_activities.json`, 'seasonal_activities.json', 'activities.json'
    ]),
    readWithFallbacks(baseDir, citySlug, [
      'summary.json', 'visit_summary.json'
    ]),
    readWithFallbacks(baseDir, citySlug, [
      `${citySlug}-visit-calendar.json`, 'visit-calendar.json'
    ]),
    loadMonthlyData(baseDir)
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
    visitCalendar,
    monthly
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


