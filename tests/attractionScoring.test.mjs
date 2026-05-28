import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_SEASONAL_SCORE,
  clamp01,
  normalizeValue,
  computeAggregateFactors,
  getPriceRangeScore,
  getRawMetrics,
  computeScoringBounds,
  getLensScore,
  getSeasonalScore,
  matchesCuratedFilter,
  getMonthFromDate,
  isDateInRange,
} from '../src/components/city-guides/attractions/lib/scoring.js';

test('clamp01: clamps to [0, 1]', () => {
  assert.equal(clamp01(-0.5), 0);
  assert.equal(clamp01(0), 0);
  assert.equal(clamp01(0.7), 0.7);
  assert.equal(clamp01(1), 1);
  assert.equal(clamp01(1.5), 1);
});

test('normalizeValue: maps value linearly into [0, 1]', () => {
  assert.equal(normalizeValue(5, { min: 0, max: 10 }), 0.5);
  assert.equal(normalizeValue(0, { min: 0, max: 10 }), 0);
  assert.equal(normalizeValue(10, { min: 0, max: 10 }), 1);
});

test('normalizeValue: clamps out-of-range values', () => {
  assert.equal(normalizeValue(-2, { min: 0, max: 10 }), 0);
  assert.equal(normalizeValue(15, { min: 0, max: 10 }), 1);
});

test('normalizeValue: returns 0.5 for degenerate bounds', () => {
  assert.equal(normalizeValue(5, { min: 5, max: 5 }), 0.5);
});

test('normalizeValue: returns null for non-numeric / missing bounds', () => {
  assert.equal(normalizeValue('abc', { min: 0, max: 10 }), null);
  assert.equal(normalizeValue(NaN, { min: 0, max: 10 }), null);
  assert.equal(normalizeValue(5, null), null);
  assert.equal(normalizeValue(5, { min: Infinity, max: 10 }), null);
});

test('computeAggregateFactors: averages declared factor groups', () => {
  const agg = computeAggregateFactors({
    cultural_historical_significance: 9,
    uniqueness_to_paris: 8,
    educational_value: 7,
    visitor_experience_quality: 8,
    crowd_management: 6,
    family_friendliness: 7,
    photo_instagram_appeal: 9,
    accessibility: 7,
    weather_independence: 6,
    value_for_money: 8,
  });
  assert.equal(agg.culturalValue, 8);
  assert.equal(agg.experienceQuality, 7.5);
  assert.equal(agg.practicalEase, 7);
});

test('computeAggregateFactors: returns null for missing input', () => {
  assert.equal(computeAggregateFactors(null), null);
  assert.equal(computeAggregateFactors('abc'), null);
});

test('computeAggregateFactors: ignores non-numeric factor entries', () => {
  const agg = computeAggregateFactors({
    cultural_historical_significance: 'high',
    uniqueness_to_paris: 8,
    educational_value: 6,
  });
  assert.equal(agg.culturalValue, 7);
  assert.equal(agg.experienceQuality, null);
});

test('getPriceRangeScore: ranks tiers consistently', () => {
  assert.ok(getPriceRangeScore('free') > getPriceRangeScore('budget'));
  assert.ok(getPriceRangeScore('budget') > getPriceRangeScore('moderate'));
  assert.ok(getPriceRangeScore('moderate') > getPriceRangeScore('premium'));
});

test('getPriceRangeScore: returns neutral score for unknown / null', () => {
  assert.equal(getPriceRangeScore(null), 5);
  assert.equal(getPriceRangeScore('mystery'), 5);
});

test('getRawMetrics: prefers aggregates over fallbacks', () => {
  const metrics = getRawMetrics({
    compositeScore: 7,
    aggregates: { culturalValue: 9, experienceQuality: 8, practicalEase: 6 },
    ratings: { cultural_significance: 4 },
    factorScores: { visitor_experience_quality: 5 },
  });
  assert.equal(metrics.cultural, 9);
  assert.equal(metrics.experience, 8);
  assert.equal(metrics.practical, 6);
  assert.equal(metrics.composite, 7);
});

test('getRawMetrics: falls back to ratings then composite when aggregates missing', () => {
  const metrics = getRawMetrics({
    compositeScore: 7,
    ratings: { cultural_significance: 8 },
  });
  assert.equal(metrics.cultural, 8);
  assert.equal(metrics.experience, 7);
});

test('getRawMetrics: returns all nulls for bogus input', () => {
  assert.deepEqual(getRawMetrics(null), {
    cultural: null, experience: null, practical: null, composite: null,
  });
});

