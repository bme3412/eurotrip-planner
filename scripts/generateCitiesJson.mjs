#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'public', 'data', 'manifest.json');
const outPath = path.join(rootDir, 'public', 'data', 'cities.json');

async function main() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const cities = manifest?.cities || {};

  // Minimal structure: country -> [city slugs]
  const grouped = {};
  for (const [slug, meta] of Object.entries(cities)) {
    const country = meta?.country || 'Unknown';
    if (!grouped[country]) grouped[country] = [];
    grouped[country].push(slug);
  }

  // Sort slugs per country and countries themselves
  const sortedGrouped = {};
  for (const country of Object.keys(grouped).sort((a, b) => a.localeCompare(b))) {
    sortedGrouped[country] = grouped[country].sort((a, b) => a.localeCompare(b));
  }

  const output = JSON.stringify(sortedGrouped, null, 2);
  await fs.writeFile(outPath, output + '\n', 'utf8');
  console.log(`Wrote minimal cities.json → ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to generate cities.json:', err);
  process.exit(1);
});

