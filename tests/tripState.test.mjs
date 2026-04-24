import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initialTripState, mergeTripData } from '../src/lib/conversation/tripState.js';

test('initialTripState has expected top-level shape', () => {
  for (const key of ['route', 'transport', 'dates', 'budget', 'travelers', 'preferences']) {
    assert.ok(key in initialTripState, `missing top-level key ${key}`);
  }
  assert.equal(initialTripState.route.cities.length, 0);
  assert.equal(initialTripState.budget.currency, 'EUR');
});

test('mergeTripData adds new cities and assigns start/end roles', () => {
  const next = mergeTripData(initialTripState, {
    cities: [
      { name: 'Paris', country: 'France' },
      { name: 'Rome', country: 'Italy' },
    ],
  });
  assert.equal(next.route.cities.length, 2);
  assert.equal(next.route.cities[0].role, 'start');
  assert.equal(next.route.cities[1].role, 'end');
  assert.equal(next.route.cities[0].order, 0);
  assert.equal(next.route.cities[1].order, 1);
});

test('mergeTripData updates an existing city instead of duplicating', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris', country: 'France' }],
  });
  const updated = mergeTripData(seeded, {
    cities: [{ name: 'paris', nights: 4, notes: 'museum-heavy' }],
  });
  assert.equal(updated.route.cities.length, 1);
  assert.equal(updated.route.cities[0].nights, 4);
  assert.equal(updated.route.cities[0].notes, 'museum-heavy');
});

test('mergeTripData derives totalNights from start/end dates', () => {
  const next = mergeTripData(initialTripState, {
    startDate: '2026-05-01',
    endDate: '2026-05-08',
  });
  assert.equal(next.dates.totalNights, 7);
});

test('mergeTripData merges traveler languages without duplicates', () => {
  const seeded = mergeTripData(initialTripState, {
    travelers: { languages: ['en', 'fr'] },
  });
  const merged = mergeTripData(seeded, {
    travelers: { languages: ['fr', 'es'] },
  });
  assert.deepEqual([...merged.travelers.languages].sort(), ['en', 'es', 'fr']);
});

test('mergeTripData does not mutate the input state', () => {
  const before = JSON.parse(JSON.stringify(initialTripState));
  mergeTripData(initialTripState, { cities: [{ name: 'Berlin' }] });
  assert.deepEqual(initialTripState, before);
});
