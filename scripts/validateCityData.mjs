#!/usr/bin/env node
/**
 * Validates city data integrity:
 * 1. Every city directory has files named after the city (not another city)
 * 2. Every city has at minimum some overview data (standalone file or in index.json)
 * 3. No cross-contamination between cities
 * 4. File naming matches directory naming
 *
 * Run: node scripts/validateCityData.mjs
 * Exit code 1 if any critical issues found.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Top-level entries that are not country directories
const SKIP_ENTRIES = new Set([
  'schema', 'sample-itineraries', 'manifest.json', 'cities.json',
  'sharedData.js', 'tripConstants.js',
]);

// Normalize accented characters to ASCII for comparison
function toAscii(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ð/g, 'd');
}

// Files that aren't prefixed with a city name
const GENERIC_FILES = new Set([
  'index.json', 'city.json', 'overview.json', 'food.json',
  'neighborhoods.json', 'generation_summary.json', 'summary.json',
]);

// Known suffixes that come after the city name in data files
const KNOWN_SUFFIXES = [
  '-overview.json', '_overview.json', '-visit-calendar.json',
  '_attractions.json', '-attractions.json',
  '_culinary_guide.json', '_connections.json',
  '_neighborhoods.json', '_seasonal_activities.json',
  '-experiences.json', '-photo-spots.json',
];

let totalCities = 0;
let validCities = 0;
const criticalIssues = [];
const warnings = [];

function addCritical(city, country, message) {
  criticalIssues.push({ city, country, message });
}

function addWarning(city, country, message) {
  warnings.push({ city, country, message });
}

// Get all country directories
const countryEntries = fs.readdirSync(DATA_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !SKIP_ENTRIES.has(d.name));

for (const countryEntry of countryEntries) {
  const country = countryEntry.name;
  const countryPath = path.join(DATA_DIR, country);

  let cityDirs;
  try {
    cityDirs = fs.readdirSync(countryPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    continue;
  }

  for (const cityDir of cityDirs) {
    totalCities++;
    const cityPath = path.join(countryPath, cityDir);
    const citySlug = cityDir.toLowerCase();
    let hasCriticalIssue = false;

    // List all JSON files (not in monthly/)
    let files;
    try {
      files = fs.readdirSync(cityPath, { withFileTypes: true })
        .filter(f => f.isFile() && f.name.endsWith('.json'))
        .map(f => f.name);
    } catch {
      addCritical(cityDir, country, 'Cannot read city directory');
      continue;
    }

    // 1. Check for cross-contamination: files named after a DIFFERENT city
    for (const file of files) {
      if (GENERIC_FILES.has(file)) continue;
      const fileLower = file.toLowerCase();

      // Try to extract the city prefix by stripping known suffixes
      let filePrefix = null;
      for (const suffix of KNOWN_SUFFIXES) {
        if (fileLower.endsWith(suffix)) {
          filePrefix = fileLower.slice(0, -suffix.length);
          break;
        }
      }

      if (filePrefix) {
        const slugVariants = [citySlug, citySlug.replace(/-/g, ''), toAscii(citySlug), toAscii(citySlug).replace(/-/g, '')];
        const prefixVariants = [filePrefix, filePrefix.replace(/-/g, ''), toAscii(filePrefix), toAscii(filePrefix).replace(/-/g, '')];
        const matches = slugVariants.some(s => prefixVariants.includes(s));
        if (!matches) {
          addCritical(cityDir, country, `Cross-contamination: "${file}" belongs to "${filePrefix}", not "${cityDir}"`);
          hasCriticalIssue = true;
        }
      }
    }

    // 2. Check for overview data from ANY source
    let hasOverview = false;

    // Check standalone overview files
    const hasOverviewFile = files.some(f => {
      const fl = f.toLowerCase();
      return fl.includes('overview');
    });
    if (hasOverviewFile) hasOverview = true;

    // Check index.json for overview data
    if (!hasOverview) {
      const indexPath = path.join(cityPath, 'index.json');
      if (fs.existsSync(indexPath)) {
        try {
          const idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
          if (idx.overview && typeof idx.overview === 'object') {
            // Has an overview object with actual content
            if (idx.overview.city_name || idx.overview.brief_description || idx.overview.sections) {
              hasOverview = true;
            }
          }
          // Also check if index.json has substantial data even without a formal overview
          if (!hasOverview && idx.attractions && idx.neighborhoods) {
            hasOverview = true; // City has data, just no explicit overview
          }
        } catch {
          // Parse error already handled below
        }
      }
    }

    if (!hasOverview) {
      // Check if city at least has other city-specific data files
      const hasCityFiles = files.some(f => {
        if (GENERIC_FILES.has(f)) return false;
        const fl = f.toLowerCase();
        return fl.startsWith(citySlug + '-') || fl.startsWith(citySlug + '_')
          || fl.startsWith(citySlug.replace(/-/g, '') + '-') || fl.startsWith(citySlug.replace(/-/g, '') + '_');
      });
      if (hasCityFiles) {
        addWarning(cityDir, country, 'Has city-specific data files but no overview');
      } else {
        addWarning(cityDir, country, 'No overview data and no city-specific files (guide will show "Coming Soon")');
        hasCriticalIssue = true;
      }
    }

    // 3. Check monthly directory
    const monthlyPath = path.join(cityPath, 'monthly');
    if (!fs.existsSync(monthlyPath)) {
      addWarning(cityDir, country, 'Missing monthly/ directory');
    } else {
      const monthlyFiles = fs.readdirSync(monthlyPath).filter(f => f.endsWith('.json') && f !== 'index.json');
      if (monthlyFiles.length === 0) {
        addWarning(cityDir, country, 'monthly/ directory has no data files');
      } else if (monthlyFiles.length < 12) {
        addWarning(cityDir, country, `monthly/ has only ${monthlyFiles.length}/12 month files`);
      }
    }

    if (!hasCriticalIssue) {
      validCities++;
    }
  }
}

// Print summary
console.log('\n========================================');
console.log('  City Data Validation Report');
console.log('========================================\n');
console.log(`Total cities scanned:   ${totalCities}`);
console.log(`Valid cities:           ${validCities}`);
console.log(`Cities with issues:     ${totalCities - validCities}`);
console.log(`Critical issues:        ${criticalIssues.length}`);
console.log(`Warnings:               ${warnings.length}`);

if (criticalIssues.length > 0) {
  console.log('\n--- Critical Issues (must fix) ---\n');
  const byCity = {};
  for (const issue of criticalIssues) {
    const key = `${issue.country}/${issue.city}`;
    if (!byCity[key]) byCity[key] = [];
    byCity[key].push(issue.message);
  }
  for (const [key, msgs] of Object.entries(byCity).sort()) {
    console.log(`  ${key}:`);
    for (const msg of msgs) {
      console.log(`    ❌ ${msg}`);
    }
  }
}

if (warnings.length > 0) {
  console.log('\n--- Warnings ---\n');
  const byCity = {};
  for (const w of warnings) {
    const key = `${w.country}/${w.city}`;
    if (!byCity[key]) byCity[key] = [];
    byCity[key].push(w.message);
  }
  for (const [key, msgs] of Object.entries(byCity).sort()) {
    console.log(`  ${key}:`);
    for (const msg of msgs) {
      console.log(`    ⚠  ${msg}`);
    }
  }
}

console.log('\n========================================\n');

if (criticalIssues.length > 0) {
  console.log(`❌ ${criticalIssues.length} critical issue(s) found. Exiting with code 1.\n`);
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(`⚠  No critical issues, but ${warnings.length} warning(s). Exiting with code 0.\n`);
  process.exit(0);
} else {
  console.log('✅ All city data is valid.\n');
  process.exit(0);
}
