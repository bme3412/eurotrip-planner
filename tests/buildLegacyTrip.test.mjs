import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildLegacyTrip } from '../src/components/planner-v2/threeColumn/buildLegacyTrip.js';

test('buildLegacyTrip: picks start/end/stops by role', () => {
  const tripState = {
    route: {
      cities: [
        { id: 'par', role: 'start', nights: 3 },
        { id: 'lyo', role: 'stop', nights: 2 },
        { id: 'mil', role: 'stop', nights: 2 },
        { id: 'rom', role: 'end', nights: 4 },
      ],
    },
    dates: { totalNights: 11 },
  };
  const trip = buildLegacyTrip(tripState);
  assert.equal(trip.startCity.id, 'par');
  assert.equal(trip.endCity.id, 'rom');
  assert.deepEqual(trip.stops.map((c) => c.id), ['lyo', 'mil']);
});

test('buildLegacyTrip: falls back to first city if no start role', () => {
  const tripState = {
    route: { cities: [{ id: 'par', nights: 3 }, { id: 'lyo', nights: 2 }] },
    dates: {},
  };
  const trip = buildLegacyTrip(tripState);
  assert.equal(trip.startCity.id, 'par');
  assert.equal(trip.endCity, null);
});

test('buildLegacyTrip: daysPerCity only includes cities with nights', () => {
  const tripState = {
    route: {
      cities: [
        { id: 'par', role: 'start', nights: 3 },
        { id: 'lyo', role: 'stop' },
        { id: 'rom', role: 'end', nights: 4 },
      ],
    },
    dates: { totalNights: 7 },
  };
  const trip = buildLegacyTrip(tripState);
  assert.deepEqual(trip.daysPerCity, { par: 3, rom: 4 });
});

test('buildLegacyTrip: copies dates + totalDays from tripState.dates.totalNights', () => {
  const tripState = {
    route: { cities: [] },
    dates: { startDate: '2026-04-12', totalNights: 9 },
  };
  const trip = buildLegacyTrip(tripState);
  assert.equal(trip.totalDays, 9);
  assert.equal(trip.dates.startDate, '2026-04-12');
});

test('buildLegacyTrip: handles missing route/dates gracefully', () => {
  const trip = buildLegacyTrip({});
  assert.equal(trip.startCity, null);
  assert.equal(trip.endCity, null);
  assert.deepEqual(trip.stops, []);
  assert.deepEqual(trip.daysPerCity, {});
  assert.equal(trip.totalDays, undefined);
});

test('buildLegacyTrip: handles null input', () => {
  const trip = buildLegacyTrip(null);
  assert.equal(trip.startCity, null);
  assert.deepEqual(trip.stops, []);
});
