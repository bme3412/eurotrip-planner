#!/usr/bin/env node

/**
 * Build Scoreboard Buckets
 *
 * Generates pre-computed scoreboard data for hero V2.
 * Outputs JSON files to public/data/_scoreboard/{bucket}.json
 *
 * Buckets:
 * - this-week: Next 7 days
 * - may: May 2026 (or current month + 1)
 * - summer: June-August 2026
 *
 * Usage: node scripts/build-scoreboard-buckets.mjs
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Output directory
const OUTPUT_DIR = path.join(ROOT, "public/data/_scoreboard");

// Load cities
async function loadCities() {
  const data = await fs.readFile(
    path.join(ROOT, "src/generated/cities.json"),
    "utf-8"
  );
  return JSON.parse(data);
}

// Load manifest
async function loadManifest() {
  try {
    const data = await fs.readFile(
      path.join(ROOT, "public/data/manifest.json"),
      "utf-8"
    );
    return JSON.parse(data);
  } catch {
    return { cities: {} };
  }
}

// Load city data
async function loadCityData(manifest, cityId) {
  const cityInfo = manifest.cities?.[cityId];
  if (!cityInfo) return null;

  try {
    const cityPath = path.join(
      ROOT,
      "public/data",
      cityInfo.country,
      cityInfo.directoryName,
      "index.json"
    );
    const data = await fs.readFile(cityPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Generate deterministic stub score for development
function generateStubScore(cityId, bucket) {
  // Simple hash for deterministic scores
  const hash = cityId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bucketHash = bucket.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

  return {
    score: 60 + ((hash + bucketHash) % 40), // 60-99
    weather: {
      highC: 15 + ((hash * 3) % 20),
      lowC: 5 + ((hash * 2) % 15),
      condition: ["sunny", "partly-cloudy", "cloudy"][hash % 3],
    },
    crowds: ["low", "moderate", "high"][(hash + bucketHash) % 3],
    value: ["budget", "moderate", "premium"][hash % 3],
    events: (hash % 5),
    vibe: [
      "Perfect weather for sightseeing",
      "Great value this season",
      "Popular but worth it",
      "Hidden gem timing",
      "Peak season atmosphere",
    ][hash % 5],
  };
}

// Get date ranges for buckets
function getBucketDates(bucket) {
  const now = new Date();

  switch (bucket) {
    case "this-week": {
      const start = new Date(now);
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case "may": {
      // Next May
      const year = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
      return {
        start: new Date(year, 4, 1),
        end: new Date(year, 4, 31),
      };
    }
    case "summer": {
      // Next summer
      const year = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
      return {
        start: new Date(year, 5, 1),
        end: new Date(year, 7, 31),
      };
    }
    default:
      return { start: now, end: new Date(now.setDate(now.getDate() + 30)) };
  }
}

// Build scoreboard data for a bucket
async function buildBucket(bucket, cities, manifest) {
  const { start, end } = getBucketDates(bucket);

  console.log(`Building ${bucket}: ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`);

  const results = [];

  for (const city of cities) {
    const cityData = await loadCityData(manifest, city.id);

    // Use stub scores for now (can integrate real scorer later)
    const stub = generateStubScore(city.id, bucket);

    results.push({
      key: city.id,
      name: city.name,
      country: city.country,
      thumbnail: city.thumbnail,
      score: stub.score,
      weather: stub.weather,
      crowds: stub.crowds,
      value: stub.value,
      events: stub.events,
      vibe: stub.vibe,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return {
    bucket,
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
    cities: results,
  };
}

// Main
async function main() {
  console.log("Building scoreboard buckets...\n");

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Load data
  const cities = await loadCities();
  const manifest = await loadManifest();

  console.log(`Loaded ${cities.length} cities\n`);

  // Build each bucket
  const buckets = ["this-week", "may", "summer"];

  for (const bucket of buckets) {
    const data = await buildBucket(bucket, cities, manifest);

    const outputPath = path.join(OUTPUT_DIR, `${bucket}.json`);
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));

    console.log(`  → Wrote ${outputPath} (${data.cities.length} cities)\n`);
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error("Error building scoreboard buckets:", err);
  process.exit(1);
});
