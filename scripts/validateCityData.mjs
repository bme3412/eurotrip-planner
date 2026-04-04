#!/usr/bin/env node
/**
 * City Data Validation & Normalization Script
 *
 * Validates all city data against the schema, reports quality scores,
 * and optionally normalizes inconsistencies.
 *
 * Usage:
 *   node scripts/validateCityData.mjs                  # Full validation report
 *   node scripts/validateCityData.mjs --city paris     # Validate one city
 *   node scripts/validateCityData.mjs --normalize      # Fix normalizable issues
 *   node scripts/validateCityData.mjs --json           # Output as JSON
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

const args = process.argv.slice(2);
const getFlag = (name) => args.includes(`--${name}`);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};

const NORMALIZE = getFlag('normalize');
const JSON_OUTPUT = getFlag('json');
const TARGET_CITY = getArg('city');

function readJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; }
}

function writeJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Price normalization map ──
const PRICE_MAP = {
  'free': 'Free', 'Free': 'Free', 'FREE': 'Free',
  'budget': 'Budget', 'Budget': 'Budget', 'cheap': 'Budget', 'inexpensive': 'Budget', '€': 'Budget',
  'moderate': 'Moderate', 'Moderate': 'Moderate', 'mid-range': 'Moderate', 'mid range': 'Moderate', '€€': 'Moderate',
  'premium': 'Premium', 'Premium': 'Premium', 'expensive': 'Premium', 'high': 'Premium', '€€€': 'Premium',
  'luxury': 'Luxury', 'Luxury': 'Luxury', '€€€€': 'Luxury',
};

function normalizePrice(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  // Direct match
  if (PRICE_MAP[raw]) return PRICE_MAP[raw];
  if (PRICE_MAP[lower]) return PRICE_MAP[lower];
  // Partial match
  if (lower.includes('free')) return 'Free';
  if (lower.includes('budget') || lower.includes('cheap')) return 'Budget';
  if (lower.includes('moderate') || lower.includes('mid')) return 'Moderate';
  if (lower.includes('premium') || lower.includes('expensive') || lower.includes('high')) return 'Premium';
  if (lower.includes('luxury')) return 'Luxury';
  // Euro ranges
  if (/€{3,}/.test(raw)) return 'Premium';
  if (/€€/.test(raw)) return 'Moderate';
  if (/€/.test(raw)) return 'Budget';
  return raw; // Keep original if can't normalize
}

// ── Europe bounding box ──
const EUROPE_BOUNDS = { minLat: 34, maxLat: 72, minLon: -25, maxLon: 45 };

function isInEurope(lat, lon) {
  return lat >= EUROPE_BOUNDS.minLat && lat <= EUROPE_BOUNDS.maxLat &&
         lon >= EUROPE_BOUNDS.minLon && lon <= EUROPE_BOUNDS.maxLon;
}

// ── Validate a single city ──
function validateCity(slug, entry) {
  const cityDir = path.join(DATA_DIR, entry.country, entry.directoryName);
  const idx = readJson(path.join(cityDir, 'index.json'));
  if (!idx) return { slug, grade: 'F', score: 0, issues: ['No index.json found'], sections: {} };

  const issues = [];
  const warnings = [];
  const sections = {};
  let totalPoints = 0;
  let maxPoints = 0;

  // ── Overview (15 points) ──
  maxPoints += 15;
  const ov = idx.overview;
  if (ov?.city_name && ov?.brief_description) {
    totalPoints += 5;
    if (ov.coordinates?.latitude && ov.coordinates?.longitude) {
      if (isInEurope(ov.coordinates.latitude, ov.coordinates.longitude)) {
        totalPoints += 5;
      } else {
        issues.push(`Overview coordinates out of Europe bounds: ${ov.coordinates.latitude}, ${ov.coordinates.longitude}`);
        totalPoints += 2;
      }
    } else {
      warnings.push('Overview missing coordinates');
    }
    if (ov.brief_description.length >= 50) totalPoints += 3;
    else warnings.push(`Brief description too short (${ov.brief_description.length} chars)`);
    if (ov.practical_info) totalPoints += 2;
    sections.overview = true;
  } else {
    sections.overview = false;
    issues.push('Missing overview');
  }

  // ── Attractions (25 points) ──
  maxPoints += 25;
  const sites = idx.attractions?.sites || [];
  if (sites.length > 0) {
    totalPoints += Math.min(10, sites.length); // Up to 10 points for count
    sections.attractions = true;

    let withCoords = 0, withDesc = 0, withHours = 0, withTransit = 0;
    const priceIssues = [];

    for (const site of sites) {
      if (site.latitude && site.longitude) {
        withCoords++;
        if (!isInEurope(site.latitude, site.longitude)) {
          issues.push(`Attraction "${site.name}" coordinates out of Europe: ${site.latitude}, ${site.longitude}`);
        }
      }
      if (site.description?.length >= 50) withDesc++;
      if (site.opening_hours) withHours++;
      if (site.transit) withTransit++;
      if (site.price_range) {
        const normalized = normalizePrice(site.price_range);
        if (normalized !== site.price_range && NORMALIZE) {
          site.price_range = normalized;
        }
        if (!['Free', 'Budget', 'Moderate', 'Premium', 'Luxury'].includes(normalizePrice(site.price_range))) {
          priceIssues.push(`"${site.name}": "${site.price_range}"`);
        }
      }
    }

    const coordPct = sites.length > 0 ? withCoords / sites.length : 0;
    totalPoints += Math.round(coordPct * 5); // Up to 5 points for coordinate coverage
    totalPoints += Math.round((withDesc / Math.max(1, sites.length)) * 5); // Up to 5 for descriptions
    totalPoints += Math.min(3, Math.round((withHours / Math.max(1, sites.length)) * 3)); // Up to 3 for hours
    totalPoints += Math.min(2, Math.round((withTransit / Math.max(1, sites.length)) * 2)); // Up to 2 for transit

    if (withCoords < sites.length) warnings.push(`${sites.length - withCoords}/${sites.length} attractions missing coordinates`);
    if (priceIssues.length > 0) warnings.push(`Non-standard price ranges: ${priceIssues.slice(0, 3).join('; ')}`);
  } else {
    sections.attractions = false;
    issues.push('No attractions data');
  }

  // ── Neighborhoods (15 points) ──
  maxPoints += 15;
  const hoods = idx.neighborhoods?.neighborhoods || [];
  if (hoods.length > 0) {
    totalPoints += Math.min(5, hoods.length);
    totalPoints += hoods.filter(h => h.character?.length > 20).length > 0 ? 5 : 0;
    totalPoints += hoods.filter(h => h.practical_info).length > 0 ? 3 : 0;
    totalPoints += hoods.filter(h => h.highlights?.attractions?.length > 0).length > 0 ? 2 : 0;
    sections.neighborhoods = true;
  } else {
    sections.neighborhoods = false;
    issues.push('No neighborhoods data');
  }

  // ── Culinary (15 points) ──
  maxPoints += 15;
  const cul = idx.culinaryGuide;
  if (cul?.restaurants || cul?.food_experiences) {
    totalPoints += 5;
    const restCount = (cul.restaurants?.fine_dining?.length || 0) + (cul.restaurants?.casual_dining?.length || 0) + (cul.restaurants?.street_food?.length || 0);
    totalPoints += Math.min(5, restCount);
    if (cul.bars_and_cafes) totalPoints += 3;
    if (cul.food_experiences?.length > 0) totalPoints += 2;
    sections.culinary = true;
  } else {
    sections.culinary = false;
    issues.push('No culinary data');
  }

  // ── Visit Calendar (15 points) ──
  maxPoints += 15;
  const cal = idx.visitCalendar?.months;
  if (cal && Object.keys(cal).length > 0) {
    const monthCount = Object.keys(cal).length;
    totalPoints += Math.min(6, Math.round(monthCount / 2));
    let hasScores = 0, hasCrowds = 0, hasTypes = 0;
    for (const month of Object.values(cal)) {
      for (const range of (month.ranges || [])) {
        if (range.score) hasScores++;
        if (range.crowdLevel) hasCrowds++;
        if (range.travelerTypes) hasTypes++;
      }
    }
    totalPoints += hasScores > 0 ? 3 : 0;
    totalPoints += hasCrowds > 0 ? 3 : 0;
    totalPoints += hasTypes > 0 ? 3 : 0;
    sections.calendar = true;
  } else {
    sections.calendar = false;
    issues.push('No visit calendar');
  }

  // ── Seasonal Activities (8 points) ──
  maxPoints += 8;
  const seasonal = idx.seasonalActivities;
  if (seasonal?.Spring || seasonal?.Summer || seasonal?.Autumn || seasonal?.Winter) {
    const seasonCount = ['Spring', 'Summer', 'Autumn', 'Winter'].filter(s => seasonal[s]?.length > 0).length;
    totalPoints += seasonCount * 2;
    sections.seasonal = true;
  } else {
    sections.seasonal = false;
    issues.push('No seasonal activities');
  }

  // ── Connections (7 points) ──
  maxPoints += 7;
  const conn = idx.connections?.destinations;
  if (conn?.length > 0) {
    totalPoints += Math.min(4, conn.length);
    totalPoints += conn.some(d => d.transport_types?.length > 1) ? 3 : 0;
    sections.connections = true;
  } else {
    sections.connections = false;
    issues.push('No connections data');
  }

  // ── Write normalized data ──
  if (NORMALIZE && sites.length > 0) {
    const indexPath = path.join(cityDir, 'index.json');
    writeJson(indexPath, idx);
  }

  // ── Score & grade ──
  const score = Math.round((totalPoints / maxPoints) * 100);
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return { slug, grade, score, totalPoints, maxPoints, issues, warnings, sections };
}

// ── Main ──
function main() {
  const manifest = readJson(MANIFEST_PATH);
  if (!manifest?.cities) {
    console.error('Cannot read manifest.json');
    process.exit(1);
  }

  let targets;
  if (TARGET_CITY) {
    const entry = manifest.cities[TARGET_CITY];
    if (!entry) { console.error(`City "${TARGET_CITY}" not found`); process.exit(1); }
    targets = [[TARGET_CITY, entry]];
  } else {
    targets = Object.entries(manifest.cities);
  }

  const results = targets.map(([slug, entry]) => validateCity(slug, entry));

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // ── Summary report ──
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const r of results) grades[r.grade]++;

  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const sectionCounts = {};
  for (const r of results) {
    for (const [section, present] of Object.entries(r.sections)) {
      if (!sectionCounts[section]) sectionCounts[section] = 0;
      if (present) sectionCounts[section]++;
    }
  }

  console.log('=== CITY DATA QUALITY REPORT ===\n');
  console.log(`Cities analyzed: ${results.length}`);
  console.log(`Average quality score: ${avgScore}/100`);
  console.log(`\nGrade distribution:`);
  console.log(`  A (90-100): ${grades.A} cities`);
  console.log(`  B (80-89):  ${grades.B} cities`);
  console.log(`  C (65-79):  ${grades.C} cities`);
  console.log(`  D (40-64):  ${grades.D} cities`);
  console.log(`  F (0-39):   ${grades.F} cities`);
  console.log(`\nSection coverage:`);
  for (const [section, count] of Object.entries(sectionCounts)) {
    console.log(`  ${section}: ${count}/${results.length} (${Math.round(count / results.length * 100)}%)`);
  }

  // ── Top issues ──
  const allIssues = results.flatMap(r => r.issues.map(i => `${r.slug}: ${i}`));
  if (allIssues.length > 0) {
    console.log(`\nTop issues (${Math.min(20, allIssues.length)}/${allIssues.length}):`);
    for (const issue of allIssues.slice(0, 20)) {
      console.log(`  - ${issue}`);
    }
  }

  // ── Lowest scoring cities ──
  const worst = results.sort((a, b) => a.score - b.score).slice(0, 10);
  console.log(`\nLowest scoring cities:`);
  for (const r of worst) {
    console.log(`  ${r.slug}: ${r.grade} (${r.score}/100) — ${r.issues.slice(0, 2).join('; ')}`);
  }

  // ── Highest scoring cities ──
  const best = results.sort((a, b) => b.score - a.score).slice(0, 10);
  console.log(`\nHighest scoring cities:`);
  for (const r of best) {
    console.log(`  ${r.slug}: ${r.grade} (${r.score}/100)`);
  }

  if (NORMALIZE) {
    console.log(`\n✅ Normalization applied (price ranges standardized)`);
  }
}

main();
