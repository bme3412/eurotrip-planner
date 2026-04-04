#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

async function buildMonthlyIndexForCity(cityDir) {
  const monthlyDir = path.join(cityDir, 'monthly');
  try {
    await fs.promises.access(monthlyDir);
  } catch {
    return false;
  }

  const files = await fs.promises.readdir(monthlyDir);
  const index = {};

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(monthlyDir, file);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const json = JSON.parse(raw);
      Object.assign(index, json);
    } catch (e) {
      // skip malformed
    }
  }

  const outPath = path.join(monthlyDir, 'index.json');
  await fs.promises.writeFile(outPath, JSON.stringify(index));
  return true;
}

async function main() {
  const dataRoot = path.join(process.cwd(), 'public', 'data');
  const countries = await fs.promises.readdir(dataRoot, { withFileTypes: true });
  let count = 0;
  for (const country of countries) {
    if (!country.isDirectory() || country.name.includes('.')) continue;
    const countryDir = path.join(dataRoot, country.name);
    const cities = await fs.promises.readdir(countryDir, { withFileTypes: true });
    for (const city of cities) {
      if (!city.isDirectory()) continue;
      const cityDir = path.join(countryDir, city.name);
      const ok = await buildMonthlyIndexForCity(cityDir);
      if (ok) count++;
    }
  }
  console.log(`Generated monthly/index.json for ${count} cities`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


