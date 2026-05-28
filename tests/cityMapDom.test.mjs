import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAttractionPopupHtml,
  buildSelectedPopupHtml,
} from '../src/components/city-guides/citymap/dom/popupContent.js';
import { buildMarkerInnerHtml } from '../src/components/city-guides/citymap/dom/markerFactory.js';
import { buildAttractionsGeoJson } from '../src/components/city-guides/citymap/dom/geojson.js';

// ---------- buildAttractionPopupHtml ----------

test('buildAttractionPopupHtml: includes title and standard category', () => {
  const html = buildAttractionPopupHtml({
    attraction: { name: 'Eiffel Tower', description: 'Iconic landmark.' },
    category: 'Monument',
    standardCategory: 'Attractions',
    color: '#10B981',
  });
  assert.ok(html.includes('Eiffel Tower'));
  assert.ok(html.includes('Monument'));
  assert.ok(html.includes('Attractions'));
  assert.ok(html.includes('#10B981'));
});

test('buildAttractionPopupHtml: truncates long descriptions to 120 chars', () => {
  const longDesc = 'a'.repeat(500);
  const html = buildAttractionPopupHtml({
    attraction: { name: 'Site', description: longDesc },
    category: 'Museum',
    standardCategory: 'Cultural',
    color: '#3B82F6',
  });
  // Should contain "..." truncation indicator.
  assert.ok(html.includes('...'));
});

test('buildAttractionPopupHtml: strips markdown from name + description + hours + best_time', () => {
  const html = buildAttractionPopupHtml({
    attraction: {
      name: '**Bold Name**',
      description: 'Visit *here*',
      hours: '**9-5**',
      best_time: '_morning_',
    },
    category: 'Cafe',
    standardCategory: 'Food',
    color: '#F59E0B',
  });
  assert.ok(html.includes('Bold Name'));
  assert.ok(!html.includes('**Bold Name**'));
  assert.ok(html.includes('Visit here'));
  assert.ok(html.includes('9-5'));
});

test('buildAttractionPopupHtml: shows address when provided', () => {
  const html = buildAttractionPopupHtml({
    attraction: { name: 'Cafe', address: '12 Rue de Rivoli' },
    category: 'Cafe',
    standardCategory: 'Food',
    color: '#F59E0B',
  });
  assert.ok(html.includes('12 Rue de Rivoli'));
});

test('buildAttractionPopupHtml: shows best_time when no hours present', () => {
  const html = buildAttractionPopupHtml({
    attraction: { name: 'Park', best_time: 'sunset' },
    category: 'Park',
    standardCategory: 'Outdoors',
    color: '#10B981',
  });
  assert.ok(html.includes('Best: sunset'));
});

test('buildAttractionPopupHtml: handles object-shaped ratings (score + duration)', () => {
  const html = buildAttractionPopupHtml({
    attraction: { name: 'Museum', ratings: { score: 4.5, suggested_duration_hours: 2 } },
    category: 'Museum',
    standardCategory: 'Cultural',
    color: '#3B82F6',
  });
  assert.ok(html.includes('4.5'));
  assert.ok(html.includes('2 hrs'));
});

// ---------- buildSelectedPopupHtml ----------

test('buildSelectedPopupHtml: short descriptions have no toggle button', () => {
  const result = buildSelectedPopupHtml({ name: 'Site', description: 'Short.' });
  assert.equal(result.isLongDesc, false);
  assert.ok(!result.html.includes('Read more'));
});

test('buildSelectedPopupHtml: long descriptions add a Read more button + return truncated copy', () => {
  const longDesc = 'a'.repeat(500);
  const result = buildSelectedPopupHtml({ name: 'Site', description: longDesc });
  assert.equal(result.isLongDesc, true);
  assert.ok(result.html.includes('Read more'));
  assert.equal(result.truncatedDesc.length, 183); // 180 + '...'
  assert.equal(result.cleanDesc.length, 500);
});

test('buildSelectedPopupHtml: returns a unique popupId per call', async () => {
  const a = buildSelectedPopupHtml({ name: 'A', description: 'x' });
  await new Promise((r) => setTimeout(r, 5));
  const b = buildSelectedPopupHtml({ name: 'B', description: 'y' });
  assert.notEqual(a.popupId, b.popupId);
});

// ---------- buildMarkerInnerHtml ----------

test('buildMarkerInnerHtml: includes color, index, name', () => {
  const html = buildMarkerInnerHtml({
    color: '#10B981',
    globalIndex: 7,
    name: 'Eiffel Tower',
  });
  assert.ok(html.includes('#10B981'));
  assert.ok(html.includes('>7<'));
  assert.ok(html.includes('Eiffel Tower'));
});

test('buildMarkerInnerHtml: selected variant pre-scales the container', () => {
  const html = buildMarkerInnerHtml({
    color: '#3B82F6',
    globalIndex: 1,
    name: 'X',
    selected: true,
  });
  assert.ok(html.includes('scale(1.5)'));
});

// ---------- buildAttractionsGeoJson ----------

test('buildAttractionsGeoJson: returns a FeatureCollection', () => {
  const result = buildAttractionsGeoJson([
    { name: 'A', longitude: 2.34, latitude: 48.86, category: 'Monument' },
    { name: 'B', coordinates: { lng: 2.35, lat: 48.87 }, category: 'Museum' },
  ]);
  assert.equal(result.type, 'FeatureCollection');
  assert.equal(result.features.length, 2);
  assert.equal(result.features[0].geometry.type, 'Point');
});

test('buildAttractionsGeoJson: skips attractions without coords', () => {
  const result = buildAttractionsGeoJson([
    { name: 'A', category: 'Museum' },
    { name: 'B', longitude: 2.34, latitude: 48.86, category: 'Museum' },
  ]);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.name, 'B');
});

test('buildAttractionsGeoJson: features carry category + standardCategory + color', () => {
  const result = buildAttractionsGeoJson([
    { name: 'A', longitude: 2.34, latitude: 48.86, category: 'Monument', description: 'd' },
  ]);
  const props = result.features[0].properties;
  assert.equal(props.name, 'A');
  assert.equal(props.category, 'Monument');
  assert.equal(typeof props.standardCategory, 'string');
  assert.equal(props.description, 'd');
  // Color comes from getCategoryColor — at minimum it should be a string.
  assert.equal(typeof props.color, 'string');
});

test('buildAttractionsGeoJson: empty / nullish input returns empty FeatureCollection', () => {
  assert.deepEqual(buildAttractionsGeoJson([]), { type: 'FeatureCollection', features: [] });
  assert.deepEqual(buildAttractionsGeoJson(null), { type: 'FeatureCollection', features: [] });
});
