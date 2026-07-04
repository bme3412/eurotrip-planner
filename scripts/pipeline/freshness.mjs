#!/usr/bin/env node

/**
 * Content Freshness Audit
 *
 * Scans the source-of-truth city content under /content/cities/ for signs
 * of rot that the quality audit (audit.mjs) does not cover:
 *
 *   1. Past-dated attraction closures (e.g. "2025-05-01 Holiday closure"
 *      still listed in mid-2026).
 *   2. LLM citation artifacts leaking into user-facing text
 *      (":contentReference[oaicite:N]{index=N}" and friends).
 *   3. Stale or missing provenance timestamps (experiences generated_at,
 *      overview meta.last_updated, forty-eight-hours.json with no
 *      generation stamp at all).
 *
 * Report-only by default. `--fix` applies the two mechanical repairs:
 *   - strips citation artifacts from all string fields, and
 *   - rolls closures that fall on fixed-date French public holidays
 *     forward to their next future occurrence.
 * Everything else (one-off closures, stale timestamps) is only reported —
 * those need a human or a real regeneration, not a date bump.
 *
 * NOTE: this audits /content/cities/ only. Generated mirrors under
 * /public/data/ pick the fixes up on the next `npm run build:content`
 * (plus the manual mirror copies for {slug}-experiences.json — see
 * scripts/content/build.mjs header).
 *
 * Usage:
 *   node scripts/pipeline/freshness.mjs [options]
 *
 * Options:
 *   --city SLUG        Audit a single city
 *   --fix              Apply mechanical fixes (artifacts + holiday closures)
 *   --json             Output JSON format
 *   --strict           Exit non-zero if any findings remain after fixes
 *   --max-age-days N   Flag provenance timestamps older than N days (default: 365)
 */

import fs from 'fs/promises';
import path from 'path';

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'cities');

// Fixed-date French public holidays (month-day). Closures on these dates are
// annual and safe to roll forward; movable feasts (Easter Monday, Ascension,
// Whit Monday) are intentionally absent — those need real dates, not a bump.
const FIXED_HOLIDAYS = new Set([
  '01-01', // New Year's Day
  '05-01', // Labour Day
  '05-08', // Victory in Europe Day
  '07-14', // Bastille Day
  '08-15', // Assumption
  '11-01', // All Saints' Day
  '11-11', // Armistice Day
  '12-25', // Christmas Day
]);

// LLM citation artifacts that must never reach user-facing text.
const ARTIFACT_PATTERNS = [
  /\s*:contentReference\[oaicite:\d+\]\{index=\d+\}/g,
  /\s*\[oaicite:\d+\]/g,
  /【[^】]*†[^】]*】/g,
];

const AUDITED_FILES = [
  'attractions.json',
  'experiences.json',
  'overview.json',
  'neighborhoods.json',
  'culinary.json',
  'forty-eight-hours.json',
];

function parseArgs(argv) {
  const args = { maxAgeDays: 365 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--fix') args.fix = true;
    else if (a === '--json') args.json = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '--city') args.city = argv[++i];
    else if (a === '--max-age-days') args.maxAgeDays = Number(argv[++i]);
  }
  return args;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** Next occurrence of a month-day strictly in the future (relative to today). */
function nextOccurrence(monthDay, today) {
  const [m, d] = monthDay.split('-').map(Number);
  const candidate = new Date(Date.UTC(today.getUTCFullYear(), m - 1, d));
  if (isoDate(candidate) <= isoDate(today)) {
    candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
  }
  return isoDate(candidate);
}

/** Recursively strip citation artifacts from every string in a JSON value. */
function stripArtifacts(value, hits) {
  if (typeof value === 'string') {
    let out = value;
    for (const re of ARTIFACT_PATTERNS) {
      const matches = out.match(re);
      if (matches) {
        hits.count += matches.length;
        out = out.replace(re, '');
      }
    }
    return out === value ? value : out.replace(/[ \t]{2,}/g, ' ').trimEnd();
  }
  if (Array.isArray(value)) return value.map((v) => stripArtifacts(v, hits));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripArtifacts(v, hits);
    return out;
  }
  return value;
}

function countArtifacts(raw) {
  // Apply patterns sequentially (like stripArtifacts) so a broad pattern's
  // match isn't re-counted by a narrower one matching inside it.
  let count = 0;
  let rest = raw;
  for (const re of ARTIFACT_PATTERNS) {
    count += (rest.match(re) || []).length;
    rest = rest.replace(re, '');
  }
  return count;
}

async function readJsonOrNull(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    return null;
  }
}

async function discoverCities(cityFilter) {
  const cities = [];
  const countries = await fs.readdir(CONTENT_ROOT, { withFileTypes: true });
  for (const country of countries) {
    if (!country.isDirectory()) continue;
    const countryDir = path.join(CONTENT_ROOT, country.name);
    const entries = await fs.readdir(countryDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (cityFilter && entry.name !== cityFilter) continue;
      cities.push({ country: country.name, city: entry.name, dir: path.join(countryDir, entry.name) });
    }
  }
  return cities;
}

/**
 * Audit (and optionally fix) one city.
 * Returns { findings: [...], fixed: [...] }.
 */
