#!/usr/bin/env node
/**
 * Pre-computes city scores for each month of the year.
 *
 * This runs at build time to generate cached scoring data,
 * eliminating the need to score 220 cities on every API request.
 *
 * Output: src/generated/monthlyScores.json
 *
 * Run: node scripts/generateMonthlyScores.mjs
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local so LLM prose (ANTHROPIC_API_KEY) works on local regens.
// No-ops in CI / when the file is absent; generateDescriptions falls back to
// the template whyExpanded without a key.
dotenv.config({ path: '.env.local' });

const ROOT = process.cwd();

// Score-driven tier labels (membership comes from the engine's config
// thresholds 73/64/55, not bucket caps — so the bands actually discriminate).
const TIER_META = {
  1: { label: 'Top picks', sublabel: 'Best matches for these dates' },
  2: { label: 'Great options', sublabel: 'Strong choices for these dates' },
  3: { label: 'Good options', sublabel: 'Solid if the top picks are booked' },
  4: { label: 'Worth considering', sublabel: 'A lower match for these dates' },
};
const DATA_DIR = path.join(ROOT, 'public', 'data');
const OUT_DIR = path.join(ROOT, 'src', 'generated');

// Month names for iteration
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

/**
 * Load the manifest to get all city IDs.
 */
function loadManifest() {
  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

/**
 * Load full city data from index.json.
 */
function loadCityData(manifest, cityId) {
  const cityInfo = manifest.cities?.[cityId];
  if (!cityInfo) return null;

  const cityPath = path.join(
    DATA_DIR,
    cityInfo.country,
    cityInfo.directoryName,
    'index.json'
  );

  try {
    const data = JSON.parse(fs.readFileSync(cityPath, 'utf-8'));
    return {
      ...data,
      cityId,
      city: cityId,
    };
  } catch (error) {
    console.warn(`  [WARN] Failed to load ${cityId}: ${error.message}`);
    return null;
  }
}

/**
 * Get a representative date range for a month.
 * Uses the 1st through 14th (2-week trip).
 */
function getMonthDateRange(monthIndex, year) {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex, 14);
  return { startDate, endDate };
}

/**
 * Format city name from slug.
 */
function formatCityName(cityId) {
  return cityId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Main function to generate monthly scores.
 */
async function generateMonthlyScores() {
  console.log('\n🗓️  Generating monthly scores...\n');

  // Dynamically import the V4 scoring engine
  const { ScoreEngine } = await import('../src/lib/scoring/v4/core/ScoreEngine.js');
  const { getFactorClasses } = await import('../src/lib/scoring/v4/factors/index.js');

  // Create engine instance
  const engine = new ScoreEngine(null, getFactorClasses());

  // Load manifest
  const manifest = loadManifest();
  const cityIds = Object.keys(manifest.cities || {});
  console.log(`   Found ${cityIds.length} cities to score\n`);

  // Determine the year to use (current year, or next year if we're past October)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const baseYear = currentMonth >= 10 ? currentYear + 1 : currentYear;

  const monthlyScores = {};

  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthName = MONTHS[monthIndex];

    // Use next year for months that have already passed
    const year = monthIndex < currentMonth ? baseYear + 1 : baseYear;
    const { startDate, endDate } = getMonthDateRange(monthIndex, year);

    console.log(`   📅 ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}...`);

    try {
      // Score the FULL corpus (not a top-50 slice) so the precomputed file can
      // discriminate honestly: tier membership is score-driven (config
      // thresholds 73/64/55 via formatForAPI), not bucket caps. LLM prose is
      // bounded to the top `describeLimit` cities to keep build cost flat (~one
      // batched call per month); the rest keep the template whyExpanded.
      const flat = await engine.scoreCitiesForAPI({
        cityIds,
        startDate,
        endDate,
        originCity: null,
        getCityData: (cityId) => loadCityData(manifest, cityId),
        limit: cityIds.length, // persist every scored city
        describeLimit: 40,     // ...but only LLM-write prose for the top 40
        includeDebug: false,
        flatList: true,        // score-sorted flat list with config-thresholded tiers
        useLLM: true,
      });

      // Bucket the flat, score-sorted list into tiers by each city's
      // threshold-derived `tier`. Same file shape as before (tiers.tier1..4),
      // so the /results page and the Explore map consume it unchanged — but now
      // with the full corpus and tiers that actually mean something.
      const tiers = {};
      let totalCities = 0;

      for (const city of flat) {
        const t = Number(city.tier) || 4;
        const tierKey = `tier${t}`;
        if (!tiers[tierKey]) {
          tiers[tierKey] = { label: TIER_META[t].label, sublabel: TIER_META[t].sublabel, cities: [] };
        }
        tiers[tierKey].cities.push({
          id: city.id,
          cityId: city.cityId,
          title: city.title,
          country: city.country,
          region: city.region,           // Region filter
          coordinates: city.coordinates, // real per-city daylight
          tier: city.tier,
          score: city.score,             // client-side "Best match" sort
          confidence: city.confidence,   // gates thin-data cities to "Limited data"
          weather: city.weather,
          crowdLevel: city.crowdLevel,
          highlights: city.highlights,   // event chip on the row
          why: city.why,
          whyExpanded: city.whyExpanded,
          tags: city.tags,
          image: city.image,
        });
        totalCities += 1;
      }

      monthlyScores[monthName] = {
        generatedAt: new Date().toISOString(),
        year,
        month: monthIndex + 1,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        totalCities,
        tiers,
      };

      console.log(`      ✓ ${totalCities} cities scored`);
    } catch (error) {
      console.error(`      ✗ Error scoring ${monthName}: ${error.message}`);
      monthlyScores[monthName] = {
        generatedAt: new Date().toISOString(),
        error: error.message,
        tiers: {},
      };
    }
  }

  // Ensure output directory exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Write the output file
  const outputPath = path.join(OUT_DIR, 'monthlyScores.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(monthlyScores, null, 2),
    'utf-8'
  );

  const fileSize = fs.statSync(outputPath).size;
  console.log(`\n✅ Generated monthly scores → src/generated/monthlyScores.json`);
  console.log(`   File size: ${(fileSize / 1024).toFixed(1)} KB`);
  console.log(`   Months: ${Object.keys(monthlyScores).length}\n`);
}

// Run
generateMonthlyScores().catch(error => {
  console.error('Failed to generate monthly scores:', error);
  process.exit(1);
});
