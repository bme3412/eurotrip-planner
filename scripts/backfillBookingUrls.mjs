/**
 * Backfill `booking_url` on culinary-guide entries via Google Places (New)
 * Text Search.
 *
 * Scope: only categories where the UI shows a Reserve action
 * (fine_dining, casual_dining, bars) — coffee shops and street food are
 * deliberately excluded.
 *
 * For each entry without a booking_url, runs one Text Search
 * ("{name} {city}") requesting places.displayName + places.websiteUri,
 * applies a normalized name-overlap guard against wrong-business matches,
 * and writes the website into:
 *   • content/cities/{country}/{city}/culinary.json   (the durable source)
 *   • public/data/{Country}/{city}/sections/culinary.json (so dev sees it now;
 *     rebuilt from content on `npm run build` anyway)
 *
 * Results (including "no match") are cached in scripts/bookingUrls.cache.json
 * so re-runs are free and resumable.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfillBookingUrls.mjs [--city paris] [--limit 50] [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textSearch } from '../src/lib/google-places/client.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'cities');
const PUBLIC_DIR = path.join(ROOT, 'public', 'data');
const CACHE_PATH = path.join(ROOT, 'scripts', 'bookingUrls.cache.json');

const INCLUDE_CATEGORIES = new Set(['fine_dining', 'casual_dining', 'bars']);
const CONCURRENCY = 5;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const DRY_RUN = flag('dry-run');
const ONLY_CITY = opt('city');
const LIMIT = opt('limit') ? Number(opt('limit')) : Infinity;

// ---------------------------------------------------------------------------

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

const cache = fs.existsSync(CACHE_PATH) ? loadJson(CACHE_PATH) : {};
let cacheDirty = false;

/** Case-insensitive map of public/data country folders ("france" → "France"). */
const publicCountryFolders = new Map(
  fs.existsSync(PUBLIC_DIR)
    ? fs
        .readdirSync(PUBLIC_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => [e.name.toLowerCase(), e.name])
    : [],
);

/** Normalize for name comparison: strip accents, lowercase, alnum words. */
function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(['le', 'la', 'les', 'l', 'de', 'du', 'des', 'the', 'el', 'il', 'da', 'di', 'at', 'restaurant', 'cafe', 'bar']);

/**
 * Guard against wrong-business matches: require meaningful token overlap
 * between the guide entry's name and the Places result's display name.
 */
function namesMatch(entryName, resultName) {
  const a = normalizeName(entryName).split(' ').filter((t) => t && !STOPWORDS.has(t));
  const b = new Set(normalizeName(resultName).split(' ').filter(Boolean));
  if (a.length === 0) return false;
  const hits = a.filter((t) => b.has(t)).length;
  return hits / a.length >= 0.5;
}

function* iterEntries(guide) {
  for (const grp of ['restaurants', 'bars_and_cafes']) {
    const g = guide?.[grp];
    if (!g || typeof g !== 'object' || Array.isArray(g)) continue;
    for (const [category, items] of Object.entries(g)) {
      if (!INCLUDE_CATEGORIES.has(category) || !Array.isArray(items)) continue;
      for (const entry of items) {
        if (entry && typeof entry === 'object' && entry.name) yield { grp, category, entry };
      }
    }
  }
}

async function lookupWebsite({ name, citySlug, countrySlug }) {
  const cacheKey = `${countrySlug}/${citySlug}/${name}`;
  if (cache[cacheKey]) return cache[cacheKey];

  let result = { status: 'nomatch', url: null };
  try {
    const res = await textSearch(`${name} ${citySlug.replace(/-/g, ' ')}`, {
      maxResultCount: 3,
      fieldMask: 'places.displayName,places.websiteUri',
    });
    const places = Array.isArray(res?.places) ? res.places : [];
    const hit = places.find(
      (p) => p?.websiteUri && namesMatch(name, p?.displayName?.text || ''),
    );
    if (hit) {
      result = { status: 'ok', url: hit.websiteUri, matched: hit.displayName?.text };
    }
  } catch (err) {
    // 429 → brief backoff and one retry; anything else records an error
    // without caching so a later run can retry it.
    if (err?.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return lookupWebsite({ name, citySlug, countrySlug });
    }
    console.error(`  ! ${name}: ${err.message}`);
    return { status: 'error', url: null };
  }

  cache[cacheKey] = result;
  cacheDirty = true;
  return result;
}

