import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initialTripState, mergeTripData } from '../src/lib/conversation/tripState.js';
import { analyzeGaps } from '../src/lib/conversation/gapAnalysis.js';

/**
 * Invariant: completeness is derived from hardFilled only.
 * A field that has a smart default (softFilled) but no user input should
 * still appear in `gaps` and NOT be counted as complete.
 */

const TRACKED = ['cities', 'duration', 'dates', 'interests', 'budget', 'travelers'];

test('empty trip: nothing is hardFilled, completeness is 0', () => {
  const r = analyzeGaps(initialTripState);
  assert.deepEqual(r.hardFilled, []);
  assert.equal(r.completeness, 0);
  // Duration + dates have smart defaults and are tracked in softFilled even
  // when there are no cities yet (though we don't surface them as gaps until
  // the user has at least one city).
  assert.ok(r.softFilled.includes('duration'));
  assert.ok(r.softFilled.includes('dates'));
});

test('adding only cities: duration + dates are soft-filled, not hard', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris', country: 'France' }],
  });
  const r = analyzeGaps(seeded);
  assert.ok(r.hardFilled.includes('cities'));
  assert.ok(!r.hardFilled.includes('duration'));
  assert.ok(!r.hardFilled.includes('dates'));
  assert.ok(r.softFilled.includes('duration'));
  assert.ok(r.softFilled.includes('dates'));
  assert.equal(r.completeness, Math.round((1 / TRACKED.length) * 100));
});

test('invariant: any field present in gaps is NOT in hardFilled', () => {
  const states = [
    initialTripState,
    mergeTripData(initialTripState, { cities: [{ name: 'Paris' }] }),
    mergeTripData(initialTripState, {
      cities: [{ name: 'Paris' }, { name: 'Rome' }],
      totalNights: 10,
    }),
    mergeTripData(initialTripState, {
      cities: [{ name: 'Paris' }],
      totalNights: 5,
      startDate: '2026-05-01',
      endDate: '2026-05-06',
      interests: ['food'],
    }),
  ];

  for (const state of states) {
    const r = analyzeGaps(state);
    for (const gap of r.gaps) {
      assert.ok(
        !r.hardFilled.includes(gap.field),
        `field "${gap.field}" appears in both gaps and hardFilled for state ${JSON.stringify(state.route.cities)}`
      );
    }
  }
});

test('completeness never exceeds 100 and matches hardFilled / tracked ratio', () => {
  const full = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }, { name: 'Rome' }],
    totalNights: 7,
    startDate: '2026-05-01',
    endDate: '2026-05-08',
    interests: ['food', 'culture'],
    budget: { style: 'moderate' },
    travelers: { count: 2, groupType: 'couple' },
  });
  const r = analyzeGaps(full);
  assert.ok(r.completeness <= 100);
  assert.ok(r.completeness >= 0);
  const expected = Math.round(
    (TRACKED.filter((f) => r.hardFilled.includes(f)).length / TRACKED.length) * 100
  );
  assert.equal(r.completeness, expected);
});

test('dates become hardFilled when flexibleMonth is set (no explicit date range)', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
    flexibleMonth: 'May',
  });
  const r = analyzeGaps(seeded);
  assert.ok(r.hardFilled.includes('dates'));
  assert.ok(!r.softFilled.includes('dates'));
  assert.ok(!r.gaps.some((g) => g.field === 'dates'));
});

test('duration is hardFilled when per-city nights are set even without totalNights', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris', nights: 3 }, { name: 'Rome', nights: 4 }],
  });
  const r = analyzeGaps(seeded);
  assert.ok(r.hardFilled.includes('duration'));
  assert.ok(!r.gaps.some((g) => g.field === 'duration'));
});
