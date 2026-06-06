/**
 * Resolve Google Place IDs (+ a baked photoName) for a city's attractions and
 * write them into public/data/google-place-ids.json. This is the map the
 * runtime enrichment (src/lib/google-places/enrichment.js) reads to attach
 * photos, ratings, hours, and summaries to attraction cards.
 *
 * One Text Search per attraction. Needs GOOGLE_PLACES_API_KEY (.env.local).
 *
 * Usage:
 *   node scripts/resolveAttractionPlaceIds.mjs <Country> <citySlug>
 *   node scripts/resolveAttractionPlaceIds.mjs Germany berlin
 */
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
const { searchPlaces } = await import('../src/lib/google-places/index.js');

const [country, citySlug] = process.argv.slice(2);
if (!country || !citySlug) {
  console.error('usage: node scripts/resolveAttractionPlaceIds.mjs <Country> <citySlug>');
  process.exit(1);
}

const ATTR_PATH = path.join(process.cwd(), 'public', 'data', country, citySlug, 'sections', 'attractions.json');
const MAP_PATH = path.join(process.cwd(), 'public', 'data', 'google-place-ids.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const attractions = JSON.parse(await fs.readFile(ATTR_PATH, 'utf8'));
const sites = Array.isArray(attractions) ? attractions : attractions.sites || [];
const cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

let map = {};
try { map = JSON.parse(await fs.readFile(MAP_PATH, 'utf8')); } catch { map = {}; }
map[citySlug] = map[citySlug] || {};

let ok = 0;
let missed = 0;
for (const site of sites) {
  if (!site?.name) continue;
  try {
    const res = await searchPlaces(`${site.name}, ${cityName}, ${country}`, {
      maxResultCount: 1,
      fieldMask: 'places.id,places.displayName,places.photos',
    });
    const place = res?.places?.[0];
    if (!place?.id) { missed += 1; console.log(`  ✗ ${site.name} — no place`); continue; }
    const photo = (place.photos || []).find((p) => p?.name);
    map[citySlug][site.name] = {
      placeId: place.id,
      confidence: 1,
      googleName: place.displayName?.text || site.name,
      ...(photo ? { photoName: photo.name } : {}),
    };
    ok += 1;
    console.log(`  ✓ ${site.name.padEnd(34)} ${place.id}${photo ? ' +photo' : ' (no photo)'}`);
  } catch (err) {
    missed += 1;
    console.log(`  ✗ ${site.name} — ${err?.message || err}`);
  }
  await sleep(120);
}

await fs.writeFile(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
console.log(`\nDone. ${citySlug}: resolved=${ok} missed=${missed}. Wrote ${MAP_PATH}`);
