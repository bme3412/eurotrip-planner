import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initialTripState, mergeTripData } from '../src/lib/conversation/tripState.js';
import { analyzeGaps, buildAgentContext } from '../src/lib/conversation/gapAnalysis.js';

test('analyzeGaps flags cities as critical for an empty trip', () => {
  const result = analyzeGaps(initialTripState);
  assert.equal(result.isReadyToFinalize, false);
  assert.equal(result.nextQuestion?.field, 'cities');
  assert.ok(result.gaps.some((g) => g.field === 'cities' && g.critical));
  // Duration is no longer critical — it gets smart defaults
  assert.ok(!result.gaps.some((g) => g.critical && g.field === 'duration'));
});

test('analyzeGaps drops the cities gap once a city is added', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
    totalNights: 5,
  });
  const result = analyzeGaps(seeded);
  assert.ok(!result.gaps.some((g) => g.field === 'cities'));
  assert.ok(!result.gaps.some((g) => g.field === 'duration'));
  assert.ok(result.completeness > 0);
});

test('analyzeGaps reports isReadyToFinalize when all critical gaps are filled and >= 40% complete', () => {
  const fullEnough = mergeTripData(initialTripState, {
    cities: [
      { name: 'Paris', country: 'France' },
      { name: 'Rome', country: 'Italy' },
    ],
    totalNights: 7,
    routeShape: 'one-way',
    startDate: '2026-05-01',
    endDate: '2026-05-08',
    transportPreference: 'train',
    budget: { style: 'moderate' },
  });
  const result = analyzeGaps(fullEnough);
  assert.equal(result.isReadyToFinalize, true);
});

test('buildAgentContext renders trip state + gaps in a single string', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
    totalNights: 4,
  });
  const ctx = buildAgentContext(seeded);
  assert.match(ctx, /Trip State \(\d+% specified\)/);
  assert.match(ctx, /Route: Paris/);
  assert.match(ctx, /Duration: 4 nights/);
  assert.match(ctx, /Info to Weave In/);
});
