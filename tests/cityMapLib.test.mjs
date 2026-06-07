import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isOpenNow, getPriorityColor, getPriorityLevel, getMarkerScale } from '../src/components/city-guides/citymap/lib/priority.js';
import { stripMarkdown } from '../src/components/city-guides/citymap/lib/markdown.js';
import { computeIconicAttractionNames } from '../src/components/city-guides/citymap/lib/iconic.js';
import { getAttractionCoords } from '../src/components/city-guides/citymap/lib/coords.js';

// ---------- isOpenNow ----------

test('isOpenNow: returns true when best_time is missing', () => {
  assert.equal(isOpenNow({}), true);
  assert.equal(isOpenNow({ best_time: null }), true);
  assert.equal(isOpenNow(null), true);
});

test('isOpenNow: matches "morning" between 6-12', () => {
  const at9 = new Date('2026-01-01T09:00:00');
  assert.equal(isOpenNow({ best_time: 'Morning hours' }, at9), true);
  const at13 = new Date('2026-01-01T13:00:00');
  assert.equal(isOpenNow({ best_time: 'Morning hours' }, at13), false);
});

test('isOpenNow: matches "afternoon" between 12-18', () => {
  const at14 = new Date('2026-01-01T14:00:00');
  assert.equal(isOpenNow({ best_time: 'Afternoon visit' }, at14), true);
  const at8 = new Date('2026-01-01T08:00:00');
  assert.equal(isOpenNow({ best_time: 'Afternoon visit' }, at8), false);
});

test('isOpenNow: matches "evening" after 18', () => {
  const at20 = new Date('2026-01-01T20:00:00');
  assert.equal(isOpenNow({ best_time: 'Evening' }, at20), true);
  const at10 = new Date('2026-01-01T10:00:00');
  assert.equal(isOpenNow({ best_time: 'Evening' }, at10), false);
});

test('isOpenNow: matches "sunset" between 17-20', () => {
  const at18 = new Date('2026-01-01T18:00:00');
  assert.equal(isOpenNow({ best_time: 'Best at sunset' }, at18), true);
  const at21 = new Date('2026-01-01T21:00:00');
  assert.equal(isOpenNow({ best_time: 'Best at sunset' }, at21), false);
});

// ---------- getPriorityColor (price tier only; "open now" lives in the popup) ----------

test('getPriorityColor: free → green (regardless of time)', () => {
  assert.equal(getPriorityColor({ price_range: 'Free' }), '#10B981');
});

test('getPriorityColor: budget → sky', () => {
  assert.equal(getPriorityColor({ price_range: 'Budget' }), '#0EA5E9');
});

test('getPriorityColor: moderate → amber', () => {
  assert.equal(getPriorityColor({ price_range: 'Moderate' }), '#F59E0B');
});

test('getPriorityColor: expensive → red', () => {
  assert.equal(getPriorityColor({ price_range: 'Expensive' }), '#EF4444');
});

test('getPriorityColor: unknown → gray fallback', () => {
  assert.equal(getPriorityColor({ price_range: 'Unknown' }), '#6B7280');
  assert.equal(getPriorityColor(null), '#6B7280');
});

// ---------- getMarkerScale ----------

test('getMarkerScale: iconic (significance 5) is largest, minor sights smaller', () => {
  const iconic = getMarkerScale({ ratings: { cultural_significance: 5 } });
  const mid = getMarkerScale({ ratings: { cultural_significance: 3 } });
  const minor = getMarkerScale({ ratings: { cultural_significance: 1 } });
  assert.ok(iconic > mid && mid > minor);
  assert.equal(mid, 1.0); // unscored/average → neutral size
  assert.equal(getMarkerScale({}), 1.0); // missing significance → neutral
});

// ---------- isOpenNow accepts a city-hour number ----------

test('isOpenNow: accepts a numeric city hour (not just a Date)', () => {
  assert.equal(isOpenNow({ best_time: 'Morning' }, 9), true);
  assert.equal(isOpenNow({ best_time: 'Morning' }, 21), false);
  assert.equal(isOpenNow({ best_time: 'Evening' }, 20), true);
});

// ---------- getPriorityLevel ----------

test('getPriorityLevel: scales with cultural_significance', () => {
  const at12 = new Date('2026-01-01T12:00:00');
  const low = getPriorityLevel({ ratings: { cultural_significance: 1 } }, at12);
  const high = getPriorityLevel({ ratings: { cultural_significance: 5 } }, at12);
  assert.ok(high > low);
});

