import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planTripDays } from '../src/lib/planning/tripDaySchedule.js';

const dates = (r) => r.slots.map((s) => s.date);
const kinds = (r) => r.slots.map((s) => s.kind);

test('4-city 11-night trip spans 12 days ending on checkout, no inflation', () => {
  const r = planTripDays(
    [
      { nights: 3 }, // Paris
      { nights: 3 }, // Berlin
      { nights: 2 }, // Krakow
      { nights: 3 }, // Nice
    ],
    '2026-06-19',
  );
  assert.equal(r.totalDays, 12); // sum(nights)=11, +1 checkout
  assert.equal(r.slots[0].date, '2026-06-19');
  assert.equal(r.slots[r.slots.length - 1].date, '2026-06-30'); // ends Jun 30, not Jul 2
  // Dates are contiguous, one per calendar day, no gaps/dupes.
  const ds = dates(r);
  assert.equal(new Set(ds).size, ds.length);
  for (let i = 1; i < ds.length; i += 1) {
    assert.equal(
      (new Date(`${ds[i]}T00:00:00`) - new Date(`${ds[i - 1]}T00:00:00`)) / 86400000,
      1,
    );
  }
  // Day numbers are contiguous 1..12.
  assert.deepEqual(r.slots.map((s) => s.dayNumber), Array.from({ length: 12 }, (_, i) => i + 1));
});

test('travel happens on the arrival/checkout boundary date (no standalone extra day)', () => {
  const r = planTripDays([{ nights: 3 }, { nights: 3 }, { nights: 2 }, { nights: 3 }], '2026-06-19');
  const travel = r.slots.filter((s) => s.kind === 'travel');
  assert.equal(travel.length, 3); // cities - 1
  assert.deepEqual(travel.map((s) => s.date), ['2026-06-22', '2026-06-25', '2026-06-27']);
  // Each city's activity days fall within its lodging window.
  const byCity = (idx) => r.slots.filter((s) => s.kind === 'city' && s.cityIndex === idx).map((s) => s.date);
  assert.deepEqual(byCity(0), ['2026-06-19', '2026-06-20', '2026-06-21']); // Paris in 19, out 22
  assert.deepEqual(byCity(1), ['2026-06-23', '2026-06-24']); // Berlin in 22, out 25 (Jun22 = travel)
  assert.deepEqual(byCity(2), ['2026-06-26']); // Krakow in 25, out 27 (Jun25 = travel)
  assert.deepEqual(byCity(3), ['2026-06-28', '2026-06-29', '2026-06-30']); // Nice in 27, out 30
});

test('perCityActivityDays: middle cities lose the arrival day, last keeps checkout', () => {
  const r = planTripDays([{ nights: 3 }, { nights: 3 }, { nights: 2 }, { nights: 3 }], '2026-06-19');
  assert.deepEqual(r.perCityActivityDays, [3, 2, 1, 3]);
});

test('isArrival / isDeparture flags', () => {
  const r = planTripDays([{ nights: 2 }, { nights: 2 }], '2026-06-01');
  const lastCity = r.slots.filter((s) => s.kind === 'city').at(-1);
  assert.equal(lastCity.isDeparture, true);
  const firstCity = r.slots.find((s) => s.kind === 'city');
  assert.equal(firstCity.isArrival, true);
  // Exactly one departure across the trip.
  assert.equal(r.slots.filter((s) => s.isDeparture).length, 1);
});

test('single-city trip: nights+1 days, no travel slots', () => {
  const r = planTripDays([{ nights: 11 }], '2026-06-19');
  assert.equal(r.totalDays, 12);
  assert.equal(kinds(r).includes('travel'), false);
  assert.equal(r.slots.at(-1).date, '2026-06-30');
});

test('includeTransfers:false lays cities contiguous with no travel slots', () => {
  const r = planTripDays([{ nights: 3 }, { nights: 3 }], '2026-06-19', { includeTransfers: false });
  assert.equal(kinds(r).includes('travel'), false);
  assert.equal(r.totalDays, 7); // 6 nights + 1
  assert.deepEqual(r.perCityActivityDays, [3, 4]); // last keeps checkout day
});

test('1-night middle city collapses to its travel day (0 activity days)', () => {
  const r = planTripDays([{ nights: 2 }, { nights: 1 }, { nights: 2 }], '2026-06-01');
  assert.deepEqual(r.perCityActivityDays, [2, 0, 2]);
  assert.equal(r.totalDays, 6); // 5 nights + 1
  // The 1-night city is represented only by its travel slot.
  assert.equal(r.slots.filter((s) => s.kind === 'city' && s.cityIndex === 1).length, 0);
  assert.equal(r.slots.filter((s) => s.kind === 'travel' && s.cityIndex === 1).length, 1);
});
