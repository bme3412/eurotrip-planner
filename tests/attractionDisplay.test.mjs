import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  capitalizeCity,
  normalizePlaceName,
  getPriceIcon,
  getTypeIcon,
  getSignificanceColor,
  getSeasonalScoreColor,
  overallScoreClass,
  formatDuration,
  formatCost,
  generateTips,
} from '../src/components/city-guides/attractions/lib/display.js';

test('capitalizeCity: capitalises first letter, leaves rest', () => {
  assert.equal(capitalizeCity('paris'), 'Paris');
  assert.equal(capitalizeCity('san sebastián'), 'San sebastián');
});

test('capitalizeCity: returns empty string for null/undefined', () => {
  assert.equal(capitalizeCity(null), '');
  assert.equal(capitalizeCity(undefined), '');
  assert.equal(capitalizeCity(''), '');
});

test('normalizePlaceName: lowercases and strips diacritics', () => {
  assert.equal(normalizePlaceName('Café de Flore'), 'cafe de flore');
  // Ligature 'œ' is a precomposed character (not a combining sequence),
  // so NFD does not decompose it; it falls into the non-alphanumeric branch.
  assert.equal(normalizePlaceName('Sacré-Cœur'), 'sacre c ur');
});

test('normalizePlaceName: replaces & with "and"', () => {
  assert.equal(normalizePlaceName('Pen & Paper'), 'pen and paper');
});

test('normalizePlaceName: collapses non-alphanumerics to single spaces', () => {
  assert.equal(normalizePlaceName('Notre-Dame!!  Cathedral'), 'notre dame cathedral');
});

test('normalizePlaceName: tolerates null/undefined', () => {
  assert.equal(normalizePlaceName(null), '');
  assert.equal(normalizePlaceName(undefined), '');
});

test('getPriceIcon: maps tier strings to icons', () => {
  assert.equal(getPriceIcon('free'), '🆓');
  assert.equal(getPriceIcon('Budget'), '€');
  assert.equal(getPriceIcon('low cost'), '€');
  assert.equal(getPriceIcon('moderate'), '€€');
  assert.equal(getPriceIcon('Expensive'), '€€€');
  assert.equal(getPriceIcon('premium'), '€€€');
  assert.equal(getPriceIcon('high'), '€€€');
});

test('getPriceIcon: defaults to €€ for unknown / null', () => {
  assert.equal(getPriceIcon(null), '€€');
  assert.equal(getPriceIcon('mystery'), '€€');
});

test('getTypeIcon: known types resolve to emoji', () => {
  assert.equal(getTypeIcon('museum'), '🖼️');
  assert.equal(getTypeIcon('CATHEDRAL'), '⛪');
  assert.equal(getTypeIcon('park'), '🌳');
});

test('getTypeIcon: unknown types fall back to pin', () => {
  assert.equal(getTypeIcon('asteroid'), '📍');
  assert.equal(getTypeIcon(null), '📍');
});

test('getSignificanceColor: tiered class names by score', () => {
  assert.equal(getSignificanceColor(9.5), 'bg-green-100 text-green-800');
  assert.equal(getSignificanceColor(8), 'bg-blue-100 text-blue-800');
  assert.equal(getSignificanceColor(7), 'bg-indigo-100 text-indigo-800');
  assert.equal(getSignificanceColor(5), 'bg-gray-100 text-gray-800');
  assert.equal(getSignificanceColor(null), 'bg-gray-100 text-gray-800');
});

test('getSeasonalScoreColor: tiered class names by score', () => {
  assert.equal(getSeasonalScoreColor(6), 'bg-green-100 text-green-800');
  assert.equal(getSeasonalScoreColor(4), 'bg-blue-100 text-blue-800');
  assert.equal(getSeasonalScoreColor(2), 'bg-yellow-100 text-yellow-800');
  assert.equal(getSeasonalScoreColor(0), 'bg-gray-100 text-gray-600');
});

