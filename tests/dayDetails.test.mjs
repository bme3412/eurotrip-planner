import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildDayDetailsByDate, nextTransferForDate, buildNextTransferByDate } from '../src/lib/planning/dayDetails.js';

// Paris (2 days) → travel → Berlin (1 day). Mirrors buildMultiCityItinerary order.
const ITIN = {
  days: [
    { date: '2026-06-19', dayNumber: 1, city: 'paris', isTravelDay: false, timeBlocks: [{ time: 'morning', activity: { name: 'Louvre' } }] },
    { date: '2026-06-20', dayNumber: 2, city: 'paris', isTravelDay: false, timeBlocks: [] },
    {
      date: '2026-06-21', dayNumber: 3, isTravelDay: true,
      transfer: { from: { city: 'paris', name: 'Paris' }, to: { city: 'berlin', name: 'Berlin' }, transport: { type: 'train', journeyTime: '8h' } },
    },
    { date: '2026-06-22', dayNumber: 4, city: 'berlin', isTravelDay: false, timeBlocks: [] },
  ],
};

test('buildDayDetailsByDate indexes every day by ISO date', () => {
  const map = buildDayDetailsByDate(ITIN);
  assert.equal(map.size, 4);
  assert.equal(map.get('2026-06-19').dayNumber, 1);
  assert.equal(map.get('2026-06-21').isTravelDay, true);
});

test('buildDayDetailsByDate tolerates missing/empty itinerary', () => {
  assert.equal(buildDayDetailsByDate(null).size, 0);
  assert.equal(buildDayDetailsByDate({}).size, 0);
});

test('nextTransferForDate returns the transfer only on the last day in a city', () => {
  // Last Paris day → next is the travel day → transfer.
  const t = nextTransferForDate(ITIN, '2026-06-20');
  assert.ok(t);
  assert.equal(t.to.city, 'berlin');
  // Mid-stay Paris day → null (next is another Paris day).
  assert.equal(nextTransferForDate(ITIN, '2026-06-19'), null);
});

test('nextTransferForDate returns null on the travel day itself and the final city', () => {
  assert.equal(nextTransferForDate(ITIN, '2026-06-21'), null);
  assert.equal(nextTransferForDate(ITIN, '2026-06-22'), null);
});

test('nextTransferForDate returns null for unknown date / empty itinerary', () => {
  assert.equal(nextTransferForDate(ITIN, '2099-01-01'), null);
  assert.equal(nextTransferForDate({ days: [] }, '2026-06-20'), null);
  assert.equal(nextTransferForDate(null, '2026-06-20'), null);
});

test('buildNextTransferByDate maps only last-in-city dates to their transfer', () => {
  const map = buildNextTransferByDate(ITIN);
  assert.deepEqual([...map.keys()], ['2026-06-20']); // only the last Paris day
  assert.equal(map.get('2026-06-20').to.city, 'berlin');
  // Matches the per-date function for every day.
  for (const d of ITIN.days) {
    assert.equal(map.get(d.date) || null, nextTransferForDate(ITIN, d.date));
  }
});

test('buildNextTransferByDate tolerates empty/missing itinerary', () => {
  assert.equal(buildNextTransferByDate(null).size, 0);
  assert.equal(buildNextTransferByDate({ days: [] }).size, 0);
});
