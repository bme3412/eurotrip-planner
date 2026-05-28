import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Data-shape contract for the per-city editorial JSON migrated out of
// src/components/city-guides/_data/*.js during the planner-v2-audit-cleanup
// refactor. These are consumed lazily by:
//   - StartHere.js             → start-here.json
//   - FoodDrinkGuide.js        → food-guide.json
//   - SeasonalProse.jsx        → seasonal-prose.json (narrative)
//   - SeasonalNeighborhoods.jsx → seasonal-prose.json (seasonalNeighborhoods)
//
// Any drift in shape would silently degrade the city-guide UX (fallback to
// generic defaults), so we enforce structure here.
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_ROOT = path.join(REPO_ROOT, 'public', 'data');

const FEATURED_CITIES = [
  ['Austria', 'vienna'],
  ['Czechia', 'prague'],
  ['Denmark', 'copenhagen'],
  ['France', 'paris'],
  ['Germany', 'berlin'],
  ['Hungary', 'budapest'],
  ['Italy', 'florence'],
  ['Italy', 'rome'],
  ['Netherlands', 'amsterdam'],
  ['Portugal', 'lisbon'],
  ['Spain', 'barcelona'],
  ['UK', 'london'],
];

// Canonical prose section files live under sections/prose/. The seasonal
// prose was renamed from `seasonal-prose.json` to `seasonal.json` in Phase B.
const FILES = ['start-here.json', 'food-guide.json', 'seasonal.json'];

function readJson(country, city, file) {
  const p = path.join(DATA_ROOT, country, city, 'sections', 'prose', file);
  return JSON.parse(readFileSync(p, 'utf8'));
}

function fileExists(country, city, file) {
  return existsSync(path.join(DATA_ROOT, country, city, 'sections', 'prose', file));
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

// ---------- start-here.json ----------

const START_HERE_NARRATIVE_KEYS = [
  'intro',
  'arrival',
  'gettingAround',
  'money',
  'connectivity',
  'timing',
  'quickWins',
];

for (const [country, city] of FEATURED_CITIES) {
  test(`start-here.json (${country}/${city}): has narrative.{${START_HERE_NARRATIVE_KEYS.join(',')}} and non-empty faqs[]`, () => {
    const data = readJson(country, city, 'start-here.json');

    assert.ok(data.narrative && typeof data.narrative === 'object', 'narrative object');
    for (const key of START_HERE_NARRATIVE_KEYS) {
      assert.ok(data.narrative[key], `narrative.${key} present`);
    }
    // intro is a string; the rest are { title, content } objects.
    assert.ok(isNonEmptyString(data.narrative.intro), 'narrative.intro is non-empty string');
    for (const key of START_HERE_NARRATIVE_KEYS.slice(1)) {
      assert.ok(isNonEmptyString(data.narrative[key].title), `narrative.${key}.title`);
      assert.ok(isNonEmptyString(data.narrative[key].content), `narrative.${key}.content`);
    }

    assert.ok(Array.isArray(data.faqs) && data.faqs.length > 0, 'faqs is non-empty array');
    for (const faq of data.faqs) {
      assert.ok(isNonEmptyString(faq.question), 'faq.question');
      assert.ok(isNonEmptyString(faq.answer), 'faq.answer');
    }
  });
}

// ---------- food-guide.json ----------

for (const [country, city] of FEATURED_CITIES) {
  test(`food-guide.json (${country}/${city}): has intro, sections[], highlights[]`, () => {
    const data = readJson(country, city, 'food-guide.json');

    assert.ok(isNonEmptyString(data.intro), 'intro is non-empty string');

    assert.ok(Array.isArray(data.sections) && data.sections.length > 0, 'sections is non-empty array');
    for (const section of data.sections) {
      assert.ok(isNonEmptyString(section.title), 'section.title');
      assert.ok(isNonEmptyString(section.content), 'section.content');
    }

    assert.ok(Array.isArray(data.highlights) && data.highlights.length > 0, 'highlights is non-empty array');
    for (const h of data.highlights) {
      assert.ok(isNonEmptyString(h.name), 'highlight.name');
      assert.ok(isNonEmptyString(h.type), 'highlight.type');
      assert.ok(isNonEmptyString(h.neighborhood), 'highlight.neighborhood');
      assert.ok(isNonEmptyString(h.time), 'highlight.time');
    }
  });
}

// ---------- seasonal-prose.json ----------

const SEASONAL_NARRATIVE_KEYS = ['springFall', 'summer', 'winter', 'march'];
const VALID_SEASONS = new Set(['Spring', 'Summer', 'Fall', 'Winter']);

for (const [country, city] of FEATURED_CITIES) {
  test(`seasonal.json (${country}/${city}): narrative.{${SEASONAL_NARRATIVE_KEYS.join(',')}} + 4 seasonalNeighborhoods`, () => {
    const data = readJson(country, city, 'seasonal.json');

    assert.ok(data.narrative && typeof data.narrative === 'object', 'narrative object');
    for (const key of SEASONAL_NARRATIVE_KEYS) {
      assert.ok(isNonEmptyString(data.narrative[key]), `narrative.${key}`);
    }

    assert.ok(
      Array.isArray(data.seasonalNeighborhoods) && data.seasonalNeighborhoods.length === 4,
      'seasonalNeighborhoods is array of length 4',
    );
    for (const item of data.seasonalNeighborhoods) {
      assert.ok(VALID_SEASONS.has(item.season), `season in {Spring,Summer,Fall,Winter}: got "${item.season}"`);
      assert.ok(isNonEmptyString(item.neighborhood), 'item.neighborhood');
      assert.ok(isNonEmptyString(item.reason), 'item.reason');
    }
  });
}

// ---------- All-or-nothing rule (catches half-migrated cities) ----------

test('featured-city completeness: every featured city has all 3 JSON files', () => {
  const missing = [];
  for (const [country, city] of FEATURED_CITIES) {
    for (const file of FILES) {
      if (!fileExists(country, city, file)) {
        missing.push(`${country}/${city}/${file}`);
      }
    }
  }
  assert.deepEqual(missing, [], `missing files:\n  ${missing.join('\n  ')}`);
});

test('all-or-nothing: any city that has 1 of the 3 featured files must have all 3', async () => {
  // Walk every city dir under public/data and check.
  const { readdirSync, statSync } = await import('node:fs');
  const halfMigrated = [];

  for (const country of readdirSync(DATA_ROOT)) {
    const countryPath = path.join(DATA_ROOT, country);
    if (!statSync(countryPath).isDirectory()) continue;
    if (country.startsWith('_')) continue; // skip _scoreboard etc.

    for (const city of readdirSync(countryPath)) {
      const cityPath = path.join(countryPath, city);
      let isDir;
      try { isDir = statSync(cityPath).isDirectory(); } catch { continue; }
      if (!isDir) continue;

      const proseDir = path.join(cityPath, 'sections', 'prose');
      const present = FILES.filter((f) => existsSync(path.join(proseDir, f)));
      if (present.length > 0 && present.length < FILES.length) {
        const missing = FILES.filter((f) => !present.includes(f));
        halfMigrated.push(`${country}/${city} → missing ${missing.join(', ')}`);
      }
    }
  }

  assert.deepEqual(halfMigrated, [], `half-migrated cities:\n  ${halfMigrated.join('\n  ')}`);
});
