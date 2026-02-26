#!/usr/bin/env node
/**
 * Match existing attractions to Google place_ids via Text Search (New).
 *
 * Usage:
 *   node scripts/resolveGooglePlaceIds.mjs --city paris          # Single city
 *   node scripts/resolveGooglePlaceIds.mjs --all                 # All cities with attraction data
 *   node scripts/resolveGooglePlaceIds.mjs --all --confidence-threshold 0.8
 *   node scripts/resolveGooglePlaceIds.mjs --dry-run --city paris
 *
 * Writes to: public/data/google-place-ids.json
 * Resumes automatically — skips attractions already resolved.
 *
 * Requires: GOOGLE_PLACES_API_KEY in .env.local
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'google-place-ids.json');

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getFlag = (name) => args.includes(`--${name}`);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};

const TARGET_CITY = getArg('city');
const ALL = getFlag('all');
const DRY_RUN = getFlag('dry-run');
const CONFIDENCE_THRESHOLD = parseFloat(getArg('confidence-threshold') || '0.7');
const RATE_MS = parseInt(getArg('rate') || '200', 10);

if (!TARGET_CITY && !ALL) {
  console.error('Usage: --city <slug> or --all');
  process.exit(1);
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY && !DRY_RUN) {
  console.error('GOOGLE_PLACES_API_KEY not set in .env.local');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────

function readJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; }
}

function writeJson(fp, data) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Levenshtein-based similarity — 0.0 (totally different) to 1.0 (identical).
 */
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array.from({ length: len1 + 1 }, (_, i) =>
    Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

/**
 * Haversine distance in meters.
 */
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute confidence that a Google result matches our attraction.
 * Returns 0.0–1.0.
 */
function computeConfidence(ourName, ourLat, ourLon, googleResult) {
  const googleName = googleResult?.displayName?.text || '';
  const nameSim = nameSimilarity(ourName, googleName);

  let distScore = 0.5;
  if (ourLat && ourLon && googleResult?.location) {
    const dist = haversineM(ourLat, ourLon, googleResult.location.latitude, googleResult.location.longitude);
    if (dist < 100) distScore = 1;
    else if (dist < 500) distScore = 0.8;
    else if (dist < 2000) distScore = 0.5;
    else distScore = 0.2;
  }

  return nameSim * 0.6 + distScore * 0.4;
}

// ── Google Text Search (New) ─────────────────────────────────────────

async function searchPlace(query, lat, lon) {
  const body = {
    textQuery: query,
    maxResultCount: 3,
  };
  if (lat && lon) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lon }, radius: 2000 },
    };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Text Search failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Google Place ID Resolution ===');
  if (DRY_RUN) console.log('MODE: DRY RUN');
  console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}`);

  const manifest = readJson(MANIFEST_PATH);
  if (!manifest?.cities) {
    console.error('Cannot read manifest.json');
    process.exit(1);
  }

  const existing = readJson(OUTPUT_PATH) || {};

  const entries = Object.entries(manifest.cities);
  let targets;
  if (TARGET_CITY) {
    const entry = manifest.cities[TARGET_CITY];
    if (!entry) { console.error(`City "${TARGET_CITY}" not found`); process.exit(1); }
    targets = [[TARGET_CITY, entry]];
  } else {
    targets = entries;
  }

  let totalResolved = 0;
  let totalLowConfidence = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const [slug, entry] of targets) {
    const cityDir = path.join(DATA_DIR, entry.country, entry.directoryName);
    const idx = readJson(path.join(cityDir, 'index.json'));
    const sites = idx?.attractions?.sites;
    if (!sites?.length) continue;

    const cityName = idx?.overview?.city_name || slug.replace(/-/g, ' ');
    console.log(`\n── ${cityName} (${slug}) — ${sites.length} attractions ──`);

    if (!existing[slug]) existing[slug] = {};

    for (const site of sites) {
      const name = site.name;
      if (!name) continue;

      if (existing[slug][name]) {
        totalSkipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY] Would search: "${name}, ${cityName}"`);
        continue;
      }

      try {
        const result = await searchPlace(
          `${name}, ${cityName}`,
          site.latitude,
          site.longitude
        );

        const places = result?.places || [];
        if (places.length === 0) {
          console.log(`  ✗ No results: ${name}`);
          totalFailed++;
          await sleep(RATE_MS);
          continue;
        }

        const best = places[0];
        const confidence = computeConfidence(name, site.latitude, site.longitude, best);
        const placeId = best.id;

        existing[slug][name] = {
          placeId,
          confidence: Math.round(confidence * 100) / 100,
          googleName: best.displayName?.text || null,
        };

        if (confidence < CONFIDENCE_THRESHOLD) {
          console.log(`  ⚠ Low confidence (${confidence.toFixed(2)}): ${name} → ${best.displayName?.text}`);
          totalLowConfidence++;
        } else {
          console.log(`  ✓ ${name} → ${placeId} (${confidence.toFixed(2)})`);
        }

        totalResolved++;
        writeJson(OUTPUT_PATH, existing);
        await sleep(RATE_MS);
      } catch (err) {
        console.error(`  ✗ Error for "${name}": ${err.message}`);
        totalFailed++;
        await sleep(RATE_MS * 2);
      }
    }
  }

  if (!DRY_RUN) {
    writeJson(OUTPUT_PATH, existing);
  }

  console.log('\n=== RESOLUTION REPORT ===');
  console.log(`Resolved:       ${totalResolved}`);
  console.log(`Low confidence: ${totalLowConfidence}`);
  console.log(`Skipped (existing): ${totalSkipped}`);
  console.log(`Failed:         ${totalFailed}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