test('overallScoreClass: returns gray for non-numeric', () => {
  assert.equal(overallScoreClass('hello'), 'bg-gray-100 text-gray-800');
  assert.equal(overallScoreClass(null), 'bg-gray-100 text-gray-800');
});

test('overallScoreClass: tiered by score', () => {
  assert.equal(overallScoreClass(9.2), 'bg-emerald-100 text-emerald-800');
  assert.equal(overallScoreClass(8), 'bg-blue-100 text-blue-800');
  assert.equal(overallScoreClass(7), 'bg-indigo-100 text-indigo-800');
  assert.equal(overallScoreClass(5), 'bg-gray-100 text-gray-800');
});

test('formatDuration: handles minutes / hours / fractional', () => {
  assert.equal(formatDuration(0.5), '30 mins');
  assert.equal(formatDuration(1), '1h');
  assert.equal(formatDuration(2), '2h');
  assert.equal(formatDuration(1.5), '1.5h');
});

test('formatDuration: returns Flexible for invalid input', () => {
  assert.equal(formatDuration(0), 'Flexible');
  assert.equal(formatDuration(-3), 'Flexible');
  assert.equal(formatDuration(null), 'Flexible');
  assert.equal(formatDuration('abc'), 'Flexible');
});

test('formatCost: free attractions render "Free"', () => {
  assert.equal(formatCost({ estimated_cost_eur: 0 }), 'Free');
  assert.equal(formatCost({ pricing_tier: 'free' }), 'Free');
  assert.equal(formatCost({ price_range: 'Free entry' }), 'Free');
  assert.equal(formatCost({ ratings: { cost_estimate: 0 } }), 'Free');
});

test('formatCost: rounds positive cost estimates', () => {
  assert.equal(formatCost({ estimated_cost_eur: 17.4 }), '~€17');
  assert.equal(formatCost({ ratings: { cost_estimate: 12.7 } }), '~€13');
});

test('formatCost: truncates long price_range labels', () => {
  const label = 'A very long verbose price range label here';
  const result = formatCost({ price_range: label });
  assert.ok(result.endsWith('…'));
  assert.ok(result.length <= 26);
});

test('formatCost: returns Varies when nothing useful', () => {
  assert.equal(formatCost({}), 'Varies');
  assert.equal(formatCost(null), 'Varies');
});

test('generateTips: prefers attraction.tips and caps at 2', () => {
  const tips = generateTips({ tips: ['One', 'Two', 'Three'] });
  assert.deepEqual(tips, ['One', 'Two']);
});

test('generateTips: derives morning tip from best_time', () => {
  const tips = generateTips({ best_time: 'morning' });
  assert.equal(tips.length, 1);
  assert.match(tips[0], /Morning visits/);
});

test('generateTips: derives sunset tip from best_time', () => {
  const tips = generateTips({ best_time: 'sunset' });
  assert.match(tips[0], /golden hour/);
});

test('generateTips: low weather independence → outdoor tip', () => {
  const tips = generateTips({ factorScores: { weather_independence: 3 } });
  assert.match(tips[0], /outdoor experience/);
});

test('generateTips: high weather independence → rainy-day tip', () => {
  const tips = generateTips({ factorScores: { weather_independence: 9 } });
  assert.match(tips[0], /rainy days/);
});

test('generateTips: free attraction → bring blanket tip', () => {
  const tips = generateTips({ estimated_cost_eur: 0 });
  assert.ok(tips.some((t) => /Free to visit/.test(t)));
});

test('generateTips: expensive attraction → book online tip', () => {
  const tips = generateTips({ estimated_cost_eur: 25 });
  assert.ok(tips.some((t) => /book online/.test(t)));
});

test('generateTips: caps derived tips at 2', () => {
  const tips = generateTips({
    best_time: 'morning',
    factorScores: {
      weather_independence: 3,
      accessibility: 3,
      crowd_management: 3,
    },
    estimated_cost_eur: 25,
  });
  assert.equal(tips.length, 2);
});

test('generateTips: returns empty array when nothing applies', () => {
  const tips = generateTips({});
  assert.deepEqual(tips, []);
});
