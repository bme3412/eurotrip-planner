import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  initialTripState,
  mergeTripData,
  removeCities,
  setCityAccommodation,
} from '../src/lib/conversation/tripState.js';

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

test('removeCities drops the named city and reflows order/roles', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [
      { name: 'Paris', nights: 3 },
      { name: 'Menton', nights: 3 },
      { name: 'Berlin', nights: 3 },
      { name: 'Nice', nights: 3 },
    ],
  });
  const after = removeCities(seeded, ['menton']);
  assert.equal(after.route.cities.length, 3);
  assert.deepEqual(
    after.route.cities.map((c) => c.name),
    ['Paris', 'Berlin', 'Nice'],
  );
  assert.deepEqual(
    after.route.cities.map((c) => c.order),
    [0, 1, 2],
  );
  assert.equal(after.route.cities[0].role, 'start');
  assert.equal(after.route.cities[1].role, 'stop');
  assert.equal(after.route.cities[2].role, 'end');
});

test('removeCities re-derives arrival/departure dates from trip start', () => {
  const seeded = mergeTripData(initialTripState, {
    startDate: '2026-06-19',
    endDate: '2026-06-30',
    cities: [
      { name: 'Paris', nights: 3 },
      { name: 'Menton', nights: 3 },
      { name: 'Berlin', nights: 3 },
      { name: 'Nice', nights: 3 },
    ],
  });
  const after = removeCities(seeded, ['Menton']);
  // After removal: Paris d0-d2, Berlin d3-d5, Nice d6-d8.
  assert.equal(after.route.cities[0].arrivalDate, '2026-06-19');
  assert.equal(after.route.cities[0].departureDate, '2026-06-22');
  assert.equal(after.route.cities[1].name, 'Berlin');
  assert.equal(after.route.cities[1].arrivalDate, '2026-06-22');
  assert.equal(after.route.cities[1].departureDate, '2026-06-25');
  assert.equal(after.route.cities[2].name, 'Nice');
  assert.equal(after.route.cities[2].arrivalDate, '2026-06-25');
  assert.equal(after.route.cities[2].departureDate, '2026-06-28');
});

test('removeCities is a no-op when the city is not in the route', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }, { name: 'Rome' }],
  });
  const after = removeCities(seeded, ['lisbon']);
  assert.equal(after.route.cities.length, 2);
  assert.deepEqual(
    after.route.cities.map((c) => c.name),
    ['Paris', 'Rome'],
  );
});

test('removeCities is case-insensitive and matches by id or name', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [
      { id: 'paris', name: 'Paris' },
      { id: 'berlin', name: 'Berlin' },
    ],
  });
  const byId = removeCities(seeded, ['PARIS']);
  assert.equal(byId.route.cities.length, 1);
  assert.equal(byId.route.cities[0].name, 'Berlin');

  const byName = removeCities(seeded, ['berlin']);
  assert.equal(byName.route.cities.length, 1);
  assert.equal(byName.route.cities[0].name, 'Paris');
});

test('removeCities does not mutate the input state', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }, { name: 'Berlin' }],
  });
  const before = JSON.parse(JSON.stringify(seeded));
  removeCities(seeded, ['paris']);
  assert.deepEqual(seeded, before);
});

test('removeCities collapses to a single-city route correctly', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }, { name: 'Berlin' }],
  });
  const after = removeCities(seeded, ['berlin']);
  assert.equal(after.route.cities.length, 1);
  assert.equal(after.route.cities[0].role, 'start');
});

test('setCityAccommodation patches the named city only', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }, { name: 'Berlin' }],
  });
  const after = setCityAccommodation(seeded, 'paris', {
    name: 'Hotel A',
    address: '1 rue X',
    checkIn: '15:00',
    checkOut: '11:00',
    confirmationNumber: 'ABC123',
    notes: 'Door code 4242',
  });
  assert.deepEqual(after.route.cities[0].accommodation, {
    name: 'Hotel A',
    address: '1 rue X',
    checkIn: '15:00',
    checkOut: '11:00',
    confirmationNumber: 'ABC123',
    notes: 'Door code 4242',
  });
  // Other city untouched.
  assert.equal(after.route.cities[1].accommodation ?? null, null);
});

test('setCityAccommodation merges partial patches over existing values', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
  });
  const first = setCityAccommodation(seeded, 'paris', {
    name: 'Hotel A',
    address: '1 rue X',
  });
  const second = setCityAccommodation(first, 'paris', { checkIn: '15:00' });
  assert.equal(second.route.cities[0].accommodation.name, 'Hotel A');
  assert.equal(second.route.cities[0].accommodation.address, '1 rue X');
  assert.equal(second.route.cities[0].accommodation.checkIn, '15:00');
});

test('setCityAccommodation clears a field when given empty string', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
  });
  const first = setCityAccommodation(seeded, 'paris', { name: 'Hotel A' });
  const cleared = setCityAccommodation(first, 'paris', { name: '' });
  // Single non-null field cleared -> accommodation collapses to null.
  assert.equal(cleared.route.cities[0].accommodation, null);
});

test('setCityAccommodation matches by id or case-insensitive name', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ id: 'berlin', name: 'Berlin' }],
  });
  const byId = setCityAccommodation(seeded, 'BERLIN', { name: 'Hotel B' });
  assert.equal(byId.route.cities[0].accommodation.name, 'Hotel B');

  const byName = setCityAccommodation(seeded, 'berlin', { name: 'Hotel B2' });
  assert.equal(byName.route.cities[0].accommodation.name, 'Hotel B2');
});

test('setCityAccommodation is a no-op when city is not in the route', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
  });
  const after = setCityAccommodation(seeded, 'lisbon', { name: 'Hotel X' });
  assert.equal(after, seeded);
});

test('setCityAccommodation does not mutate the input state', () => {
  const seeded = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris' }],
  });
  const before = JSON.parse(JSON.stringify(seeded));
  setCityAccommodation(seeded, 'paris', { name: 'Hotel A' });
  assert.deepEqual(seeded, before);
});
