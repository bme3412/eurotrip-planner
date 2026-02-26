#!/usr/bin/env node
/**
 * upgradeVisitCalendars.mjs
 *
 * Upgrades "old-format" visit-calendar files (missing crowdLevel / travelerTypes)
 * to the full new format by sending each calendar through OpenAI.
 *
 * Old format — ranges only have: score, special, event, notes
 * New format — ranges also have: crowdLevel, travelerTypes { families, couples, solo, business, budget, luxury }
 *
 * Usage:
 *   node scripts/upgradeVisitCalendars.mjs               # upgrade all old-format calendars
 *   node scripts/upgradeVisitCalendars.mjs --city paris  # upgrade a single city
 *   node scripts/upgradeVisitCalendars.mjs --dry-run     # print list, make no changes
 *   node scripts/upgradeVisitCalendars.mjs --limit 10    # upgrade up to N cities
 *   node scripts/upgradeVisitCalendars.mjs --missing     # generate calendars for cities that have none
 *
 * Requires: OPENAI_API_KEY in .env.local
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
config({ path: path.join(ROOT, '.env.local') });

const DATA_DIR  = path.join(ROOT, 'public', 'data');
const MANIFEST  = path.join(DATA_DIR, 'manifest.json');

// ── CLI ─────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const flag        = (f) => args.includes(`--${f}`);
const arg         = (f) => { const i = args.indexOf(`--${f}`); return i >= 0 ? args[i + 1] : null; };

const DRY_RUN     = flag('dry-run');
const GEN_MISSING = flag('missing');      // also generate for cities with no calendar at all
const TARGET_CITY = arg('city');
const LIMIT       = parseInt(arg('limit') || '999', 10);
const CONCURRENCY = parseInt(arg('concurrency') || '8', 10); // cities processed in parallel

// ── OpenAI ──────────────────────────────────────────────────────────
let _openai = null;
async function getOpenAI() {
  if (_openai) return _openai;
  const { default: OpenAI } = await import('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error('OPENAI_API_KEY missing from .env.local'); process.exit(1); }
  _openai = new OpenAI({ apiKey });
  return _openai;
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

async function callLLM(systemPrompt, userPrompt, retries = 0) {
  const client = await getOpenAI();
  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    });
    const text = resp.choices[0].message.content;
    return JSON.parse(text);
  } catch (err) {
    if (retries < 3) {
      await sleep(2000 * (retries + 1));
      return callLLM(systemPrompt, userPrompt, retries + 1);
    }
    throw err;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Helpers ─────────────────────────────────────────────────────────

function isOldFormat(cal) {
  if (!cal?.months) return false;
  for (const month of Object.values(cal.months)) {
    for (const range of (month.ranges || [])) {
      if (range.crowdLevel !== undefined || range.travelerTypes !== undefined) return false;
    }
  }
  return true;
}

function calendarPath(slug, entry) {
  return path.join(DATA_DIR, entry.country, entry.directoryName, `${slug}-visit-calendar.json`);
}

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
}

function readCalendar(slug, entry) {
  const p = calendarPath(slug, entry);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

// ── Prompts ─────────────────────────────────────────────────────────

const SYSTEM_UPGRADE = `You are a travel data expert. You will receive a visit-calendar JSON for a European city.
Each range in the calendar has days[], score (1-5), and optionally special, event, notes.
Your task: add two fields to EVERY range:

1. "crowdLevel" — one of exactly: "Very Low", "Low", "Moderate", "High", "Very High", "Extreme"
   Use seasonal knowledge: summer = higher crowds, January = lower, major festivals = Extreme or Very High.

2. "travelerTypes" — an object with scores 1-5 for each of: families, couples, solo, business, budget, luxury
   Base scores on time of year, events, weather, and city character.

Rules:
- Preserve ALL existing fields exactly (days, score, special, event, notes, etc.)
- Only ADD crowdLevel and travelerTypes; never remove or rename anything
- If notes is missing from a range, add a concise 1-sentence notes string about that period
- Return the entire calendar JSON with the same root structure ({"months": {...}})
- crowdLevel values MUST be one of the six exact strings listed above`;

const SYSTEM_GENERATE = `You are a travel data expert creating a detailed visit-calendar for a European city.
Return a JSON object with this exact structure:
{
  "months": {
    "january": { "name": "January", "ranges": [...] },
    "february": { "name": "February", "ranges": [...] },
    ...all 12 months...
  }
}

Each range must have:
- "days": array of day numbers covered by this range (e.g. [1,2,3,4,5,6,7])
- "score": integer 1-5 (1=avoid, 2=below average, 3=average, 4=good, 5=excellent)
- "special": boolean (true if this range includes a notable event or holiday)
- "event": string or null (name of the event if special=true)
- "notes": string (1-2 sentences about conditions, crowd, weather)
- "crowdLevel": one of exactly: "Very Low", "Low", "Moderate", "High", "Very High", "Extreme"
- "travelerTypes": { "families": N, "couples": N, "solo": N, "business": N, "budget": N, "luxury": N } (scores 1-5)

Aim for 2-5 ranges per month. Ranges must cover ALL days 1-28/30/31. Use accurate seasonal and event knowledge.`;

// ── Upgrade a single city's calendar ────────────────────────────────

async function upgradeCityCalendar(slug, entry, existingCal, cityName) {
  console.log(`  → Upgrading ${cityName} (${slug})…`);

  const userPrompt = `City: ${cityName}, ${entry.country}
Existing calendar to upgrade (add crowdLevel and travelerTypes to every range):
${JSON.stringify(existingCal, null, 2)}`;

  const upgraded = await callLLM(SYSTEM_UPGRADE, userPrompt);

  // Validate: must still have months
  if (!upgraded?.months) {
    throw new Error(`Invalid response for ${slug}: no months key`);
  }

  // Validate: each range should now have crowdLevel
  let missingCount = 0;
  for (const month of Object.values(upgraded.months)) {
    for (const range of (month.ranges || [])) {
      if (!range.crowdLevel) missingCount++;
    }
  }
  if (missingCount > 0) {
    console.warn(`    ⚠ ${missingCount} ranges still missing crowdLevel`);
  }

  return upgraded;
}

// ── Generate a brand-new calendar for a city without one ─────────────

async function generateNewCalendar(slug, entry, cityName) {
  console.log(`  → Generating new calendar for ${cityName} (${slug})…`);

  const userPrompt = `Create a full 12-month visit-calendar for: ${cityName}, ${entry.country}
Use accurate knowledge of the city's climate, major festivals, tourist seasons, and local events.`;

  const cal = await callLLM(SYSTEM_GENERATE, userPrompt);

  if (!cal?.months || Object.keys(cal.months).length < 12) {
    throw new Error(`Invalid response for ${slug}: incomplete calendar`);
  }

  return cal;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const manifest = readManifest();
  const cities = manifest.cities;

  // Build work list
  const toUpgrade = [];   // { slug, entry, existingCal, cityName, action }

  for (const [slug, entry] of Object.entries(cities)) {
    if (TARGET_CITY && slug !== TARGET_CITY) continue;

    const cal = readCalendar(slug, entry);
    const cityName = entry.directoryName
      .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    if (!cal) {
      if (GEN_MISSING) {
        toUpgrade.push({ slug, entry, existingCal: null, cityName, action: 'generate' });
      }
    } else if (isOldFormat(cal)) {
      toUpgrade.push({ slug, entry, existingCal: cal, cityName, action: 'upgrade' });
    }
  }

  if (toUpgrade.length === 0) {
    console.log('✅ All calendars are already in the new format. Nothing to do.');
    return;
  }

  // Sort: cities currently in results (old-format with high scores) first
  // Proxy: more months with score >= 4 = more likely to surface in results
  toUpgrade.sort((a, b) => {
    if (a.action !== b.action) return a.action === 'upgrade' ? -1 : 1;
    const highMonths = (cal) => {
      if (!cal?.months) return 0;
      return Object.values(cal.months).filter(m =>
        (m.ranges || []).some(r => r.score >= 4)
      ).length;
    };
    return highMonths(b.existingCal) - highMonths(a.existingCal);
  });

  const batch = toUpgrade.slice(0, LIMIT);

  console.log(`\n📋 Visit Calendar Upgrade Plan`);
  console.log(`   To upgrade (old format):  ${toUpgrade.filter(x => x.action === 'upgrade').length}`);
  console.log(`   To generate (missing):    ${toUpgrade.filter(x => x.action === 'generate').length}`);
  console.log(`   Processing this run:      ${batch.length}`);
  console.log(`   Concurrency:              ${CONCURRENCY} cities at a time`);
  console.log(`   Estimated time:           ~${Math.ceil(batch.length / CONCURRENCY * 2)} min`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would process:');
    batch.forEach(({ slug, cityName, action }) => {
      console.log(`  ${action.padEnd(8)} ${cityName.padEnd(25)} (${slug})`);
    });
    return;
  }

  let upgraded = 0, failed = 0;
  const total = batch.length;
  const startTime = Date.now();

  // Process in parallel chunks of CONCURRENCY
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY);
    const chunkNum = Math.floor(i / CONCURRENCY) + 1;
    const totalChunks = Math.ceil(batch.length / CONCURRENCY);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const done = upgraded + failed;
    const eta = done > 0
      ? Math.round(((Date.now() - startTime) / done) * (total - done) / 1000)
      : '?';

    console.log(`\n─── Chunk ${chunkNum}/${totalChunks} (${chunk.map(c => c.slug).join(', ')}) — ${done}/${total} done, ETA ${eta}s ───`);

    await Promise.all(chunk.map(async ({ slug, entry, existingCal, cityName, action }) => {
      try {
        let result;
        if (action === 'upgrade') {
          result = await upgradeCityCalendar(slug, entry, existingCal, cityName);
        } else {
          result = await generateNewCalendar(slug, entry, cityName);
        }

        const outPath = calendarPath(slug, entry);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
        console.log(`  ✅ ${cityName} (${slug})`);
        upgraded++;
      } catch (err) {
        console.error(`  ❌ ${cityName} (${slug}): ${err.message}`);
        failed++;
      }
    }));
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Done in ${totalTime}s. Upgraded: ${upgraded}  Failed: ${failed}`);
  if (failed > 0) {
    console.log('   Re-run to retry failed cities.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
