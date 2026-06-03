#!/usr/bin/env node
/**
 * Extracts a compact "visit calendar" for every city from its index.json.
 *
 * Each city's index.json already carries a rich `visitCalendar.months` object
 * (per-month weather + per-range score, event, notes, crowdLevel, travelerTypes).
 * This script flattens that into a small per-city file the homepage widget can
 * lazy-fetch, plus a single bundled file for the default city (instant paint).
 *
 * Outputs:
 *   public/calendars/{slug}.json            (one per city, lazy-fetched)
 *   src/generated/defaultCityCalendar.json  (default city, bundled)
 *
 * Run: node scripts/generateCityCalendars.mjs
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const OUT_DIR = path.join(ROOT, 'public', 'calendars');
const GENERATED_DIR = path.join(ROOT, 'src', 'generated');
const DEFAULT_SLUG = 'barcelona';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf-8'));
}

/** Map of slug -> proper display name from the generated lite catalog. */
function loadNameLookup() {
  try {
    const lite = JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, 'citiesLite.json'), 'utf-8'));
    return new Map(lite.map((c) => [c.id, c.name]));
  } catch {
    return new Map();
  }
}

function loadCityIndex(manifest, cityId) {
  const info = manifest.cities?.[cityId];
  if (!info) return null;
  const p = path.join(DATA_DIR, info.country, info.directoryName, 'index.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

/** Flatten one city's visitCalendar into the compact widget shape. */
function buildCalendar({ slug, name, country, index }) {
  const monthsIn = index?.visitCalendar?.months;
  if (!monthsIn) return null;

  const months = {};
  let rangeCount = 0;

  for (const key of MONTHS) {
    const m = monthsIn[key];
    if (!m?.ranges?.length) continue;

    months[key] = {
      weatherHighC: typeof m.weatherHighC === 'number' ? m.weatherHighC : null,
      weatherLowC: typeof m.weatherLowC === 'number' ? m.weatherLowC : null,
      tourismLevel: typeof m.tourismLevel === 'number' ? m.tourismLevel : null,
      ranges: m.ranges.map((r) => ({
        days: r.days,
        score: r.score,
        special: !!r.special || !!r.event,
        event: r.event || null,
        notes: r.notes || null,
        crowdLevel: r.crowdLevel || null,
        travelerTypes: r.travelerTypes || null,
      })),
    };
    rangeCount += m.ranges.length;
  }

  if (!Object.keys(months).length) return null;

  return {
    calendar: { slug, name, country, flagCountry: country, months },
    rangeCount,
  };
}

function main() {
  const manifest = loadManifest();
  const names = loadNameLookup();
  const cityIds = Object.keys(manifest.cities || {});

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  let defaultCalendar = null;
  const available = [];

  for (const slug of cityIds) {
    const info = manifest.cities[slug];
    const index = loadCityIndex(manifest, slug);
    const name = names.get(slug) || info.displayName || slug;
    const built = buildCalendar({ slug, name, country: info.country, index });

    if (!built) {
      skipped += 1;
      continue;
    }

    fs.writeFileSync(
      path.join(OUT_DIR, `${slug}.json`),
      JSON.stringify(built.calendar)
    );
    written += 1;
    available.push({ slug, name, country: info.country });

    if (slug === DEFAULT_SLUG) defaultCalendar = built.calendar;
  }

  // Index of cities that actually have a calendar — drives the search picker.
  available.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(
    path.join(GENERATED_DIR, 'cityCalendarIndex.json'),
    JSON.stringify(available)
  );

  // Bundle the default city for instant first paint.
  if (!defaultCalendar) {
    const firstFile = fs.readdirSync(OUT_DIR).find((f) => f.endsWith('.json'));
    if (firstFile) {
      defaultCalendar = JSON.parse(fs.readFileSync(path.join(OUT_DIR, firstFile), 'utf-8'));
    }
  }
  if (defaultCalendar) {
    fs.writeFileSync(
      path.join(GENERATED_DIR, 'defaultCityCalendar.json'),
      JSON.stringify(defaultCalendar, null, 2)
    );
  }

  console.log(`[calendars] wrote ${written} city calendars, skipped ${skipped} (no visitCalendar)`);
  console.log(`[calendars] default city: ${defaultCalendar?.slug || 'none'}`);
}

main();
