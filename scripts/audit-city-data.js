#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

const issues = {
  critical: [],
  warning: [],
  info: []
};

const stats = {
  totalCities: 0,
  withOverview: 0,
  withAttractions: 0,
  withRestaurants: 0,
  withCoordinates: 0,
  withConnections: 0,
  schemaV2: 0
};

let totalAttractions = 0;
let totalRestaurants = 0;

function addIssue(level, city, message) {
  issues[level].push({ city, message });
}

function countRestaurants(culinaryGuide) {
  if (!culinaryGuide || !culinaryGuide.restaurants) return 0;
  const r = culinaryGuide.restaurants;

  // If it's an array, return length
  if (Array.isArray(r)) return r.length;

  // If it's an object with categories, count all
  if (typeof r === 'object') {
    let count = 0;
    for (const category of Object.values(r)) {
      if (Array.isArray(category)) {
        count += category.length;
      }
    }
    return count;
  }
  return 0;
}

function validateCity(filePath) {
  const relativePath = path.relative(DATA_DIR, filePath);
  const cityLabel = relativePath.replace('/index.json', '');

  let data;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(content);
  } catch (e) {
    addIssue('critical', cityLabel, `Invalid JSON: ${e.message}`);
    return;
  }

  stats.totalCities++;

  // Check required top-level fields
  if (!data.city) addIssue('critical', cityLabel, 'Missing "city" field');
  if (!data.country) addIssue('critical', cityLabel, 'Missing "country" field');

  // Overview can be null or missing
  const hasOverview = data.overview && typeof data.overview === 'object';
  if (!hasOverview) {
    addIssue('critical', cityLabel, 'Missing or null "overview" field');
  } else {
    stats.withOverview++;
  }

  // Check schema version
  if (data._meta && data._meta.schemaVersion === 2) {
    stats.schemaV2++;
  }

  // Validate overview if present
  if (hasOverview) {
    const ov = data.overview;
    if (!ov.city_name) addIssue('warning', cityLabel, 'Missing overview.city_name');
    if (!ov.brief_description) addIssue('warning', cityLabel, 'Missing overview.brief_description');

    // Check for placeholder text
    if (ov.brief_description && (ov.brief_description.includes('TODO') || ov.brief_description.includes('[PLACEHOLDER]'))) {
      addIssue('critical', cityLabel, 'Placeholder text in brief_description');
    }

    // Check sections
    if (!ov.sections || ov.sections.length === 0) {
      addIssue('info', cityLabel, 'Missing or empty overview.sections');
    }
  }

  // Validate coordinates
  if (data.coordinates && data.coordinates.lat !== undefined) {
    stats.withCoordinates++;
    const { lat, lng } = data.coordinates;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      addIssue('critical', cityLabel, 'Invalid coordinates - not numbers');
    } else {
      // Check for reasonable European bounds
      if (lat < 34 || lat > 72) {
        addIssue('warning', cityLabel, `Latitude ${lat.toFixed(2)} outside Europe (${lat.toFixed(4)})`);
      }
      if (lng < -25 || lng > 45) {
        addIssue('warning', cityLabel, `Longitude ${lng.toFixed(2)} outside Europe (${lng.toFixed(4)})`);
      }
    }
  } else {
    addIssue('warning', cityLabel, 'Missing coordinates');
  }

  // Validate attractions
  if (data.attractions && data.attractions.sites && Array.isArray(data.attractions.sites)) {
    const sites = data.attractions.sites;
    stats.withAttractions++;
    totalAttractions += sites.length;

    if (sites.length === 0) {
      addIssue('warning', cityLabel, 'attractions.sites is empty');
    } else if (sites.length < 5) {
      addIssue('info', cityLabel, `Only ${sites.length} attractions`);
    }

    // Check for attractions with missing names
    const missingNames = sites.filter(s => !s.name).length;
    if (missingNames > 0) {
      addIssue('warning', cityLabel, `${missingNames} attractions missing name`);
    }
  } else {
    addIssue('warning', cityLabel, 'Missing or invalid attractions.sites');
  }

  // Validate culinaryGuide
  if (data.culinaryGuide) {
    const restaurantCount = countRestaurants(data.culinaryGuide);
    if (restaurantCount > 0) {
      stats.withRestaurants++;
      totalRestaurants += restaurantCount;
    } else {
      addIssue('info', cityLabel, 'No restaurants in culinaryGuide');
    }
  } else {
    addIssue('info', cityLabel, 'Missing culinaryGuide');
  }

  // Validate connections (transport)
  if (data.connections) {
    stats.withConnections++;
    const conn = data.connections;

    if (!conn.airports || conn.airports.length === 0) {
      addIssue('info', cityLabel, 'No airports listed');
    }
  } else {
    addIssue('info', cityLabel, 'Missing connections data');
  }

  // Name consistency checks
  if (data.city && hasOverview && data.overview.city_name) {
    const slug = data.city.toLowerCase().replace(/-/g, ' ');
    const name = data.overview.city_name.toLowerCase().replace(/-/g, ' ');
    if (slug !== name && !name.includes(slug) && !slug.includes(name)) {
      addIssue('info', cityLabel, `Slug "${data.city}" doesn't match name "${data.overview.city_name}"`);
    }
  }

  // Country consistency
  const folderCountry = cityLabel.split('/')[0].replace(/-/g, ' ').toLowerCase();
  if (data.country) {
    const dataCountry = data.country.replace(/-/g, ' ').toLowerCase();
    if (!dataCountry.includes(folderCountry) && !folderCountry.includes(dataCountry)) {
      addIssue('warning', cityLabel, `Folder "${folderCountry}" vs data.country "${data.country}"`);
    }
  }
}

