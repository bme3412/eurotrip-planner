import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getCityIcon } from '../src/components/city-guides/overview/lib/cityIcon.js';
import { getSeasonalNeighborhoods } from '../src/components/city-guides/overview/lib/seasonalNeighborhoods.js';
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

// ---------- getSeasonalNeighborhoods ----------

test('getSeasonalNeighborhoods: returns 4 seasons for Paris', () => {
  const result = getSeasonalNeighborhoods('Paris');
  assert.equal(result.length, 4);
  assert.deepEqual(
    result.map((r) => r.season),
    ['Spring', 'Summer', 'Fall', 'Winter'],
  );
});

test('getSeasonalNeighborhoods: Paris recommendations mention Paris-specific neighborhoods', () => {
  const result = getSeasonalNeighborhoods('Paris');
  const allText = result.map((r) => r.neighborhood).join(' ');
  assert.ok(allText.includes('Saint-Germain'));
  assert.ok(allText.includes('Marais'));
  assert.ok(allText.includes('Montmartre'));
});

test('getSeasonalNeighborhoods: returns generic defaults for unknown cities', () => {
  const result = getSeasonalNeighborhoods('Atlantis');
  assert.equal(result.length, 4);
  assert.equal(result[0].neighborhood, 'Historic center');
});

test('getSeasonalNeighborhoods: each entry has season, neighborhood, reason', () => {
  const result = getSeasonalNeighborhoods('Paris');
  result.forEach((item) => {
    assert.equal(typeof item.season, 'string');
    assert.equal(typeof item.neighborhood, 'string');
    assert.equal(typeof item.reason, 'string');
    assert.ok(item.season.length > 0);
    assert.ok(item.neighborhood.length > 0);
    assert.ok(item.reason.length > 0);
  });
});

test('getSeasonalNeighborhoods: handles null/undefined city gracefully', () => {
  const fromNull = getSeasonalNeighborhoods(null);
  const fromUndefined = getSeasonalNeighborhoods(undefined);
  assert.equal(fromNull.length, 4);
  assert.equal(fromUndefined.length, 4);
});

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
