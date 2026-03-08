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

const ROOT = process.cwd();
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
      // Score all cities for this month (without LLM - too slow for build time)
      const results = await engine.scoreCitiesForAPI({
        cityIds,
        startDate,
        endDate,
        originCity: null,
        getCityData: (cityId) => loadCityData(manifest, cityId),
        limit: 50, // Top 50 cities per month
        includeDebug: false,
        flatList: false,
        useLLM: false, // Skip LLM at build time
      });

      // Extract tier labels and top cities
      const tiers = {};
      let totalCities = 0;

      for (const [tierKey, tierData] of Object.entries(results)) {
        if (tierKey === '_meta') continue;

        tiers[tierKey] = {
          label: tierData.label,
          sublabel: tierData.sublabel,
          // Include simplified city data (no debug info)
          cities: tierData.cities.map(city => ({
            id: city.id,
            cityId: city.cityId,
            title: city.title,
            country: city.country,
            tier: city.tier,
            weather: city.weather,
            crowdLevel: city.crowdLevel,
            why: city.why,
            whyExpanded: city.whyExpanded,
            tags: city.tags,
            image: city.image,
          })),
        };
        totalCities += tierData.cities.length;
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