async function processCity(countrySlug, citySlug) {
  const contentPath = path.join(CONTENT_DIR, countrySlug, citySlug, 'culinary.json');
  if (!fs.existsSync(contentPath)) return null;
  const guide = loadJson(contentPath);

  const targets = [...iterEntries(guide)].filter(({ entry }) => !entry.booking_url);
  if (targets.length === 0) return { citySlug, written: 0, nomatch: 0, errors: 0 };

  let written = 0;
  let nomatch = 0;
  let errors = 0;

  // Small worker pool per city.
  let idx = 0;
  async function worker() {
    while (idx < targets.length) {
      const { entry } = targets[idx++];
      const res = await lookupWebsite({ name: entry.name, citySlug, countrySlug });
      if (res.status === 'ok') {
        entry.booking_url = res.url;
        written += 1;
      } else if (res.status === 'nomatch') {
        nomatch += 1;
      } else {
        errors += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));

  if (!DRY_RUN && written > 0) {
    saveJson(contentPath, guide);

    // Mirror into public/data so the running dev server reflects it now.
    const publicCountry = publicCountryFolders.get(countrySlug.toLowerCase());
    if (publicCountry) {
      const publicPath = path.join(PUBLIC_DIR, publicCountry, citySlug, 'sections', 'culinary.json');
      if (fs.existsSync(publicPath)) {
        const publicGuide = loadJson(publicPath);
        const urlByName = new Map(
          [...iterEntries(guide)].filter(({ entry }) => entry.booking_url).map(({ entry }) => [entry.name, entry.booking_url]),
        );
        for (const { entry } of iterEntries(publicGuide)) {
          const url = urlByName.get(entry.name);
          if (url) entry.booking_url = url;
        }
        saveJson(publicPath, publicGuide);
      }
    }
  }

  return { citySlug, written, nomatch, errors };
}

async function main() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY is not set (run with --env-file=.env.local)');
    process.exit(1);
  }

  const cities = [];
  for (const country of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!country.isDirectory()) continue;
    for (const city of fs.readdirSync(path.join(CONTENT_DIR, country.name), { withFileTypes: true })) {
      if (!city.isDirectory()) continue;
      if (ONLY_CITY && city.name !== ONLY_CITY) continue;
      cities.push([country.name, city.name]);
    }
  }

  console.log(`Backfilling booking URLs for ${cities.length} cities${DRY_RUN ? ' (dry run)' : ''}…`);
  const totals = { written: 0, nomatch: 0, errors: 0, cities: 0 };
  let processed = 0;

  for (const [countrySlug, citySlug] of cities) {
    if (totals.written + totals.nomatch + totals.errors >= LIMIT) break;
    const res = await processCity(countrySlug, citySlug);
    processed += 1;
    if (!res) continue;
    if (res.written || res.nomatch || res.errors) {
      totals.cities += 1;
      totals.written += res.written;
      totals.nomatch += res.nomatch;
      totals.errors += res.errors;
      console.log(
        `  ${countrySlug}/${res.citySlug}: +${res.written} urls, ${res.nomatch} no-match, ${res.errors} errors  [${processed}/${cities.length}]`,
      );
    }
    if (cacheDirty) {
      saveJson(CACHE_PATH, cache);
      cacheDirty = false;
    }
  }

  saveJson(CACHE_PATH, cache);
  console.log(
    `Done. ${totals.written} URLs written across ${totals.cities} cities; ${totals.nomatch} no-match; ${totals.errors} errors.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
