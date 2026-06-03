/**
 * Bake the home-hero city photos to LOCAL static files.
 *
 * For each city in src/components/home/hero/heroImages.js (CINEMATIC), this
 * searches Google Places for the `query`, downloads the top result's first
 * photo, gently lifts it if it is too dark, writes an optimized JPEG to
 * public/images/home-hero/<key>.jpeg, and records the result (local path +
 * Google attribution) in src/components/home/hero/heroPhotos.json.
 *
 * Why local files: the hero used to resolve a Google photo URL at runtime via
 * the /api/google-photos proxy, so a slow/expired response left the dark panel
 * showing ("black Paris"). Local static files load instantly and cache cleanly.
 *
 * Usage:
 *   node scripts/fetchHomeHeroPhotos.mjs           # all CINEMATIC cities
 *   node scripts/fetchHomeHeroPhotos.mjs paris rome
 *
 * Needs GOOGLE_PLACES_API_KEY (from .env.local). One Text Search + one photo
 * download per city.
 */

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });

const { searchPlaces, getPlacePhotoUrl } = await import('../src/lib/google-places/index.js');
const { CINEMATIC } = await import('../src/components/home/hero/heroImages.js');

const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'home-hero');
const JSON_PATH = path.join(process.cwd(), 'src', 'components', 'home', 'hero', 'heroPhotos.json');
const PUBLIC_PREFIX = '/images/home-hero';
const MAX_WIDTH = 1600;
// Perceptual-luminance target; sources below this get a proportional lift.
const BRIGHTNESS_FLOOR = 112;
const MAX_LIFT = 1.6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv.slice(2).map((s) => s.toLowerCase());
const cities = only.length ? CINEMATIC.filter((c) => only.includes(c.key)) : CINEMATIC;

await fs.mkdir(OUT_DIR, { recursive: true });

// Merge into any existing JSON so a partial run doesn't drop other cities.
let out = {};
try { out = JSON.parse(await fs.readFile(JSON_PATH, 'utf8')); } catch { out = {}; }

const meanLuma = (stats) => {
  const [r, g, b] = stats.channels;
  return 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
};

let ok = 0;
let failed = 0;

for (const c of cities) {
  try {
    const res = await searchPlaces(c.query, {
      maxResultCount: 1,
      fieldMask: 'places.id,places.displayName,places.photos',
    });
    const place = res?.places?.[0];
    const photo = place?.photos?.find((p) => p?.name);
    if (!photo) throw new Error('no photo in search result');

    const photoUri = await getPlacePhotoUrl(photo.name, MAX_WIDTH * 2);
    const imgRes = await fetch(photoUri);
    if (!imgRes.ok) throw new Error(`photo download ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());

    let pipeline = sharp(buf).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
    const stats = await sharp(buf).stats();
    const luma = meanLuma(stats);
    let lift = 1;
    if (luma < BRIGHTNESS_FLOOR) {
      lift = Math.min(MAX_LIFT, BRIGHTNESS_FLOOR / Math.max(1, luma));
      pipeline = pipeline.modulate({ brightness: lift });
    }
    const outBuf = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const meta = await sharp(outBuf).metadata();
    const file = path.join(OUT_DIR, `${c.key}.jpeg`);
    await fs.writeFile(file, outBuf);

    const attr = photo.authorAttributions?.[0] || null;
    out[c.key] = {
      photoName: photo.name,
      local: `${PUBLIC_PREFIX}/${c.key}.jpeg`,
      width: meta.width,
      height: meta.height,
      attribution: attr ? { name: attr.displayName, uri: attr.uri } : null,
      sourceBrightness: Math.round(luma),
      lift: Number(lift.toFixed(2)),
    };
    ok += 1;
    console.log(`  ✓ ${c.key.padEnd(12)} luma=${Math.round(luma)} lift=${lift.toFixed(2)} → ${c.key}.jpeg (${meta.width}x${meta.height})`);
  } catch (err) {
    failed += 1;
    console.log(`  ✗ ${c.key.padEnd(12)} ${err?.message || err}`);
  }
  await sleep(150);
}

await fs.writeFile(JSON_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(`\nDone. ok=${ok} failed=${failed}. Wrote ${JSON_PATH}`);