test('computeScoringBounds: produces min/max per metric', () => {
  const bounds = computeScoringBounds([
    { compositeScore: 5, aggregates: { culturalValue: 4, experienceQuality: 6, practicalEase: 5 } },
    { compositeScore: 9, aggregates: { culturalValue: 8, experienceQuality: 9, practicalEase: 7 } },
    { compositeScore: 7, aggregates: { culturalValue: 6, experienceQuality: 7, practicalEase: 6 } },
  ]);
  assert.deepEqual(bounds.cultural, { min: 4, max: 8 });
  assert.deepEqual(bounds.experience, { min: 6, max: 9 });
  assert.deepEqual(bounds.practical, { min: 5, max: 7 });
  assert.deepEqual(bounds.composite, { min: 5, max: 9 });
});

test('computeScoringBounds: empty input → all nulls', () => {
  const bounds = computeScoringBounds([]);
  assert.equal(bounds.cultural, null);
  assert.equal(bounds.composite, null);
});

test('getLensScore: returns 0 for bogus input', () => {
  assert.equal(getLensScore(null), 0);
});

test('getLensScore: balanced lens weights three axes', () => {
  const bounds = {
    cultural: { min: 0, max: 10 },
    experience: { min: 0, max: 10 },
    practical: { min: 0, max: 10 },
    composite: { min: 0, max: 10 },
  };
  const score = getLensScore(
    { aggregates: { culturalValue: 10, experienceQuality: 10, practicalEase: 10 }, compositeScore: 10 },
    { rankingLens: 'overall', scoringBounds: bounds },
  );
  assert.ok(score > 9.5);
  assert.ok(score <= 10);
});

test('getLensScore: cultural lens prioritises cultural axis', () => {
  const bounds = {
    cultural: { min: 0, max: 10 },
    experience: { min: 0, max: 10 },
    practical: { min: 0, max: 10 },
    composite: { min: 0, max: 10 },
  };
  const culturalScore = getLensScore(
    { aggregates: { culturalValue: 10, experienceQuality: 0, practicalEase: 0 }, compositeScore: 3 },
    { rankingLens: 'cultural', scoringBounds: bounds },
  );
  const balancedScore = getLensScore(
    { aggregates: { culturalValue: 10, experienceQuality: 0, practicalEase: 0 }, compositeScore: 3 },
    { rankingLens: 'overall', scoringBounds: bounds },
  );
  assert.ok(culturalScore > balancedScore);
});

test('getLensScore: iconic keyword in name boosts score', () => {
  const bounds = {
    cultural: { min: 0, max: 10 },
    experience: { min: 0, max: 10 },
    practical: { min: 0, max: 10 },
    composite: { min: 0, max: 10 },
  };
  const plain = getLensScore(
    { name: 'Local Bistro', aggregates: { culturalValue: 5, experienceQuality: 5, practicalEase: 5 } },
    { rankingLens: 'overall', scoringBounds: bounds },
  );
  const iconic = getLensScore(
    { name: 'Eiffel Tower', aggregates: { culturalValue: 5, experienceQuality: 5, practicalEase: 5 } },
    { rankingLens: 'overall', scoringBounds: bounds },
  );
  assert.ok(iconic > plain);
});

test('getLensScore: dateFilterType folds in seasonal score', () => {
  const bounds = {
    cultural: { min: 0, max: 10 },
    experience: { min: 0, max: 10 },
    practical: { min: 0, max: 10 },
    composite: { min: 0, max: 10 },
  };
  const noDate = getLensScore(
    { aggregates: { culturalValue: 5, experienceQuality: 5, practicalEase: 5 } },
    { rankingLens: 'overall', scoringBounds: bounds, dateFilterType: 'none', seasonalScore: MAX_SEASONAL_SCORE },
  );
  const withDate = getLensScore(
    { aggregates: { culturalValue: 5, experienceQuality: 5, practicalEase: 5 } },
    { rankingLens: 'overall', scoringBounds: bounds, dateFilterType: 'month', seasonalScore: MAX_SEASONAL_SCORE },
  );
  // With perfect seasonal match the date-filtered score should rise above the base.
  assert.ok(withDate >= noDate);
});

test('getLensScore: result is always within [0, 10]', () => {
  const bounds = {
    cultural: { min: 0, max: 10 },
    experience: { min: 0, max: 10 },
    practical: { min: 0, max: 10 },
    composite: { min: 0, max: 10 },
  };
  const cases = [
    { name: 'Eiffel', aggregates: { culturalValue: 10, experienceQuality: 10, practicalEase: 10 }, themes: ['art', 'history', 'views', 'food'] },
    { aggregates: { culturalValue: 0, experienceQuality: 0, practicalEase: 0 }, themes: ['hidden_gem'] },
    { aggregates: { culturalValue: 5, experienceQuality: 5, practicalEase: 5 } },
  ];
  for (const c of cases) {
    const s = getLensScore(c, { rankingLens: 'overall', scoringBounds: bounds });
    assert.ok(s >= 0 && s <= 10, `score ${s} out of range`);
  }
});

