#!/usr/bin/env node
/**
 * Resolve Google Place IDs for Paris experiences.
 *
 * Usage:
 *   node scripts/resolveExperiencePlaceIds.mjs --city paris
 *   node scripts/resolveExperiencePlaceIds.mjs --city paris --dry-run
 *   node scripts/resolveExperiencePlaceIds.mjs --city paris --confidence-threshold 0.8
 *
 * Writes to:
 *   - public/data/google-place-ids.json (under "paris-experiences" key)
 *   - public/data/France/paris/paris-experiences.json (adds googlePlaceKey field)
 *
 * Requires: GOOGLE_PLACES_API_KEY in .env.local
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const PLACE_IDS_PATH = path.join(DATA_DIR, 'google-place-ids.json');

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getFlag = (name) => args.includes(`--${name}`);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};

const TARGET_CITY = getArg('city');
const DRY_RUN = getFlag('dry-run');
const CONFIDENCE_THRESHOLD = parseFloat(getArg('confidence-threshold') || '0.6');
const RATE_MS = parseInt(getArg('rate') || '250', 10);
const FORCE = getFlag('force'); // Re-resolve even if already exists

if (!TARGET_CITY) {
  console.error('Usage: --city <slug> (e.g., --city paris)');
  process.exit(1);
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY && !DRY_RUN) {
  console.error('GOOGLE_PLACES_API_KEY not set in .env.local');
  process.exit(1);
}

// ── City Paths ───────────────────────────────────────────────────────

const CITY_CONFIG = {
  paris: {
    country: 'France',
    directoryName: 'paris',
    searchSuffix: 'Paris, France',
  },
  london: {
    country: 'UK',
    directoryName: 'london',
    searchSuffix: 'London, UK',
  },
  barcelona: {
    country: 'Spain',
    directoryName: 'barcelona',
    searchSuffix: 'Barcelona, Spain',
  },
  geneva: {
    country: 'Switzerland',
    directoryName: 'geneva',
    searchSuffix: 'Geneva, Switzerland',
  },
  // Add other cities as needed
};

const cityConfig = CITY_CONFIG[TARGET_CITY];
if (!cityConfig) {
  console.error(`City "${TARGET_CITY}" not configured. Add it to CITY_CONFIG.`);
  process.exit(1);
}

const EXPERIENCES_PATH = path.join(
  DATA_DIR,
  cityConfig.country,
  cityConfig.directoryName,
  `${cityConfig.directoryName}-experiences.json`
);

// ── Helpers ──────────────────────────────────────────────────────────

function readJson(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJson(fp, data) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Extract the likely venue/landmark name from an experience name.
 * Examples:
 * - "Watch sunrise from Trocadéro with Eiffel Tower views" → "Trocadéro"
 * - "Croissant + café crème at Café de Flore" → "Café de Flore"
 * - "Visit Sainte-Chapelle when the sun hits" → "Sainte-Chapelle"
 */
