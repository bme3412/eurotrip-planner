import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getCityIcon } from '../src/components/city-guides/overview/lib/cityIcon.js';
import {
  MONTH_NAMES,
  RATING_COLORS,
  RATING_LABELS,
  TRAVELER_LABELS,
  TRAVELER_OPTIONS,
  TRAVELER_PILL_LABELS,
} from '../src/components/city-guides/overview/lib/constants.js';

// ---------- getCityIcon ----------

test('getCityIcon: matches known cities (case-insensitive)', () => {
  assert.equal(getCityIcon('Paris'), '✨');
  assert.equal(getCityIcon('paris'), '✨');
  assert.equal(getCityIcon('PARIS'), '✨');
  assert.equal(getCityIcon('Rome'), '🏛️');
  assert.equal(getCityIcon('Barcelona'), '🏰');
  assert.equal(getCityIcon('Amsterdam'), '🚲');
  assert.equal(getCityIcon('Berlin'), '🕊️');
  assert.equal(getCityIcon('Venice'), '🛶');
  assert.equal(getCityIcon('Lisbon'), '🌅');
  assert.equal(getCityIcon('Pamplona'), '🐂');
  assert.equal(getCityIcon('Reykjavik'), '🌌');
});

test('getCityIcon: falls back to ✨ for unknown cities', () => {
  assert.equal(getCityIcon('Atlantis'), '✨');
  assert.equal(getCityIcon(''), '✨');
  assert.equal(getCityIcon(null), '✨');
  assert.equal(getCityIcon(undefined), '✨');
});

// NOTE: getSeasonalNeighborhoods() helper was removed when seasonal-neighborhood
// data moved into per-city `seasonal-prose.json`. Tests for that helper were
// removed with the source. Component-level coverage of the new lazy-fetched
// data is a follow-up (see AUDIT.md §6).

// ---------- constants ----------

test('MONTH_NAMES: contains 12 month names in calendar order', () => {
  assert.equal(MONTH_NAMES.length, 12);
  assert.equal(MONTH_NAMES[0], 'January');
  assert.equal(MONTH_NAMES[11], 'December');
});

test('RATING_COLORS: has a hex color for each rating 1-5', () => {
  [1, 2, 3, 4, 5].forEach((rating) => {
    assert.ok(/^#[0-9a-f]{6}$/i.test(RATING_COLORS[rating]), `rating ${rating} is a hex color`);
  });
});

test('RATING_LABELS: has a label for each rating 1-5', () => {
  [1, 2, 3, 4, 5].forEach((rating) => {
    assert.equal(typeof RATING_LABELS[rating], 'string');
    assert.ok(RATING_LABELS[rating].length > 0);
  });
});

test('TRAVELER_LABELS / TRAVELER_OPTIONS / TRAVELER_PILL_LABELS share the same keys', () => {
  const optionSet = new Set(TRAVELER_OPTIONS);
  Object.keys(TRAVELER_LABELS).forEach((key) => assert.ok(optionSet.has(key), `${key} in TRAVELER_OPTIONS`));
  Object.keys(TRAVELER_PILL_LABELS).forEach((key) => assert.ok(optionSet.has(key), `${key} in TRAVELER_OPTIONS`));
});
