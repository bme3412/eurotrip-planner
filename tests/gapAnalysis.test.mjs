import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initialTripState, mergeTripData } from '../src/lib/conversation/tripState.js';
import { analyzeGaps, buildAgentContext } from '../src/lib/conversation/gapAnalysis.js';

test('analyzeGaps flags cities as critical for an empty trip', () => {
  const result = analyzeGaps(initialTripState);
  assert.equal(result.isReadyToFinalize, false);
  assert.equal(result.nextMove?.field, 'cities');
  assert.equal(result.nextMove?.canDraft, false);
  assert.equal(result.draftReadiness, 'needs_anchor');
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
  assert.equal(result.canDraft, true);
  assert.equal(result.draftReadiness, 'draft_with_assumptions');
  assert.equal(result.nextMove.field, 'tripIntent');
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
  assert.equal(result.canDraft, true);
});

test('buildAgentContext renders living brief + next best move in a single string', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
    totalNights: 4,
    tripIntent: 'food-focused first Europe stop',
    negativeConstraints: ['no early mornings'],
  });
  const ctx = buildAgentContext(seeded);
  assert.match(ctx, /Living Travel Brief/);
  assert.match(ctx, /Route: Paris/);
  assert.match(ctx, /Duration: 4 nights/);
  assert.match(ctx, /Trip intent: food-focused first Europe stop/);
  assert.match(ctx, /Avoid: no early mornings/);
  assert.match(ctx, /Intake Map/);
  assert.match(ctx, /Next Best Move/);
});

test('travel brief captures natural-language intent and constraints', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Barcelona' }],
    tripIntent: 'romantic food trip',
    intentSignals: ['late dinners', 'walkable neighborhoods'],
    hardConstraints: ['must end before June 20'],
    negativeConstraints: ['no rental car'],
    assumptions: ['moderate budget unless changed'],
  });

  const result = analyzeGaps(seeded);
  assert.equal(result.intake.tripIntent.status, 'confirmed');
  assert.match(result.intake.tripIntent.summary, /romantic food trip/);
  assert.equal(result.intake.negativeConstraints.status, 'confirmed');
  assert.match(result.intake.confidenceAssumptions.summary, /moderate budget/);
});
