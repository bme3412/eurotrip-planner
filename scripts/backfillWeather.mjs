#!/usr/bin/env node
/**
 * P1 dataset backfill — monthly weather normals via Open-Meteo (free, keyless).
 *
 * Fills `visitCalendar.months[m].weatherHighC` / `weatherLowC` (what the V4
 * TimingFactor reads — currently absent for ~52% of month-entries, where it
 * silently defaults to a neutral 5) and adds a richer `weatherDetails`
 * { highC, lowC, avgC, rainfallMm, sunshineHours, source } per month (field
 * names match what the V2 dateScorer already consumes).
 *
 * Source: Open-Meteo Archive API. For each city we fetch daily max/min temp,
 * precipitation, and sunshine over a fixed 10-year window and average per
 * calendar month → stable climate normals. Requires `coordinates` on index.json
 * (added by P0 / backfillCityMetadata.mjs).
 *
 * Patches index.json directly — the file V4 scoring + the running site read in
 * Phase A (the content build does not own index.json). Non-destructive by
 * default; resumable via a checkpoint file.
 *
 * Usage:
 *   node scripts/backfillWeather.mjs --dry-run            # preview, fetch nothing-written
 *   node scripts/backfillWeather.mjs --limit 5            # first 5 cities (smoke test)
 *   node scripts/backfillWeather.mjs                      # full run (resumes from checkpoint)
 *   node scripts/backfillWeather.mjs --city salzburg
 *   node scripts/backfillWeather.mjs --force              # overwrite existing weather too
 *   node scripts/backfillWeather.mjs --concurrency 6
 *
 * After a run: npm run build:scores
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'public', 'data', 'manifest.json');
const METADATA_PATH = path.join(ROOT, 'scripts', 'cityMetadata.json');
const CHECKPOINT_PATH = path.join(ROOT, 'scripts', '.weather_checkpoint.json');

const MONTHS_LOWER = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// Fixed window → deterministic normals. 5 years keeps Open-Meteo's *weighted*
// request cost (≈ days × variables) low enough to avoid its archive throttle,
// while still giving stable monthly climate normals.
const START_DATE = '2020-01-01';
const END_DATE = '2024-12-31';
const YEARS = 5;

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const DRY_RUN = has('--dry-run') || has('-n');
const FORCE = has('--force');
const ONLY_CITY = valueOf('--city');
const ONLY_COUNTRY = valueOf('--country');
const LIMIT = valueOf('--limit') ? parseInt(valueOf('--limit'), 10) : Infinity;
// Open-Meteo's free archive endpoint throttles hard on bursts (concurrency 5
// got mass-429'd), so default to sequential with global request spacing.
const CONCURRENCY = valueOf('--concurrency') ? parseInt(valueOf('--concurrency'), 10) : 1;
// ~15s spacing keeps us under Open-Meteo's free per-minute *weighted* limit for
// 5-year archive requests (each is heavy). Sustainable but slow (~4 cities/min).
const MIN_SPACING_MS = valueOf('--spacing') ? parseInt(valueOf('--spacing'), 10) : 15000;

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const metadata = fs.existsSync(METADATA_PATH) ? JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8')) : {};
const checkpoint = fs.existsSync(CHECKPOINT_PATH)
  ? JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'))
  : { done: [], failed: {} };
const doneSet = new Set(checkpoint.done);

function saveCheckpoint() {
  if (DRY_RUN) return;
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
}

function getCoords(idx, slug) {
  if (idx.coordinates && typeof idx.coordinates.lat === 'number') {
    return { lat: idx.coordinates.lat, lng: idx.coordinates.lng };
  }
  const m = metadata[slug];
  if (m && typeof m.latitude === 'number') return { lat: m.latitude, lng: m.longitude };
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Global request pacing gate so total request rate stays gentle regardless of
// concurrency (Open-Meteo's archive endpoint 429s on bursts).
let nextSlot = 0;
async function rateGate() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_SPACING_MS;
  if (wait) await sleep(wait);
}

async function fetchClimate(lat, lng, attempt = 1) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${START_DATE}&end_date=${END_DATE}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=auto`;
  await rateGate();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) return await res.json();
    if (res.status === 429 || res.status >= 500) {
      if (attempt <= 4) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
        const backoff = Math.max(retryAfter * 1000, Math.min(30000, attempt * 8000));
        await sleep(backoff);
        return fetchClimate(lat, lng, attempt + 1);
      }
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    // Network/abort errors: a few quick retries.
    if (attempt <= 4 && !/HTTP \d/.test(String(err.message))) {
      await sleep(attempt * 2000);
      return fetchClimate(lat, lng, attempt + 1);
    }
    throw err;
  }
}

// Aggregate daily series → per-calendar-month normals (keyed 1..12).
function aggregate(daily) {
  const buckets = {};
  const { time, temperature_2m_max: tmax, temperature_2m_min: tmin,
    precipitation_sum: precip, sunshine_duration: sun } = daily;
  for (let i = 0; i < time.length; i++) {
    const mm = parseInt(time[i].slice(5, 7), 10);
    if (!buckets[mm]) buckets[mm] = { hi: [], lo: [], precip: 0, sun: [] };
    const b = buckets[mm];
    if (tmax[i] != null) b.hi.push(tmax[i]);
    if (tmin[i] != null) b.lo.push(tmin[i]);
    if (precip[i] != null) b.precip += precip[i];
    if (sun[i] != null) b.sun.push(sun[i]);
  }
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const out = {};
  for (let mm = 1; mm <= 12; mm++) {
    const b = buckets[mm];
    if (!b) continue;
    const highC = Math.round(mean(b.hi));
    const lowC = Math.round(mean(b.lo));
    out[mm] = {
      highC,
      lowC,
      avgC: Math.round(((highC + lowC) / 2) * 10) / 10,
      rainfallMm: Math.round(b.precip / YEARS),
      sunshineHours: Math.round((mean(b.sun) / 3600) * 10) / 10, // avg daily sunshine hours
      source: 'open-meteo',
    };
  }
  return out;
}

function monthNumberOf(key, monthObj) {
  const name = (monthObj?.name || monthObj?.month || key || '').toString().toLowerCase();
  const i = MONTHS_LOWER.indexOf(name);
  return i >= 0 ? i + 1 : null;
}

// Apply normals to a city's visitCalendar.months; returns count of fields changed.
function applyToCity(idx, normals) {
  const months = idx.visitCalendar?.months;
  if (!months) return 0;
  let changed = 0;
  const entries = Array.isArray(months)
    ? months.map((m, i) => [i, m])
    : Object.entries(months);
  for (const [key, m] of entries) {
    if (!m || typeof m !== 'object') continue;
    const mm = monthNumberOf(key, m);
    const norm = mm && normals[mm];
    if (!norm) continue;
    if (m.weatherHighC === undefined || FORCE) { m.weatherHighC = norm.highC; changed++; }
    if (m.weatherLowC === undefined || FORCE) { m.weatherLowC = norm.lowC; changed++; }
    if (!m.weatherDetails || FORCE) {
      m.weatherDetails = {
        highC: norm.highC, lowC: norm.lowC, avgC: norm.avgC,
        rainfallMm: norm.rainfallMm, sunshineHours: norm.sunshineHours, source: norm.source,
      };
      changed++;
    }
  }
  if (changed > 0) {
    idx.provenance = { ...(idx.provenance || {}), weather: 'open-meteo' };
  }
  return changed;
}

// Build the work list.
const jobs = [];
for (const [slug, entry] of Object.entries(manifest.cities)) {
  if (ONLY_CITY && slug !== ONLY_CITY) continue;
  if (ONLY_COUNTRY && entry.country !== ONLY_COUNTRY) continue;
  if (doneSet.has(slug) && !FORCE) continue;
  jobs.push({ slug, entry });
}
const limited = jobs.slice(0, LIMIT);

const stats = { processed: 0, patched: 0, fieldsChanged: 0, skippedNoCoords: 0, skippedNoCal: 0, failed: 0 };

// Circuit breaker: once the daily quota is exhausted, every request 429s. Stop
// the run after a few consecutive rate-limit failures so a nightly job exits
// promptly (the checkpoint resumes the rest after the next quota reset).
let consecutive429 = 0;
let aborted = false;

async function runCity({ slug, entry }) {
  const indexPath = path.join(ROOT, 'public', 'data', entry.country, entry.directoryName, 'index.json');
  let idx;
  try { idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8')); }
  catch { stats.failed++; checkpoint.failed[slug] = 'no index.json'; return; }

  const coords = getCoords(idx, slug);
  if (!coords) { stats.skippedNoCoords++; return; }
  if (!idx.visitCalendar?.months) { stats.skippedNoCal++; return; }

  let normals;
  try {
    normals = aggregate((await fetchClimate(coords.lat, coords.lng)).daily);
    consecutive429 = 0;
  } catch (err) {
    stats.failed++;
    checkpoint.failed[slug] = String(err.message || err);
    console.warn(`  ✗ ${slug}: ${err.message}`);
    if (/HTTP 429/.test(String(err.message))) {
      consecutive429 += 1;
      if (consecutive429 >= 4 && !aborted) {
        aborted = true;
        console.warn('  ⏸  Open-Meteo quota appears exhausted — stopping this run; re-run after the daily reset to resume.');
      }
    }
    return;
  }

  const changed = applyToCity(idx, normals);
  stats.processed++;
  if (changed > 0) {
    stats.patched++;
    stats.fieldsChanged += changed;
    if (!DRY_RUN) fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2) + '\n', 'utf-8');
    console.log(`  ${DRY_RUN ? '[dry-run] would patch' : '✓'} ${slug}: ${changed} fields`);
  }
  if (!doneSet.has(slug)) { checkpoint.done.push(slug); doneSet.add(slug); }
  delete checkpoint.failed[slug];
}

// Simple concurrency-limited runner with periodic checkpoint flush.
async function main() {
  console.log(`Open-Meteo weather backfill — ${limited.length} cities (window ${START_DATE}..${END_DATE}), concurrency ${CONCURRENCY}${DRY_RUN ? ', DRY RUN' : ''}`);
  let cursor = 0;
  async function worker() {
    while (cursor < limited.length && !aborted) {
      const job = limited[cursor++];
      await runCity(job);
      if (cursor % 10 === 0) saveCheckpoint();
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, limited.length) }, worker));
  saveCheckpoint();

  console.log(`\n${DRY_RUN ? '🔍 Dry run complete' : '✅ Weather backfill complete'}`);
  console.log(`   processed: ${stats.processed}, ${DRY_RUN ? 'would patch' : 'patched'}: ${stats.patched}, fields changed: ${stats.fieldsChanged}`);
  console.log(`   skipped (no coords): ${stats.skippedNoCoords}, (no calendar): ${stats.skippedNoCal}, failed: ${stats.failed}`);
  if (stats.failed > 0) console.log(`   ⚠️  ${stats.failed} failed — re-run to retry (checkpoint skips successes).`);
  if (!DRY_RUN && stats.patched > 0) console.log(`\nNext: run 'npm run build:scores' to recompute monthly scores.\n`);
}

main();
