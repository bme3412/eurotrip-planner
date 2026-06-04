/**
 * Bake Google Place *photo names* into public/data/google-place-ids.json.
 *
 * Each entry already carries a `placeId`. On the client, resolving a placeId to
 * a photo requires a server-side Place Details round-trip per image (placeId →
 * photos[0].name → photo redirect), which leaves experience cards blank for
 * seconds on first load. By baking the resolved `photoName` here, the client
 * can request the photo in a single hop (`/api/google-photos?name=...`).
 *
 * Usage:
 *   node scripts/bakeExperiencePhotoNames.mjs paris            # paris + paris-experiences
 *   node scripts/bakeExperiencePhotoNames.mjs paris rome       # multiple cities
 *   node scripts/bakeExperiencePhotoNames.mjs --all            # every top-level key
 *   node scripts/bakeExperiencePhotoNames.mjs paris --force    # re-resolve existing photoNames
 *
 * Needs GOOGLE_PLACES_API_KEY (loaded from .env.local). One Details call per
 * entry missing a photoName; results are written back in place.
 */

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

const { getPlaceDetails } = await import('../src/lib/google-places/index.js');

const DATA_PATH = path.join(process.cwd(), 'public', 'data', 'google-place-ids.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const force = args.includes('--force');
const all = args.includes('--all');
const cityArgs = args.filter((a) => !a.startsWith('--')).map((s) => s.toLowerCase());

const json = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));

// Resolve which top-level keys to process. For "paris" we also pick up
// "paris-experiences" (and any other "<city>-*" sibling buckets).
let keys;
if (all) {
  keys = Object.keys(json);
} else if (cityArgs.length) {
  keys = Object.keys(json).filter((k) =>
    cityArgs.some((c) => k === c || k.startsWith(`${c}-`)),
  );
} else {
  console.error('Specify one or more city slugs, or --all. e.g. `node scripts/bakeExperiencePhotoNames.mjs paris`');
  process.exit(1);
}

if (!keys.length) {
  console.error('No matching top-level keys in google-place-ids.json for:', cityArgs.join(', ') || '(none)');
  process.exit(1);
}

console.log('Processing buckets:', keys.join(', '));

let resolved = 0;
let skipped = 0;
let failed = 0;

for (const bucket of keys) {
  const entries = json[bucket];
  if (!entries || typeof entries !== 'object') continue;
  for (const [name, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== 'object' || !entry.placeId) {
      skipped += 1;
      continue;
    }
    if (entry.photoName && !force) {
      skipped += 1;
      continue;
    }
    try {
      const details = await getPlaceDetails(entry.placeId, 'photos');
      const photoName = details?.photos?.[0]?.name || null;
      if (photoName) {
        entry.photoName = photoName;
        resolved += 1;
        process.stdout.write(`  ✓ ${bucket} :: ${name}\n`);
      } else {
        // Record the absence so we don't re-query every run.
        entry.photoName = null;
        skipped += 1;
        process.stdout.write(`  – ${bucket} :: ${name} (no photo)\n`);
      }
    } catch (err) {
      failed += 1;
      process.stdout.write(`  ✗ ${bucket} :: ${name} — ${err?.message || err}\n`);
    }
    // Gentle pacing to stay well under rate limits.
    await sleep(120);
  }
}

await fs.writeFile(DATA_PATH, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
console.log(`\nDone. resolved=${resolved} skipped=${skipped} failed=${failed}`);
console.log(`Wrote ${DATA_PATH}`);
