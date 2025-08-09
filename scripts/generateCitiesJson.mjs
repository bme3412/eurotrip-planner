#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'public', 'data', 'manifest.json');
const outPath = path.join(rootDir, 'public', 'data', 'cities.json');

function toTitleCase(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortObjectByKeys(obj) {
  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

async function main() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const cities = manifest?.cities || {};

  const grouped = {};
  for (const [slug, meta] of Object.entries(cities)) {
    const country = meta?.country || 'Unknown';
    if (!grouped[country]) grouped[country] = {};

    grouped[country][slug] = {
      id: slug,
      name: toTitleCase(slug),
      directoryName: meta?.directoryName || null,
      monthlyFiles: Array.isArray(meta?.monthlyFiles) ? meta.monthlyFiles : [],
      additionalFiles: Array.isArray(meta?.additionalFiles) ? meta.additionalFiles : [],
    };
  }

  // Sort countries and city slugs for readability
  const sortedGrouped = {};
  for (const country of Object.keys(grouped).sort((a, b) => a.localeCompare(b))) {
    sortedGrouped[country] = sortObjectByKeys(grouped[country]);
  }

  const output = JSON.stringify(sortedGrouped, null, 2);
  await fs.writeFile(outPath, output + '\n', 'utf8');
  console.log(`Wrote cities.json grouped by country → ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to generate cities.json:', err);
  process.exit(1);
});