async function auditCity({ city, dir }, { fix, maxAgeDays, today }) {
  const findings = [];
  const fixed = [];

  // --- 1 & 2: closures + artifacts in the audited content files ---
  for (const filename of AUDITED_FILES) {
    const file = path.join(dir, filename);
    let raw;
    try {
      raw = await fs.readFile(file, 'utf-8');
    } catch {
      continue; // file not authored for this city — not a freshness problem
    }

    const artifactCount = countArtifacts(raw);
    let data = null;
    let dirty = false;

    if (artifactCount > 0) {
      if (fix) {
        data = JSON.parse(raw);
        const hits = { count: 0 };
        data = stripArtifacts(data, hits);
        dirty = true;
        fixed.push({ city, file: filename, type: 'citation-artifacts', detail: `stripped ${hits.count}` });
      } else {
        findings.push({ city, file: filename, type: 'citation-artifacts', detail: `${artifactCount} occurrence(s)`, fixable: true });
      }
    }

    if (filename === 'attractions.json') {
      data = data || JSON.parse(raw);
      const seenNames = new Set();
      for (const site of data.sites || []) {
        if (seenNames.has(site.name)) {
          findings.push({ city, file: filename, type: 'duplicate-site', detail: site.name, fixable: false });
        }
        seenNames.add(site.name);
      }
      let rolled = 0;
      for (const site of data.sites || []) {
        for (const closure of site.closures || []) {
          if (!closure.date || closure.date >= isoDate(today)) continue;
          // An ongoing closure legitimately starts in the past — treat a
          // reason citing a current-or-future year ("reopening c. 2030")
          // as ongoing, not stale.
          const years = String(closure.reason || '').match(/\b(20\d{2})\b/g) || [];
          if (years.some((y) => Number(y) >= today.getUTCFullYear())) continue;
          const monthDay = closure.date.slice(5);
          if (FIXED_HOLIDAYS.has(monthDay)) {
            if (fix) {
              const rolledDate = nextOccurrence(monthDay, today);
              const collides = (site.closures || []).some((c) => c !== closure && c.date === rolledDate);
              if (collides) {
                closure._remove = true; // duplicate after rolling — drop below
              } else {
                closure.date = rolledDate;
              }
              rolled += 1;
              dirty = true;
            } else {
              findings.push({
                city, file: filename, type: 'stale-closure-holiday',
                detail: `${site.name}: ${closure.date} (${closure.reason || 'no reason'})`, fixable: true,
              });
            }
          } else {
            findings.push({
              city, file: filename, type: 'stale-closure-manual',
              detail: `${site.name}: ${closure.date} (${closure.reason || 'no reason'})`, fixable: false,
            });
          }
        }
        if (fix && site.closures) {
          const before = site.closures.length;
          site.closures = site.closures.filter((c) => !c._remove);
          if (site.closures.length !== before) dirty = true;
          // keep the calendar sorted after rolling dates forward
          site.closures.sort((a, b) => String(a.date).localeCompare(String(b.date)));
        }
      }
      if (fix && rolled > 0) {
        fixed.push({ city, file: filename, type: 'stale-closure-holiday', detail: `rolled ${rolled} fixed-date holiday closure(s) forward` });
      }
    }

    if (fix && dirty) {
      data = data || JSON.parse(raw);
      await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    }
  }

  // --- 3: provenance timestamps ---
  const ageLimit = new Date(today.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

  const experiences = await readJsonOrNull(path.join(dir, 'experiences.json'));
  if (experiences) {
    const stamp = experiences.enriched_at || experiences.generated_at;
    if (!stamp) {
      findings.push({ city, file: 'experiences.json', type: 'missing-provenance', detail: 'no generated_at/enriched_at', fixable: false });
    } else if (new Date(stamp) < ageLimit) {
      findings.push({ city, file: 'experiences.json', type: 'stale-provenance', detail: `generated ${stamp.slice(0, 10)}`, fixable: false });
    }
  }

  const overview = await readJsonOrNull(path.join(dir, 'overview.json'));
  const lastUpdated = overview?.meta?.last_updated;
  if (lastUpdated && new Date(lastUpdated) < ageLimit) {
    findings.push({ city, file: 'overview.json', type: 'stale-provenance', detail: `last_updated ${lastUpdated}`, fixable: false });
  }

  const fortyEight = await readJsonOrNull(path.join(dir, 'forty-eight-hours.json'));
  if (fortyEight && !fortyEight.generated_at) {
    findings.push({ city, file: 'forty-eight-hours.json', type: 'missing-provenance', detail: 'no generated_at stamp', fixable: false });
  }

  return { findings, fixed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const today = new Date();

  const cities = await discoverCities(args.city);
  if (args.city && cities.length === 0) {
    console.error(`No content city found for slug "${args.city}" under ${CONTENT_ROOT}`);
    process.exit(2);
  }

  const allFindings = [];
  const allFixed = [];
  for (const cityRef of cities) {
    const { findings, fixed } = await auditCity(cityRef, { fix: args.fix, maxAgeDays: args.maxAgeDays, today });
    allFindings.push(...findings);
    allFixed.push(...fixed);
  }

  if (args.json) {
    console.log(JSON.stringify({ auditedCities: cities.length, findings: allFindings, fixed: allFixed }, null, 2));
  } else {
    if (allFixed.length) {
      console.log(`\nFixed (${allFixed.length}):`);
      for (const f of allFixed) console.log(`  ✔ [${f.city}] ${f.file} — ${f.type}: ${f.detail}`);
    }
    if (allFindings.length) {
      const byType = {};
      for (const f of allFindings) (byType[f.type] = byType[f.type] || []).push(f);
      console.log(`\nFindings (${allFindings.length}) across ${cities.length} cities:`);
      for (const [type, list] of Object.entries(byType)) {
        console.log(`\n  ${type} (${list.length})${list[0].fixable ? ' — fixable with --fix' : ''}`);
        for (const f of list.slice(0, 20)) console.log(`    [${f.city}] ${f.file}: ${f.detail}`);
        if (list.length > 20) console.log(`    … and ${list.length - 20} more`);
      }
    } else {
      console.log(`Freshness audit clean across ${cities.length} cities.`);
    }
  }

  if (args.strict && allFindings.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
