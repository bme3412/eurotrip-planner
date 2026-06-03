import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getCityData } from '../src/lib/data-utils.js';
import { buildItinerary } from '../src/lib/planning/buildItinerary.js';
import { buildMultiCityItinerary } from '../src/lib/planning/buildMultiCityItinerary.js';

// Regression coverage for a class of bug that the unit tests previously missed:
// generation "succeeded" but produced empty days. The root cause was that the
// city-guide content lives under `<city>/sections/` while getCityData only
// looked in the city root, so attractions/neighborhoods/culinary all loaded
// empty and every day was just a "Lunch break". These tests fail loudly if the
// planner ever stops reading the real guide data again.

const paris = await getCityData('paris');

const NON_ATTRACTION_TYPES = new Set(['food_recommendation', 'neighborhood', 'event', 'transport', 'arrival']);

test('getCityData loads the sections/ guide data (not empty)', () => {
  assert.ok(Array.isArray(paris.attractions) && paris.attractions.length >= 10,
    `expected attractions from sections/, got ${paris.attractions?.length}`);
  assert.ok(Array.isArray(paris.neighborhoods) && paris.neighborhoods.length >= 3,
    `expected neighborhoods from sections/, got ${paris.neighborhoods?.length}`);
  assert.ok(paris.culinary && (paris.culinary.restaurants || paris.culinary.food_experiences),
    'expected culinary guide (alias of culinary_guide) to load');
  assert.ok(paris.overview && Object.keys(paris.overview).length > 0,
    'expected overview to load');
});

test('a generated single-city itinerary contains real attraction blocks', () => {
  const it = buildItinerary(
    { city: 'paris', start_date: '2026-05-06', end_date: '2026-05-09', pace: 'balanced', interests: ['Culture & History'] },
    paris,
  );
  const blocks = it.days.flatMap(d => d.timeBlocks).map(tb => tb.activity).filter(Boolean);
  const realAttractions = blocks.filter(a => !NON_ATTRACTION_TYPES.has(a.type));
  assert.ok(realAttractions.length >= 4,
    `expected several real attraction blocks, got ${realAttractions.length}`);
  assert.ok(realAttractions.some(a => a.coordinates),
    'real attractions should carry coordinates from the guide');
  assert.ok(it.meta.totalAttractions > 0, 'meta.totalAttractions should be > 0');
});

test('no attraction is scheduled twice within the same day', () => {
  const it = buildItinerary(
    { city: 'paris', start_date: '2026-05-06', end_date: '2026-05-10', pace: 'active', interests: [] },
    paris,
  );
  for (const day of it.days) {
    const names = day.timeBlocks
      .map(tb => tb.activity?.name)
      .filter(Boolean)
      .map(n => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, ''));
    const seen = new Set();
    for (const n of names) {
      assert.ok(!seen.has(n), `duplicate activity "${n}" on day ${day.dayNumber}`);
      seen.add(n);
    }
  }
});

test('travel days are always inserted between cities, even without connections data', async () => {
  // Krakow has no sections/connections.json — the builder must still insert a
  // travel day (with a default transport and real from/to names), not drop it.
  const it = await buildMultiCityItinerary(
    { start_date: '2026-07-10', end_date: '2026-07-16', pace: 'balanced', interests: [] },
    [
      { id: 'berlin', name: 'Berlin', country: 'Germany' },
      { id: 'krakow', name: 'Krakow', country: 'Poland' },
    ],
    { dayAllocation: { berlin: 3, krakow: 3 }, includeTransfers: true, enrich: false },
  );
  const travelDays = it.days.filter(d => d.isTravelDay);
  assert.equal(travelDays.length, 1, 'exactly one travel day between two cities');
  const t = travelDays[0];
  assert.match(t.theme, /Berlin/, 'travel day names the origin');
  assert.match(t.theme, /Krakow/, 'travel day names the destination');
  assert.ok(!/undefined/.test(t.theme), 'no undefined city names in travel day');
  assert.ok(t.transfer?.transport?.type, 'travel day has a transport type');
  assert.equal(it.transfers.length, 1, 'one transfer recorded');
  assert.ok(it.transfers[0].bookingUrl, 'transfer has a booking URL');
});

test('multi-city itinerary keeps requested dates (no day drift) and has real stops', async () => {
  const it = await buildMultiCityItinerary(
    { start_date: '2026-07-12', end_date: '2026-07-15', pace: 'balanced', interests: ['Culture & History'] },
    [{ id: 'paris', name: 'Paris', country: 'France' }],
    { dayAllocation: { paris: 4 }, includeTransfers: false, enrich: false },
  );
  assert.equal(it.days[0].date, '2026-07-12', 'first day must match the requested start date');
  const realAttractions = it.days
    .flatMap(d => d.timeBlocks)
    .map(tb => tb.activity)
    .filter(a => a && !NON_ATTRACTION_TYPES.has(a.type));
  assert.ok(realAttractions.length >= 4, `expected real stops in multi-city build, got ${realAttractions.length}`);
  // Bastille Day (Jul 14) falls inside the window and must anchor on that day.
  const jul14 = it.days.find(d => d.date === '2026-07-14');
  assert.ok(jul14 && jul14.timeBlocks.some(tb => tb.activity?.isEvent),
    'a dated event should anchor on July 14');
});