function findCityFiles(dir) {
  const files = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'monthly') {
          scan(fullPath);
        }
      } else if (entry.name === 'index.json' && !currentDir.includes('/monthly')) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

// Run audit
console.log('City Data Audit Report');
console.log('='.repeat(65));
console.log();

const cityFiles = findCityFiles(DATA_DIR);

for (const file of cityFiles) {
  validateCity(file);
}

// Group issues
function groupIssues(issueList) {
  const grouped = {};
  for (const issue of issueList) {
    const key = issue.message.replace(/\d+(\.\d+)?/g, 'N').replace(/"[^"]+"/g, '"..."');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(issue.city);
  }
  return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
}

// Print results
if (issues.critical.length > 0) {
  console.log(`CRITICAL ISSUES (${issues.critical.length})`);
  console.log('-'.repeat(65));
  const grouped = groupIssues(issues.critical);
  for (const [msg, cities] of grouped) {
    if (cities.length > 10) {
      console.log(`  ${msg}`);
      console.log(`    -> ${cities.length} cities affected`);
    } else if (cities.length > 3) {
      console.log(`  ${msg}: ${cities.length} cities`);
      console.log(`    (${cities.slice(0, 3).join(', ')}, ...)`);
    } else {
      console.log(`  ${msg}: ${cities.join(', ')}`);
    }
  }
  console.log();
}

if (issues.warning.length > 0) {
  console.log(`WARNINGS (${issues.warning.length})`);
  console.log('-'.repeat(65));
  const grouped = groupIssues(issues.warning);
  for (const [msg, cities] of grouped) {
    if (cities.length > 5) {
      console.log(`  ${msg}: ${cities.length} cities`);
    } else {
      console.log(`  ${msg}: ${cities.join(', ')}`);
    }
  }
  console.log();
}

if (issues.info.length > 0) {
  console.log(`INFO (${issues.info.length})`);
  console.log('-'.repeat(65));
  const grouped = groupIssues(issues.info);
  for (const [msg, cities] of grouped.slice(0, 10)) {
    if (cities.length > 5) {
      console.log(`  ${msg}: ${cities.length} cities`);
    } else {
      console.log(`  ${msg}: ${cities.join(', ')}`);
    }
  }
  if (grouped.length > 10) {
    console.log(`  ... and ${grouped.length - 10} more info categories`);
  }
  console.log();
}

// Data coverage stats
console.log('DATA COVERAGE');
console.log('-'.repeat(65));
const pct = (n) => ((n / stats.totalCities) * 100).toFixed(0);
console.log(`  Total cities:          ${stats.totalCities}`);
console.log(`  With overview:         ${stats.withOverview} (${pct(stats.withOverview)}%)`);
console.log(`  With coordinates:      ${stats.withCoordinates} (${pct(stats.withCoordinates)}%)`);
console.log(`  With attractions:      ${stats.withAttractions} (${pct(stats.withAttractions)}%)`);
console.log(`  With restaurants:      ${stats.withRestaurants} (${pct(stats.withRestaurants)}%)`);
console.log(`  With connections:      ${stats.withConnections} (${pct(stats.withConnections)}%)`);
console.log(`  Schema V2:             ${stats.schemaV2} (${pct(stats.schemaV2)}%)`);
console.log();
console.log(`  Total attractions:     ${totalAttractions}`);
console.log(`  Total restaurants:     ${totalRestaurants}`);
console.log(`  Avg attractions/city:  ${stats.withAttractions > 0 ? (totalAttractions / stats.withAttractions).toFixed(1) : 0}`);
console.log(`  Avg restaurants/city:  ${stats.withRestaurants > 0 ? (totalRestaurants / stats.withRestaurants).toFixed(1) : 0}`);
console.log();

// Summary
console.log('SUMMARY');
console.log('-'.repeat(65));
console.log(`  Critical: ${issues.critical.length}`);
console.log(`  Warnings: ${issues.warning.length}`);
console.log(`  Info:     ${issues.info.length}`);
console.log('='.repeat(65));

if (issues.critical.length > 0) {
  console.log('\nAudit FAILED - critical issues found');
  process.exit(1);
} else {
  console.log('\nAudit PASSED');
}
