#!/usr/bin/env node
/**
 * Export city data to chunked markdown files for Bedrock Knowledge Base ingestion.
 *
 * Reads the structured JSON files in public/data/<Country>/<city>/
 * and writes human-readable markdown files to infra/kb-data/ organized
 * by city and content type (attractions, neighborhoods, culinary, seasonal).
 *
 * Usage:
 *   node scripts/exportCityDataForKB.mjs            # export all cities
 *   node scripts/exportCityDataForKB.mjs --upload    # export + upload to S3
 *
 * The --upload flag requires AWS_REGION and the KB bucket to exist.
 */

import { readdir, readFile, mkdir, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');
const OUTPUT_DIR = join(import.meta.dirname, '..', 'infra', 'kb-data');
const UPLOAD = process.argv.includes('--upload');
const STAGE = process.argv.find((a) => a.startsWith('--stage='))?.split('=')[1] || 'dev';

async function getCountryDirs() {
  const entries = await readdir(DATA_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function getCityDirs(countryDir) {
  const countryPath = join(DATA_DIR, countryDir);
  const entries = await readdir(countryPath, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function loadJsonSafe(path) {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function attractionsToMarkdown(data, city, country) {
  if (!data?.categories?.length) return null;

  let md = `# ${city}, ${country} — Things to Do & Attractions\n\n`;

  for (const cat of data.categories) {
    md += `## ${cat.title}\n`;
    if (cat.description) md += `${cat.description}\n\n`;

    for (const item of cat.items || []) {
      md += `### ${item.activity || item.name}\n`;
      if (item.description) md += `${item.description}\n`;
      const meta = [];
      if (item.cost) meta.push(`Cost: ${item.cost}`);
      if (item.duration) meta.push(`Duration: ${item.duration}`);
      if (item.neighborhood) meta.push(`Area: ${item.neighborhood}`);
      if (item.optimal_time) meta.push(`Best time: ${item.optimal_time}`);
      if (item.tags?.length) meta.push(`Tags: ${item.tags.join(', ')}`);
      if (meta.length) md += `\n${meta.join(' | ')}\n`;
      md += '\n';
    }
  }

  return md;
}

function neighborhoodsToMarkdown(data, city, country) {
  const neighborhoods = data?.neighborhoods || data?.districts || [];
  if (!neighborhoods.length) return null;

  let md = `# ${city}, ${country} — Neighborhoods Guide\n\n`;

  for (const n of neighborhoods) {
    md += `## ${n.name || n.title}\n`;
    if (n.description || n.overview) md += `${n.description || n.overview}\n\n`;
    if (n.vibe) md += `**Vibe:** ${n.vibe}\n`;
    if (n.highlights?.length) md += `**Highlights:** ${n.highlights.join(', ')}\n`;
    if (n.best_for?.length) md += `**Best for:** ${n.best_for.join(', ')}\n`;
    md += '\n';
  }

  return md;
}

function culinaryToMarkdown(data, city, country) {
  const sections = data?.sections || data?.categories || data?.cuisines || [];
  if (!sections.length && !data?.specialties?.length) return null;

  let md = `# ${city}, ${country} — Culinary Guide\n\n`;

  if (data.overview) md += `${data.overview}\n\n`;

  for (const s of sections) {
    md += `## ${s.title || s.name}\n`;
    if (s.description) md += `${s.description}\n\n`;
    for (const item of s.items || s.places || []) {
      md += `- **${item.name || item.activity}**: ${item.description || ''}\n`;
    }
    md += '\n';
  }

  if (data.specialties?.length) {
    md += `## Local Specialties\n`;
    for (const s of data.specialties) {
      md += `- **${s.name}**: ${s.description || ''}\n`;
    }
    md += '\n';
  }

  return md;
}

function seasonalToMarkdown(data, city, country, month) {
  if (!data) return null;

  let md = `# ${city}, ${country} — ${month.charAt(0).toUpperCase() + month.slice(1)} Travel Guide\n\n`;

  if (data.weather) {
    md += `## Weather\n`;
    const w = data.weather;
    if (w.average_high) md += `Average high: ${w.average_high}°C\n`;
    if (w.average_low) md += `Average low: ${w.average_low}°C\n`;
    if (w.rainfall) md += `Rainfall: ${w.rainfall}\n`;
    if (w.description) md += `${w.description}\n`;
    md += '\n';
  }

  if (data.events?.length) {
    md += `## Events & Festivals\n`;
    for (const e of data.events) {
      md += `- **${e.name}**: ${e.description || ''}\n`;
    }
    md += '\n';
  }

  if (data.tips?.length) {
    md += `## Tips\n`;
    for (const t of data.tips) {
      md += `- ${typeof t === 'string' ? t : t.tip || t.description || ''}\n`;
    }
    md += '\n';
  }

  if (data.packing?.length) {
    md += `## Packing\n`;
    for (const p of data.packing) {
      md += `- ${typeof p === 'string' ? p : p.item || ''}\n`;
    }
    md += '\n';
  }

  return md;
}

async function processCity(country, citySlug) {
  const cityDir = join(DATA_DIR, country, citySlug);
  const cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const outputDir = join(OUTPUT_DIR, `${citySlug}`);
  await mkdir(outputDir, { recursive: true });

  let filesWritten = 0;

  const files = await readdir(cityDir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory() && file.name === 'monthly') {
      const monthDir = join(cityDir, 'monthly');
      const months = await readdir(monthDir);
      for (const monthFile of months) {
        if (!monthFile.endsWith('.json') || monthFile === 'monthly-taglines.json') continue;
        const month = basename(monthFile, '.json');
        const data = await loadJsonSafe(join(monthDir, monthFile));
        const md = seasonalToMarkdown(data, cityName, country, month);
        if (md) {
          await writeFile(join(outputDir, `${citySlug}-${month}.md`), md);
          filesWritten++;
        }
      }
      continue;
    }

    if (!file.name.endsWith('.json')) continue;

    const data = await loadJsonSafe(join(cityDir, file.name));
    if (!data) continue;

    const fileName = file.name.toLowerCase();
    let md = null;

    if (fileName.includes('attractions') || fileName.includes('things-to-do') || fileName.includes('experiences')) {
      md = attractionsToMarkdown(data, cityName, country);
      if (md) await writeFile(join(outputDir, `${citySlug}-attractions.md`), md);
    } else if (fileName.includes('neighborhood')) {
      md = neighborhoodsToMarkdown(data, cityName, country);
      if (md) await writeFile(join(outputDir, `${citySlug}-neighborhoods.md`), md);
    } else if (fileName.includes('culinary') || fileName.includes('food')) {
      md = culinaryToMarkdown(data, cityName, country);
      if (md) await writeFile(join(outputDir, `${citySlug}-culinary.md`), md);
    }

    if (md) filesWritten++;
  }

  return filesWritten;
}

async function main() {
  console.log('Exporting city data for Bedrock Knowledge Base...\n');

  await mkdir(OUTPUT_DIR, { recursive: true });

  const countries = await getCountryDirs();
  let totalFiles = 0;
  let totalCities = 0;

  for (const country of countries) {
    const cities = await getCityDirs(country);
    for (const city of cities) {
      const count = await processCity(country, city);
      if (count > 0) {
        totalCities++;
        totalFiles += count;
      }
    }
  }

  console.log(`Exported ${totalFiles} markdown files for ${totalCities} cities to ${OUTPUT_DIR}\n`);

  if (UPLOAD) {
    const bucket = `eurotrip-kb-data-${STAGE}`;
    console.log(`Uploading to s3://${bucket}/ ...`);
    try {
      execSync(`aws s3 sync "${OUTPUT_DIR}" "s3://${bucket}/" --delete --exclude ".DS_Store"`, {
        stdio: 'inherit',
      });
      console.log('Upload complete.');
    } catch (err) {
      console.error('Upload failed:', err.message);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
