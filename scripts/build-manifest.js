#!/usr/bin/env node
/**
 * Build a lightweight manifest of city data files for prefetching/caching.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = path.join(ROOT, 'public', 'data');
const OUTPUT = path.join(DATA_ROOT, 'manifest.json');

const HASH_ALGO = 'sha256';

const isJson = (file) => file.toLowerCase().endsWith('.json');
const hashFile = (absPath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash(HASH_ALGO);
    const stream = fs.createReadStream(absPath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });

async function collectFiles(country, city) {
  const base = path.join(DATA_ROOT, country, city);
  const entries = await fs.promises.readdir(base, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && isJson(e.name));
  const records = [];

  for (const file of files) {
    const abs = path.join(base, file.name);
    const stat = await fs.promises.stat(abs);
    records.push({
      name: file.name,
      path: `/data/${country}/${city}/${file.name}`,
      size: stat.size,
      hash: await hashFile(abs),
    });
  }
  return records;
}

async function build() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    cities: [],
  };

  const countries = await fs.promises.readdir(DATA_ROOT, { withFileTypes: true });
  for (const countryDir of countries) {
    if (!countryDir.isDirectory()) continue;
    const country = countryDir.name;
    const cities = await fs.promises.readdir(path.join(DATA_ROOT, country), { withFileTypes: true });

    for (const cityDir of cities) {
      if (!cityDir.isDirectory()) continue;
      const city = cityDir.name;
      const files = await collectFiles(country, city);
      manifest.cities.push({ country, city, files });
    }
  }

  await fs.promises.writeFile(OUTPUT, JSON.stringify(manifest, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Manifest written to ${OUTPUT}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