function extractVenueName(experienceName, address) {
  const name = experienceName || '';

  // Pattern: "at X" or "from X" or "of X" (captures after preposition)
  const atMatch = name.match(/\b(?:at|from|of)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s'-]+?)(?:\s+(?:with|when|for|and|\(|$))/i);
  if (atMatch) {
    return atMatch[1].trim();
  }

  // Pattern: "Visit X when" or "Explore X on"
  const visitMatch = name.match(/^(?:Visit|Explore|See|Tour|Wander)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s'-]+?)(?:\s+(?:when|on|at|for|and|\(|$))/i);
  if (visitMatch) {
    return visitMatch[1].trim();
  }

  // Pattern: "X bakery" or "X museum" or "X gardens"
  const venueTypeMatch = name.match(/([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s'-]+?)\s+(?:bakery|museum|gardens|gallery|market|church|cathedral|palace|tower|bridge)/i);
  if (venueTypeMatch) {
    return venueTypeMatch[1].trim();
  }

  // Use address as fallback - extract before the number
  if (address) {
    // "8 Bd du Palais, 75001 Paris" → use full address for search
    return address.split(',')[0].trim();
  }

  // Last resort: use the first few words (up to 5) as search term
  const words = name.split(/\s+/).slice(0, 5).join(' ');
  return words;
}

/**
 * Levenshtein-based similarity — 0.0 (totally different) to 1.0 (identical).
 */
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

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
 * Compute confidence that a Google result matches our experience location.
 */
function computeConfidence(searchTerm, lat, lon, googleResult) {
  const googleName = googleResult?.displayName?.text || '';
  const nameSim = nameSimilarity(searchTerm, googleName);

  let distScore = 0.5;
  if (lat && lon && googleResult?.location) {
    const dist = haversineM(
      lat,
      lon,
      googleResult.location.latitude,
      googleResult.location.longitude
    );
    if (dist < 50) distScore = 1;
    else if (dist < 200) distScore = 0.9;
    else if (dist < 500) distScore = 0.7;
    else if (dist < 1000) distScore = 0.5;
    else distScore = 0.3;
  }

  // Weight distance more heavily for experiences since we have exact coords
  return nameSim * 0.4 + distScore * 0.6;
}

// ── Google Text Search (New) ─────────────────────────────────────────

async function searchPlace(query, lat, lon) {
  const body = {
    textQuery: query + ', ' + cityConfig.searchSuffix,
    maxResultCount: 5,
  };
  if (lat && lon) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lon }, radius: 500 },
    };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.location,places.formattedAddress,places.types',
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
  console.log('=== Experience Place ID Resolution ===');
  console.log(`City: ${TARGET_CITY}`);
  if (DRY_RUN) console.log('MODE: DRY RUN');
  console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}`);

  // Load experiences
  const experiences = readJson(EXPERIENCES_PATH);
  if (!experiences?.categories) {
    console.error(`Cannot read experiences from ${EXPERIENCES_PATH}`);
    process.exit(1);
  }

  // Load existing place IDs
  const placeIds = readJson(PLACE_IDS_PATH) || {};
  const experienceKey = `${TARGET_CITY}-experiences`;
  if (!placeIds[experienceKey]) {
    placeIds[experienceKey] = {};
  }

  // Flatten all experiences
  const allExperiences = [];
  for (const [category, items] of Object.entries(experiences.categories)) {
    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        allExperiences.push({ category, index, ...item });
      });
    }
  }

  console.log(`\nFound ${allExperiences.length} experiences in ${Object.keys(experiences.categories).length} categories\n`);

  let totalResolved = 0;
  let totalLowConfidence = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalAlreadyHasKey = 0;

  for (const exp of allExperiences) {
    const name = exp.name;
    if (!name) continue;

    // Skip if already has googlePlaceKey and not forcing
    if (exp.googlePlaceKey && !FORCE) {
      totalAlreadyHasKey++;
      continue;
    }

    // Extract venue name for search. Honor a pre-set googlePlaceKey when forcing
    // a re-resolve so curated keys (e.g. business names) survive a --force run.
    const searchTerm = (FORCE && exp.googlePlaceKey)
      ? exp.googlePlaceKey
      : extractVenueName(name, exp.address);

    // Check if already resolved
    if (placeIds[experienceKey][searchTerm] && !FORCE) {
      // Just need to add googlePlaceKey to experience
      exp.googlePlaceKey = searchTerm;
      totalSkipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] "${name}"`);
      console.log(`        → Search: "${searchTerm}" @ (${exp.lat}, ${exp.lon})`);
      continue;
    }

    try {
      const result = await searchPlace(searchTerm, exp.lat, exp.lon);
      const places = result?.places || [];

      if (places.length === 0) {
        console.log(`  ✗ No results: "${searchTerm}" (from: ${name.slice(0, 40)}...)`);
        totalFailed++;
        await sleep(RATE_MS);
        continue;
      }

      // Find best match by confidence
      let bestPlace = places[0];
      let bestConfidence = computeConfidence(searchTerm, exp.lat, exp.lon, bestPlace);

      for (const place of places.slice(1)) {
        const conf = computeConfidence(searchTerm, exp.lat, exp.lon, place);
        if (conf > bestConfidence) {
          bestConfidence = conf;
          bestPlace = place;
        }
      }

      const placeId = bestPlace.id;
      const googleName = bestPlace.displayName?.text || '';

      // Store in place IDs
      placeIds[experienceKey][searchTerm] = {
        placeId,
        confidence: Math.round(bestConfidence * 100) / 100,
        googleName,
        experienceName: name,
      };

      // Add googlePlaceKey to experience
      exp.googlePlaceKey = searchTerm;

      if (bestConfidence < CONFIDENCE_THRESHOLD) {
        console.log(
          `  ⚠ Low confidence (${bestConfidence.toFixed(2)}): "${searchTerm}" → ${googleName}`
        );
        totalLowConfidence++;
      } else {
        console.log(`  ✓ "${searchTerm}" → ${googleName} (${bestConfidence.toFixed(2)})`);
      }

      totalResolved++;
      await sleep(RATE_MS);
    } catch (err) {
      console.error(`  ✗ Error for "${searchTerm}": ${err.message}`);
      totalFailed++;
      await sleep(RATE_MS * 2);
    }
  }

  if (!DRY_RUN) {
    // Update experiences with googlePlaceKey
    for (const [category, items] of Object.entries(experiences.categories)) {
      if (Array.isArray(items)) {
        items.forEach((item) => {
          const match = allExperiences.find(
            (e) => e.name === item.name && e.category === category
          );
          if (match?.googlePlaceKey) {
            item.googlePlaceKey = match.googlePlaceKey;
          }
        });
      }
    }

    // Write updated files
    writeJson(PLACE_IDS_PATH, placeIds);
    writeJson(EXPERIENCES_PATH, experiences);
  }

  console.log('\n=== RESOLUTION REPORT ===');
  console.log(`Resolved:           ${totalResolved}`);
  console.log(`Low confidence:     ${totalLowConfidence}`);
  console.log(`Skipped (existing): ${totalSkipped}`);
  console.log(`Already had key:    ${totalAlreadyHasKey}`);
  console.log(`Failed:             ${totalFailed}`);
  console.log(`\nOutput files:`);
  console.log(`  - ${PLACE_IDS_PATH}`);
  console.log(`  - ${EXPERIENCES_PATH}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
