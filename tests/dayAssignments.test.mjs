import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initialTripState, mergeTripData } from '../src/lib/conversation/tripState.js';
import {
  toIsoDate,
  parseIsoDate,
  addDays,
  getTripDayCount,
  buildDayAssignments,
  applyDayAssignments,
  assignDaysToCity,
  unassignDays,
  setCityNights,
  totalAssignedNights,
} from '../src/lib/conversation/dayAssignments.js';

function seedTrip({ startDate = '2026-05-01', endDate = '2026-05-08', cities = [] } = {}) {
  const seeded = mergeTripData(initialTripState, {
    startDate,
    endDate,
    cities,
  });
  // Ensure `id` slugs match what the helpers expect (lower-case name fallback).
  for (const c of seeded.route.cities) {
    if (!c.id) c.id = c.name.toLowerCase();
  }
  return seeded;
}

test('toIsoDate / parseIsoDate / addDays round-trip in local time', () => {
  const d = parseIsoDate('2026-05-01');
  assert.equal(toIsoDate(d), '2026-05-01');
  assert.equal(toIsoDate(addDays(d, 7)), '2026-05-08');
});

test('getTripDayCount uses start + end dates inclusive', () => {
  const trip = seedTrip(); // 2026-05-01 .. 2026-05-08 = 7 nights, 8 days
  assert.equal(getTripDayCount(trip), 8);
});

test('getTripDayCount falls back to totalNights when end is missing', () => {
  const trip = mergeTripData(initialTripState, {
    startDate: '2026-05-01',
    totalNights: 5,
  });
  // totalNights=5 -> startDate-only path returns totalNights+1
  assert.equal(getTripDayCount(trip), 6);
});

test('buildDayAssignments derives day-by-day view from city nights', () => {
  const trip = seedTrip({
    cities: [
      { name: 'Paris', nights: 3 },
      { name: 'Rome', nights: 4 },
    ],
  });
  const days = buildDayAssignments(trip);
  assert.equal(days.length, 8);
  assert.deepEqual(
    days.map((d) => d.cityName),
    ['Paris', 'Paris', 'Paris', 'Rome', 'Rome', 'Rome', 'Rome', null] // last day is the departure morning
  );
  assert.equal(days[0].date, '2026-05-01');
  assert.equal(days[7].date, '2026-05-08');
});

test('buildDayAssignments leaves middle gap days unassigned', () => {
  const trip = seedTrip({
    cities: [
      { name: 'Paris', nights: 2 },
      { name: 'Rome', nights: 3 },
    ],
  });
  // Trip is 7 nights; cities cover only 5. Middle of trip is well-defined,
  // gap shows as null at the tail (between Rome and the trip end).
  const days = buildDayAssignments(trip);
  const cityNames = days.map((d) => d.cityName);
  assert.equal(cityNames[0], 'Paris');
  assert.equal(cityNames[1], 'Paris');
  assert.equal(cityNames[2], 'Rome');
  assert.equal(cityNames[4], 'Rome');
  // remaining days (5,6,7) are gap days
  assert.equal(cityNames[5], null);
  assert.equal(cityNames[6], null);
  assert.equal(cityNames[7], null);
});

test('assignDaysToCity moves days from one city to another', () => {
  const trip = seedTrip({
    cities: [
      { name: 'Paris', nights: 3 },
      { name: 'Rome', nights: 4 },
    ],
  });
  // Move days 2,3 (currently Paris/Rome) entirely to Rome.
  const moved = assignDaysToCity(trip, [2, 3], 'rome');
  const days = buildDayAssignments(moved);
  const cityNames = days.map((d) => d.cityName);
  assert.deepEqual(cityNames.slice(0, 2), ['Paris', 'Paris']);
  assert.equal(cityNames[2], 'Rome');
  assert.equal(cityNames[3], 'Rome');
  // Paris should now own only 2 nights, Rome should own 5.
  const paris = moved.route.cities.find((c) => c.id === 'paris');
  const rome = moved.route.cities.find((c) => c.id === 'rome');
  assert.equal(paris.nights, 2);
  assert.equal(rome.nights, 5);
  // Round-trip: building days again then applying should be idempotent.
  const round = applyDayAssignments(moved, buildDayAssignments(moved));
  assert.equal(round.route.cities.find((c) => c.id === 'paris').nights, 2);
  assert.equal(round.route.cities.find((c) => c.id === 'rome').nights, 5);
});

test('unassignDays creates gap days and reduces city nights', () => {
  const trip = seedTrip({
    cities: [
      { name: 'Paris', nights: 3 },
      { name: 'Rome', nights: 4 },
    ],
  });
  const next = unassignDays(trip, [1, 2]);
  const days = buildDayAssignments(next);
  // Paris keeps day 0, then days 1-2 are gap, then Rome runs.
  assert.equal(days[0].cityName, 'Paris');
  assert.equal(days[1].cityName, null);
  assert.equal(days[2].cityName, null);
  // Rome's start shifts since Paris shrank to 1 night and gap days don't
  // contribute to any city; nights values should reflect that.
  const paris = next.route.cities.find((c) => c.id === 'paris');
  assert.equal(paris.nights, 1);
});

test('setCityNights reflows downstream arrival/departure dates', () => {
  const trip = seedTrip({
    cities: [
      { name: 'Paris', nights: 3 },
      { name: 'Rome', nights: 4 },
    ],
  });
  const next = setCityNights(trip, 'paris', 5);
  const paris = next.route.cities.find((c) => c.id === 'paris');
  const rome = next.route.cities.find((c) => c.id === 'rome');
  assert.equal(paris.nights, 5);
  assert.equal(paris.arrivalDate, '2026-05-01');
  assert.equal(paris.departureDate, '2026-05-06');
  assert.equal(rome.arrivalDate, '2026-05-06');
});

test('totalAssignedNights sums city nights', () => {
  const trip = seedTrip({
    cities: [
      { name: 'Paris', nights: 3 },
      { name: 'Rome', nights: 4 },
    ],
  });
  assert.equal(totalAssignedNights(trip), 7);
});

test('mergeTripData + assignDaysToCity round-trip is stable', () => {
  // Add a third city through mergeTripData, then redistribute days.
  let trip = seedTrip({
    cities: [
      { name: 'Paris', nights: 2 },
      { name: 'Rome', nights: 3 },
    ],
  });
  trip = mergeTripData(trip, { cities: [{ name: 'Florence', nights: 2 }] });
  for (const c of trip.route.cities) {
    if (!c.id) c.id = c.name.toLowerCase();
  }
  // Trip window stays 8 days; Florence sits between Rome days.
  trip = assignDaysToCity(trip, [3, 4], 'florence');
  const days = buildDayAssignments(trip);
  const sequence = days.map((d) => d.cityName);
  assert.equal(sequence[0], 'Paris');
  assert.equal(sequence[3], 'Florence');
  assert.equal(sequence[4], 'Florence');
});
