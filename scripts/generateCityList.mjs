#!/usr/bin/env node
/**
 * Generates src/generated/cities.json from public/data/ sources.
 *
 * Sources:
 *   - public/data/manifest.json          (city registry — authoritative list)
 *   - public/data/{Country}/{city}/index.json (overview data, descriptions)
 *   - scripts/cityMetadata.json           (coordinates, regions, categories
 *                                          extracted from the old cityData.js)
 *
 * Output: src/generated/cities.json
 *   - Lightweight city list for client-side use (search, filtering, cards)
 *   - Target: <30KB gzipped
 *
 * Also:  src/generated/cityIndex.js       (convenience re-export module)
 *
 * Run: node scripts/generateCityList.mjs
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const OUT_DIR = path.join(ROOT, 'src', 'generated');

// ── Region mapping from country ──────────────────────────────────────
const COUNTRY_TO_REGION = {
  'France': 'Atlantic Europe', 'Belgium': 'Atlantic Europe', 'Netherlands': 'Atlantic Europe', 'Luxembourg': 'Atlantic Europe',
  'Germany': 'Central Europe', 'Switzerland': 'Alpine', 'Austria': 'Alpine', 'Liechtenstein': 'Alpine',
  'Czech Republic': 'Central Europe', 'Czechia': 'Central Europe', 'Slovakia': 'Central Europe', 'Hungary': 'Central Europe', 'Poland': 'Central Europe',
  'Italy': 'Mediterranean', 'Spain': 'Mediterranean', 'Portugal': 'Atlantic Europe', 'Greece': 'Mediterranean', 'Malta': 'Mediterranean', 'Cyprus': 'Mediterranean',
  'Croatia': 'Mediterranean', 'Montenegro': 'Mediterranean', 'Albania': 'Mediterranean', 'Slovenia': 'Alpine',
  'United Kingdom': 'Celtic & Nordic', 'Ireland': 'Celtic & Nordic',
  'Denmark': 'Celtic & Nordic', 'Sweden': 'Celtic & Nordic', 'Norway': 'Celtic & Nordic', 'Finland': 'Celtic & Nordic', 'Iceland': 'Arctic',
  'Estonia': 'Celtic & Nordic', 'Latvia': 'Celtic & Nordic', 'Lithuania': 'Celtic & Nordic',
  'Romania': 'Imperial Cities', 'Bulgaria': 'Imperial Cities', 'Serbia': 'Imperial Cities',
  'Bosnia-and-Herzegovina': 'Imperial Cities', 'North-Macedonia': 'Imperial Cities', 'Kosovo': 'Imperial Cities',
  'Turkey': 'Mediterranean', 'Moldova': 'Imperial Cities', 'Ukraine': 'Imperial Cities', 'Belarus': 'Imperial Cities',
  'Monaco': 'Mediterranean', 'San-Marino': 'Mediterranean', 'Andorra': 'Mediterranean',
};

// ── Load sources ────────────────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf-8'));
let bridgeMetadata = {};
const bridgePath = path.join(ROOT, 'scripts', 'cityMetadata.json');
if (fs.existsSync(bridgePath)) {
  bridgeMetadata = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
}

// ── Helpers ─────────────────────────────────────────────────────────
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

function truncate(str, len) {
  if (!str) return '';
  str = str.replace(/\s+/g, ' ').trim();
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

function capitalize(s) {
  if (!s) return '';
  return s.split(/[-\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── Build the city list ─────────────────────────────────────────────
const cities = [];
const citiesMap = manifest.cities || {};

for (const [slug, entry] of Object.entries(citiesMap)) {
  const { country, directoryName } = entry;
  const cityDir = path.join(DATA_DIR, country, directoryName);

  // Read index.json for overview data
  const idx = readJson(path.join(cityDir, 'index.json'));
  const overview = idx?.overview || null;

  // Bridge data from old cityData.js
  const bridge = bridgeMetadata[slug] || {};

  // ── City name ──
  const name = overview?.city_name || bridge.name || capitalize(slug);

  // ── Description ──
  const rawDesc = overview?.brief_description || bridge.description || '';
  const description = truncate(rawDesc, 160);

  // ── Coordinates ──
  let latitude = overview?.coordinates?.latitude || bridge.latitude || null;
  let longitude = overview?.coordinates?.longitude || bridge.longitude || null;
  // Some overviews store coords as [lon, lat]
  if (!latitude && overview?.coordinates && Array.isArray(overview.coordinates)) {
    longitude = overview.coordinates[0];
    latitude = overview.coordinates[1];
  }

  // ── Region ──
  const region = bridge.region || COUNTRY_TO_REGION[country] || 'Other';

  // ── Thumbnail ──
  // Preferred:  /images/cities/{Country}/{slug}/thumbnail.jpeg  (new per-city layout)
  // Legacy:     /images/city-thumbnail/{Country}/{slug}-thumbnail.{jpeg,jpg}
  // Resolve to a path that actually exists on disk. If none do, leave it empty
  // so consumers fall straight to the CDN/placeholder instead of firing (and
  // failing) a next/image optimizer request for a file that isn't there.
  let thumbnail = bridge.thumbnail || '';
  if (!thumbnail) {
    const candidates = [
      [`/images/cities/${country}/${slug}/thumbnail.jpeg`, path.join(ROOT, 'public', 'images', 'cities', country, slug, 'thumbnail.jpeg')],
      [`/images/city-thumbnail/${country}/${slug}-thumbnail.jpeg`, path.join(ROOT, 'public', 'images', 'city-thumbnail', country, `${slug}-thumbnail.jpeg`)],
      [`/images/city-thumbnail/${country}/${slug}-thumbnail.jpg`, path.join(ROOT, 'public', 'images', 'city-thumbnail', country, `${slug}-thumbnail.jpg`)],
      [`/images/city-page/${country}/${slug}-hero.jpeg`, path.join(ROOT, 'public', 'images', 'city-page', country, `${slug}-hero.jpeg`)],
    ];
    const hit = candidates.find(([, abs]) => fs.existsSync(abs));
    thumbnail = hit ? hit[0] : '';
  }

  // ── Categories ──
  const tourismCategories = bridge.tourismCategories || [];
  const linguisticCategories = bridge.linguisticCategories || [];

  cities.push({
    id: slug,
    name,
    country: country.replace(/-/g, ' '),  // "Bosnia-and-Herzegovina" → "Bosnia and Herzegovina"
    description,
    thumbnail,
    latitude,
    longitude,
    region,
    tourismCategories,
    linguisticCategories,
  });
}

// Sort alphabetically by name
cities.sort((a, b) => a.name.localeCompare(b.name));

// ── Write output ────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

fs.writeFileSync(
  path.join(OUT_DIR, 'cities.json'),
  JSON.stringify(cities, null, 0),  // minified
  'utf-8'
);

// Module wrapper
fs.writeFileSync(
  path.join(OUT_DIR, 'cityIndex.js'),
  `// Auto-generated — do not edit manually
// Run: node scripts/generateCityList.mjs
import cities from './cities.json';
export default cities;
export function getCitiesData() { return cities; }
export const cityById = Object.fromEntries(cities.map(c => [c.id, c]));
export const cityCount = cities.length;
export { cities };
`,
  'utf-8'
);

// ── Report ──────────────────────────────────────────────────────────
const withCoords = cities.filter(c => c.latitude && c.longitude).length;
const withDesc = cities.filter(c => c.description.length > 10).length;
const fileSize = fs.statSync(path.join(OUT_DIR, 'cities.json')).size;

console.log(`\n✅ Generated ${cities.length} cities → src/generated/cities.json`);
console.log(`   File size: ${(fileSize / 1024).toFixed(1)} KB`);
console.log(`   With coordinates: ${withCoords}/${cities.length}`);
console.log(`   With descriptions: ${withDesc}/${cities.length}\n`);
