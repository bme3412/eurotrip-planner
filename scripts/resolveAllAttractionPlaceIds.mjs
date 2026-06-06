/**
 * Bulk-resolve Google Place IDs for EVERY city that has sections/attractions.json
 * and isn't already in public/data/google-place-ids.json. This populates the map
 * the runtime enrichment reads to attach photos/ratings/hours to attraction cards.
 *
 * Cost note: requests only `places.id,places.displayName` (no photos) — the
 * enrichment fetches photos fresh per placeId at runtime, so the map only needs
 * the id. Writes the map incrementally after each city so a long run is resumable.
 *
 * Usage:
 *   node scripts/resolveAllAttractionPlaceIds.mjs           # all unmapped cities
 *   node scripts/resolveAllAttractionPlaceIds.mjs --force   # re-resolve even mapped cities
 */
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
const { searchPlaces } = await import('../src/lib/google-places/index.js');

const DATA = path.join(process.cwd(), 'public', 'data');
const MAP_PATH = path.join(DATA, 'google-place-ids.json');
const FORCE = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Discover every Country/city/sections/attractions.json
const cities = [];
for (const country of (await fs.readdir(DATA, { withFileTypes: true }))) {
  if (!country.isDirectory() || country.name.includes('.')) continue;
  const countryDir = path.join(DATA, country.name);
  for (const city of (await fs.readdir(countryDir, { withFileTypes: true }))) {
    if (!city.isDirectory()) continue;
    const attrPath = path.join(countryDir, city.name, 'sections', 'attractions.json');
    try { await fs.access(attrPath); cities.push({ country: country.name, slug: city.name.toLowerCase(), dir: city.name, attrPath }); }
    catch { /* no attractions for this city */ }
  }
}

let map = {};
try { map = JSON.parse(await fs.readFile(MAP_PATH, 'utf8')); } catch { map = {}; }

const todo = cities.filter((c) => FORCE || !(map[c.slug] && Object.keys(map[c.slug]).length));
console.log(`Found ${cities.length} cities with attractions; ${todo.length} to resolve${FORCE ? ' (force)' : ''}.\n`);

let cityN = 0;
let calls = 0;
for (const c of todo) {
  cityN += 1;
  let sites = [];
  try {
    const j = JSON.parse(await fs.readFile(c.attrPath, 'utf8'));
    sites = Array.isArray(j) ? j : j.sites || [];
  } catch { console.log(`[${cityN}/${todo.length}] ${c.slug}: unreadable, skip`); continue; }

  map[c.slug] = map[c.slug] || {};
  const cityName = titleCase(c.slug);
  let ok = 0;
  let miss = 0;
  for (const site of sites) {
    if (!site?.name) continue;
    try {
      const res = await searchPlaces(`${site.name}, ${cityName}, ${c.country}`, {
        maxResultCount: 1,
        fieldMask: 'places.id,places.displayName',
      });
      calls += 1;
      const place = res?.places?.[0];
      if (place?.id) {
        map[c.slug][site.name] = { placeId: place.id, confidence: 1, googleName: place.displayName?.text || site.name };
        ok += 1;
      } else { miss += 1; }
    } catch (err) {
      miss += 1;
      if (/quota|RESOURCE_EXHAUSTED|429/i.test(err?.message || '')) {
        console.log(`\n!! Rate/quota hit at ${c.slug} (${err.message}). Saving and stopping.`);
        await fs.writeFile(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
        process.exit(2);
      }
    }
    await sleep(110);
  }
  // Persist after each city so the run is resumable.
  await fs.writeFile(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  console.log(`[${cityN}/${todo.length}] ${c.country}/${c.slug}: ${ok} resolved, ${miss} missed (calls=${calls})`);
}

console.log(`\nDone. Resolved ${todo.length} cities, ${calls} searches. Map: ${MAP_PATH}`);
