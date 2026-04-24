import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initialTripState, mergeTripData } from '../src/lib/conversation/tripState.js';
import { analyzeGaps, buildAgentContext } from '../src/lib/conversation/gapAnalysis.js';

test('analyzeGaps flags cities and duration as critical for an empty trip', () => {
  const result = analyzeGaps(initialTripState);
  // routeShape (1-city) and transport (multi-city) gaps are skipped when there are 0 cities,
  // so completeness is 2/9 ≈ 22%, not 0.
  assert.ok(result.completeness > 0 && result.completeness < 30);
  assert.equal(result.isReadyToFinalize, false);
  assert.equal(result.nextQuestion?.field, 'cities');
  assert.ok(result.gaps.some((g) => g.field === 'cities' && g.critical));
  assert.ok(result.gaps.some((g) => g.field === 'duration' && g.critical));
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

test('buildAgentContext renders trip state + next ask in a single string', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
    totalNights: 4,
  });
  const ctx = buildAgentContext(seeded);
  assert.match(ctx, /Trip State \(\d+% complete\)/);
  assert.match(ctx, /Route: Paris/);
  assert.match(ctx, /Duration: 4 nights/);
  assert.match(ctx, /NEXT ASK:/);
});