test('getSeasonalScore: returns 0 for "all" or missing input', () => {
  assert.equal(getSeasonalScore({}, 'all', {}), 0);
  assert.equal(getSeasonalScore(null, 'june', {}), 0);
  assert.equal(getSeasonalScore({}, 'june', null), 0);
});

test('getSeasonalScore: rewards outdoor attractions in mild weather', () => {
  const monthlyData = {
    June: {
      first_half: {
        weather: { average_temperature: { high_celsius: 22, low_celsius: 14 } },
      },
    },
  };
  const score = getSeasonalScore({ indoor: false }, 'june', monthlyData);
  assert.ok(score >= 3, `expected high score, got ${score}`);
});

test('getSeasonalScore: matches seasonal_notes keywords by month', () => {
  const monthlyData = { December: { first_half: { weather: {} } } };
  const score = getSeasonalScore(
    { seasonal_notes: 'Festive christmas market with snow' },
    'december',
    monthlyData,
  );
  assert.ok(score >= 2);
});

test('matchesCuratedFilter: "all" matches everything', () => {
  assert.equal(matchesCuratedFilter({}, 'all'), true);
});

test('matchesCuratedFilter: must-do matches high score or iconic name', () => {
  assert.equal(matchesCuratedFilter({ compositeScore: 9 }, 'must-do'), true);
  assert.equal(matchesCuratedFilter({ name: 'Eiffel Tower', compositeScore: 4 }, 'must-do'), true);
  assert.equal(matchesCuratedFilter({ name: 'Bistro', compositeScore: 4 }, 'must-do'), false);
});

test('matchesCuratedFilter: free matches multiple free indicators', () => {
  assert.equal(matchesCuratedFilter({ estimated_cost_eur: 0 }, 'free'), true);
  assert.equal(matchesCuratedFilter({ pricing_tier: 'free' }, 'free'), true);
  assert.equal(matchesCuratedFilter({ price_range: 'Free entry' }, 'free'), true);
  assert.equal(matchesCuratedFilter({ estimated_cost_eur: 10 }, 'free'), false);
});

test('matchesCuratedFilter: rainy needs weather_independence ≥ 7', () => {
  assert.equal(
    matchesCuratedFilter({ factorScores: { weather_independence: 8 } }, 'rainy'),
    true,
  );
  assert.equal(
    matchesCuratedFilter({ factorScores: { weather_independence: 4 } }, 'rainy'),
    false,
  );
});

test('matchesCuratedFilter: family needs family_friendliness ≥ 7', () => {
  assert.equal(
    matchesCuratedFilter({ factorScores: { family_friendliness: 8 } }, 'family'),
    true,
  );
  assert.equal(
    matchesCuratedFilter({ factorScores: { family_friendliness: 5 } }, 'family'),
    false,
  );
});

test('matchesCuratedFilter: unknown filter passes through as true', () => {
  assert.equal(matchesCuratedFilter({}, 'mystery'), true);
});

test('getMonthFromDate: extracts lowercase month name', () => {
  // Use mid-month dates to avoid local-vs-UTC timezone edge cases.
  assert.equal(getMonthFromDate('2026-04-15'), 'april');
  assert.equal(getMonthFromDate('2026-12-15'), 'december');
});

test('getMonthFromDate: null input returns null', () => {
  assert.equal(getMonthFromDate(null), null);
  assert.equal(getMonthFromDate(''), null);
});

test('isDateInRange: inclusive on both ends', () => {
  assert.equal(isDateInRange('2026-05-01', '2026-05-01', '2026-05-31'), true);
  assert.equal(isDateInRange('2026-05-31', '2026-05-01', '2026-05-31'), true);
  assert.equal(isDateInRange('2026-05-15', '2026-05-01', '2026-05-31'), true);
});

test('isDateInRange: outside range', () => {
  assert.equal(isDateInRange('2026-04-30', '2026-05-01', '2026-05-31'), false);
  assert.equal(isDateInRange('2026-06-01', '2026-05-01', '2026-05-31'), false);
});

test('isDateInRange: missing args → false', () => {
  assert.equal(isDateInRange(null, '2026-05-01', '2026-05-31'), false);
  assert.equal(isDateInRange('2026-05-15', null, '2026-05-31'), false);
  assert.equal(isDateInRange('2026-05-15', '2026-05-01', null), false);
});
