import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllTips,
  getOverallScore,
  buildDirectionsUrl,
} from '../src/components/city-guides/attractions/lib/display.js';

// ---------- getAllTips ----------

test('getAllTips: returns ALL data-supplied tips (not capped, unlike generateTips)', () => {
  const tips = getAllTips({ tips: ['One', 'Two', 'Three', 'Four'] });
  assert.deepEqual(tips, ['One', 'Two', 'Three', 'Four']);
});

test('getAllTips: drops falsy entries', () => {
  assert.deepEqual(getAllTips({ tips: ['One', '', null, 'Two'] }), ['One', 'Two']);
});

test('getAllTips: falls back to generated heuristics when no data tips', () => {
  const tips = getAllTips({ best_time: 'morning' });
  assert.equal(tips.length, 1);
  assert.match(tips[0], /Morning visits/);
});

test('getAllTips: empty when nothing applies', () => {
  assert.deepEqual(getAllTips({}), []);
});

// ---------- getOverallScore ----------

test('getOverallScore: averages factor scores excluding total_score', () => {
  const score = getOverallScore({ factorScores: { a: 8, b: 10, c: 6 } });
  assert.equal(score, 8); // (8+10+6)/3
});

test('getOverallScore: ignores total_score in the mean', () => {
  const score = getOverallScore({ factorScores: { a: 9, b: 9, total_score: 1 } });
  assert.equal(score, 9);
});

test('getOverallScore: rounds to one decimal', () => {
  const score = getOverallScore({ scores: { a: 8, b: 9 } }); // 8.5
  assert.equal(score, 8.5);
  const score2 = getOverallScore({ scores: { a: 8, b: 8, c: 9 } }); // 8.333 -> 8.3
  assert.equal(score2, 8.3);
});

test('getOverallScore: clamps out-of-range factor values to 0–10', () => {
  // 12 clamps to 10 -> (10 + 8) / 2 = 9
  assert.equal(getOverallScore({ factorScores: { a: 12, b: 8 } }), 9);
  // negative clamps to 0 -> (0 + 6) / 2 = 3
  assert.equal(getOverallScore({ factorScores: { a: -5, b: 6 } }), 3);
});

test('getOverallScore: null when no numeric scores', () => {
  assert.equal(getOverallScore({}), null);
  assert.equal(getOverallScore({ factorScores: { a: 'x', total_score: 5 } }), null);
  assert.equal(getOverallScore(null), null);
});

// ---------- buildDirectionsUrl ----------

test('buildDirectionsUrl: prefers exact coordinates', () => {
  const url = buildDirectionsUrl({ latitude: 48.8584, longitude: 2.2945 });
  assert.equal(url, 'https://www.google.com/maps/dir/?api=1&destination=48.8584,2.2945');
});

test('buildDirectionsUrl: falls back to name + city query', () => {
  const url = buildDirectionsUrl({ name: 'Eiffel Tower' }, 'Paris');
  assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1&destination='));
  assert.ok(url.includes(encodeURIComponent('Eiffel Tower, Paris')));
});

test('buildDirectionsUrl: includes address in the query fallback', () => {
  const url = buildDirectionsUrl({ name: 'Le Meurice', address: '228 Rue de Rivoli' }, 'Paris');
  assert.ok(url.includes(encodeURIComponent('Le Meurice, 228 Rue de Rivoli, Paris')));
});

test('buildDirectionsUrl: null when no coordinates and no name/address', () => {
  assert.equal(buildDirectionsUrl({}), null);
  assert.equal(buildDirectionsUrl(null), null);
});
