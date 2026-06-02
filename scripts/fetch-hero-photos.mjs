/**
 * Build-time fetch of real Google Places photos for the landing hero.
 *
 * For each curated hero city it runs a Places API (New) text search, scans the
 * photos of the top results, and keeps the best LANDSCAPE shot (widest, highest
 * resolution). It records the photo resource name + author attribution + dims —
 * NOT the image bytes (per Google's terms the image is always served live via the
 * /api/google-photos proxy). Cities with no good landscape photo are omitted, so
 * the hero falls back to the bundled image for those.
 *
 * Run:  set -a; . ./.env.local; set +a; node scripts/fetch-hero-photos.mjs
 * Output: src/components/home/hero/heroPhotos.json
 */
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) {
  console.error("GOOGLE_PLACES_API_KEY not set — run with: set -a; . ./.env.local; set +a");
  process.exit(1);
}

// Keys must match the `key` field on heroImages.js CINEMATIC entries.
// Queries target each city's iconic postcard view — locality-only search returns
// unpredictable snapshots (statues, sculptures, random buildings).
const CITIES = [
  { key: "paris", query: "Eiffel Tower, Paris, France" },
  { key: "amalfi", query: "Amalfi Coast, Italy" },
  { key: "reykjavik", query: "Hallgrimskirkja, Reykjavik, Iceland" },
  { key: "annecy", query: "Palais de l'Isle, Annecy, France" },
  { key: "copenhagen", query: "Nyhavn, Copenhagen, Denmark" },
];

const OUT = path.join("src", "components", "home", "hero", "heroPhotos.json");

async function searchPlaces(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.displayName,places.photos",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 3 }),
  });
  if (!res.ok) throw new Error(`searchText ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).places || [];
}

// Pick the widest landscape photo across all candidate places.
function bestLandscape(places) {
  const photos = places.flatMap((p) => p.photos || []);
  const landscape = photos
    .filter((ph) => ph.widthPx && ph.heightPx && ph.widthPx / ph.heightPx >= 1.3)
    .sort((a, b) => b.widthPx - a.widthPx);
  return landscape[0] || null;
}

const result = {};
for (const city of CITIES) {
  try {
    const places = await searchPlaces(city.query);
    const photo = bestLandscape(places);
    if (!photo) {
      console.log(`${city.key.padEnd(11)} — no landscape photo, will use fallback`);
      continue;
    }
    const attr = (photo.authorAttributions || [])[0] || null;
    result[city.key] = {
      photoName: photo.name,
      width: photo.widthPx,
      height: photo.heightPx,
      attribution: attr ? { name: attr.displayName, uri: attr.uri } : null,
    };
    console.log(
      `${city.key.padEnd(11)} — ${photo.widthPx}x${photo.heightPx} by ${attr?.displayName || "unknown"}`
    );
  } catch (err) {
    console.log(`${city.key.padEnd(11)} — error: ${err.message} (will use fallback)`);
  }
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n", "utf-8");
console.log(`\nWrote ${Object.keys(result).length} cities -> ${OUT}`);
