import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleSetAccommodation } from '../src/lib/conversation/toolHandlers.js';
import { formatRouteEntry } from '../src/lib/conversation/gapAnalysis.js';

function state(cities) {
  return {
    route: { cities },
    dates: {},
    transport: { bookings: [] },
    budget: {},
    travelers: {},
    preferences: { interests: [] },
    brief: { intent: '', targetRegions: [], intentSignals: [], hardConstraints: [], negativeConstraints: [], assumptions: [], notes: [] },
  };
}

test('handleSetAccommodation records hotel + dates on the matching city', () => {
  const s = state([
    { id: 'paris', name: 'Paris', nights: 3 },
    { id: 'barcelona', name: 'Barcelona', nights: 4 },
  ]);
  const result = handleSetAccommodation(
    { cityRef: 'paris', name: 'Hotel Ritz', checkIn: '2025-06-12', checkOut: '2025-06-15' },
    s,
  );
  assert.equal(result.applied, true);
  assert.equal(result.cityRef, 'paris');
  assert.deepEqual(result.accommodation, {
    name: 'Hotel Ritz',
    checkIn: '2025-06-12',
    checkOut: '2025-06-15',
  });
  const paris = result.updatedState.route.cities.find((c) => c.id === 'paris');
  const barcelona = result.updatedState.route.cities.find((c) => c.id === 'barcelona');
  assert.equal(paris.accommodation.name, 'Hotel Ritz');
  // Other city untouched
  assert.ok(!barcelona.accommodation);
});

test('handleSetAccommodation matches by case-insensitive name when id missing', () => {
  const s = state([{ name: 'Paris', nights: 3 }]);
  const result = handleSetAccommodation(
    { cityRef: 'PARIS', address: '15 Place Vendome' },
    s,
  );
  assert.equal(result.applied, true);
  assert.equal(result.accommodation.address, '15 Place Vendome');
});

test('handleSetAccommodation returns applied:false when city is not on route', () => {
  const s = state([{ id: 'paris', name: 'Paris', nights: 3 }]);
  const result = handleSetAccommodation(
    { cityRef: 'rome', name: 'Hotel X' },
    s,
  );
  assert.equal(result.applied, false);
  assert.match(result.reason, /not on route/);
  assert.equal(result.updatedState, undefined);
});

test('handleSetAccommodation returns applied:false when cityRef is missing', () => {
  const s = state([{ id: 'paris', name: 'Paris' }]);
  const result = handleSetAccommodation({ name: 'Hotel X' }, s);
  assert.equal(result.applied, false);
  assert.match(result.reason, /missing cityRef/);
});

test('handleSetAccommodation returns applied:false when no fields are provided', () => {
  const s = state([{ id: 'paris', name: 'Paris' }]);
  const result = handleSetAccommodation({ cityRef: 'paris' }, s);
  assert.equal(result.applied, false);
  assert.match(result.reason, /no accommodation fields/);
});

test('handleSetAccommodation merges partial patches over existing accommodation', () => {
  const s = state([
    {
      id: 'paris',
      name: 'Paris',
      accommodation: { name: 'Old Hotel', address: '1 Old St', notes: 'first try' },
    },
  ]);
  const result = handleSetAccommodation(
    { cityRef: 'paris', name: 'Hotel Ritz' },
    s,
  );
  assert.equal(result.applied, true);
  assert.equal(result.accommodation.name, 'Hotel Ritz');
  assert.equal(result.accommodation.address, '1 Old St');
  assert.equal(result.accommodation.notes, 'first try');
});

test('handleSetAccommodation clears a field with empty string', () => {
  const s = state([
    {
      id: 'paris',
      name: 'Paris',
      accommodation: { name: 'Hotel Ritz', address: '15 Place Vendome' },
    },
  ]);
  const result = handleSetAccommodation(
    { cityRef: 'paris', address: '' },
    s,
  );
  assert.equal(result.applied, true);
  assert.equal(result.accommodation.name, 'Hotel Ritz');
  assert.equal(result.accommodation.address, null);
});

test('formatRouteEntry: includes nights and hotel name when present', () => {
  const city = {
    id: 'paris',
    name: 'Paris',
    nights: 3,
    accommodation: { name: 'Hotel Ritz' },
  };
  assert.equal(formatRouteEntry(city), 'Paris (3n, Hotel Ritz)');
});

test('formatRouteEntry: includes check-in/out range when present', () => {
  const city = {
    id: 'paris',
    name: 'Paris',
    nights: 3,
    accommodation: { name: 'Hotel Ritz', checkIn: '2025-06-12', checkOut: '2025-06-15' },
  };
  assert.equal(
    formatRouteEntry(city),
    'Paris (3n, Hotel Ritz, 2025-06-12 → 2025-06-15)',
  );
});

test('formatRouteEntry: includes confirmation number when present', () => {
  const city = {
    id: 'barcelona',
    name: 'Barcelona',
    accommodation: { name: 'Casa Mia', confirmationNumber: 'BCN-9931' },
  };
  assert.equal(
    formatRouteEntry(city),
    'Barcelona (Casa Mia, conf BCN-9931)',
  );
});

test('formatRouteEntry: falls back to just the name when nothing extra is set', () => {
  assert.equal(formatRouteEntry({ name: 'Paris' }), 'Paris');
  assert.equal(formatRouteEntry({ name: 'Paris', nights: 0 }), 'Paris');
});