test('getPriorityLevel: bonus for free + open now', () => {
  const at9 = new Date('2026-01-01T09:00:00');
  const baseline = getPriorityLevel(
    { ratings: { cultural_significance: 3 }, price_range: 'Moderate', best_time: 'Evening' },
    at9,
  );
  const bonused = getPriorityLevel(
    { ratings: { cultural_significance: 3 }, price_range: 'Free', best_time: 'Morning' },
    at9,
  );
  // Free bonus (+1) + open-now bonus (+1) = +2 over baseline.
  assert.equal(bonused - baseline, 2);
});

// ---------- stripMarkdown ----------

test('stripMarkdown: removes bold/italic/code markers', () => {
  assert.equal(stripMarkdown('**bold**'), 'bold');
  assert.equal(stripMarkdown('*italic*'), 'italic');
  assert.equal(stripMarkdown('__bold__'), 'bold');
  assert.equal(stripMarkdown('_italic_'), 'italic');
  assert.equal(stripMarkdown('`code`'), 'code');
});

test('stripMarkdown: handles mixed content', () => {
  assert.equal(
    stripMarkdown('Visit **Eiffel Tower** at *sunset* — see `notes`.'),
    'Visit Eiffel Tower at sunset — see notes.',
  );
});

test('stripMarkdown: returns "" for falsy input', () => {
  assert.equal(stripMarkdown(null), '');
  assert.equal(stripMarkdown(undefined), '');
  assert.equal(stripMarkdown(''), '');
});

// ---------- computeIconicAttractionNames ----------

test('computeIconicAttractionNames: returns empty Set for empty input', () => {
  assert.equal(computeIconicAttractionNames([]).size, 0);
  assert.equal(computeIconicAttractionNames(null).size, 0);
  assert.equal(computeIconicAttractionNames(undefined).size, 0);
});

test('computeIconicAttractionNames: returns at most `limit` names', () => {
  const attractions = Array.from({ length: 30 }, (_, i) => ({
    name: `Site ${i}`,
    type: 'Museum',
    ratings: { cultural_significance: 3 },
  }));
  const result = computeIconicAttractionNames(attractions, 12);
  assert.equal(result.size, 12);
});

test('computeIconicAttractionNames: prioritises high cultural_significance + Monument type', () => {
  // Use a larger list so the positional bonus (max 5 per index%5) can't
  // outweigh the cultural × 2 + type-priority signal.
  const attractions = [
    { name: 'Boring Cafe', type: 'Cafe', ratings: { cultural_significance: 0 } },
    { name: 'Random Park', type: 'Park', ratings: { cultural_significance: 0 } },
    { name: 'Eiffel Tower', type: 'Monument', ratings: { cultural_significance: 5 } },
    { name: 'Notre-Dame', type: 'Cathedral', ratings: { cultural_significance: 5 } },
  ];
  const result = computeIconicAttractionNames(attractions, 2);
  assert.ok(result.has('Eiffel Tower'), 'Eiffel Tower in top 2');
  assert.ok(result.has('Notre-Dame'), 'Notre-Dame in top 2');
  assert.ok(!result.has('Boring Cafe'), 'Boring Cafe excluded from top 2');
});

test('computeIconicAttractionNames: skips entries without names', () => {
  const attractions = [
    { name: null, type: 'Museum', ratings: { cultural_significance: 5 } },
    { name: '', type: 'Museum', ratings: { cultural_significance: 5 } },
    { name: 'Real Site', type: 'Museum', ratings: { cultural_significance: 5 } },
  ];
  const result = computeIconicAttractionNames(attractions, 5);
  assert.equal(result.size, 1);
  assert.ok(result.has('Real Site'));
});

// ---------- getAttractionCoords ----------

test('getAttractionCoords: reads nested coordinates.{longitude,latitude}', () => {
  assert.deepEqual(
    getAttractionCoords({ coordinates: { longitude: 2.34, latitude: 48.86 } }),
    [2.34, 48.86],
  );
});

test('getAttractionCoords: reads nested coordinates.{lng,lat}', () => {
  assert.deepEqual(
    getAttractionCoords({ coordinates: { lng: 2.34, lat: 48.86 } }),
    [2.34, 48.86],
  );
});

test('getAttractionCoords: falls back to top-level longitude/latitude', () => {
  assert.deepEqual(getAttractionCoords({ longitude: 2.34, latitude: 48.86 }), [2.34, 48.86]);
});

test('getAttractionCoords: returns null when no coords are present', () => {
  assert.equal(getAttractionCoords({}), null);
  assert.equal(getAttractionCoords(null), null);
  assert.equal(getAttractionCoords({ coordinates: {} }), null);
});
