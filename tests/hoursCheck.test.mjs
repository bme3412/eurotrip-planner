import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { classifyOpening, scanTripForHours, hoursAlertBody } from '../src/lib/concierge/hoursCheck.js';

// Google Places (New) regularOpeningHours shape. Tue=2 (0=Sunday).
const MUSEUM_HOURS = {
  periods: [
    // Closed Tuesdays; Wed–Mon 10:00–18:00 (subset is enough for tests)
    { open: { day: 1, hour: 10, minute: 0 }, close: { day: 1, hour: 18, minute: 0 } },
    { open: { day: 3, hour: 10, minute: 0 }, close: { day: 3, hour: 18, minute: 0 } },
  ],
};

describe('classifyOpening', () => {
  it('flags full-day closure (the "closed Tuesdays" bug)', () => {
    assert.deepEqual(classifyOpening({ openingHours: MUSEUM_HOURS, weekday: 2, plannedTime: '11:00' }), { status: 'closed' });
  });

  it('ok inside an open window, closed after closing', () => {
    assert.equal(classifyOpening({ openingHours: MUSEUM_HOURS, weekday: 1, plannedTime: '11:00' }).status, 'ok');
    assert.equal(classifyOpening({ openingHours: MUSEUM_HOURS, weekday: 1, plannedTime: '19:00' }).status, 'closed');
  });

  it('opens_later with the opening time; small gaps tolerated', () => {
    const late = classifyOpening({ openingHours: MUSEUM_HOURS, weekday: 1, plannedTime: '08:30' });
    assert.deepEqual(late, { status: 'opens_later', opensAt: '10:00' });
    // 09:45 → opens 10:00 = 15min gap → not worth a ping
    assert.equal(classifyOpening({ openingHours: MUSEUM_HOURS, weekday: 1, plannedTime: '09:45' }).status, 'ok');
  });

  it('handles overnight windows spilling into the visit day', () => {
    const bar = { periods: [{ open: { day: 6, hour: 20, minute: 0 }, close: { day: 0, hour: 2, minute: 0 } }] };
    assert.equal(classifyOpening({ openingHours: bar, weekday: 0, plannedTime: '01:00' }).status, 'ok');
    assert.equal(classifyOpening({ openingHours: bar, weekday: 6, plannedTime: '21:00' }).status, 'ok');
  });

  it('24/7, unknown, and business-status closures', () => {
    const always = { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] };
    assert.equal(classifyOpening({ openingHours: always, weekday: 3, plannedTime: '03:00' }).status, 'ok');
    assert.equal(classifyOpening({ openingHours: null, weekday: 3, plannedTime: '10:00' }).status, 'unknown');
    assert.equal(classifyOpening({ openingHours: MUSEUM_HOURS, businessStatus: 'CLOSED_TEMPORARILY', weekday: 1, plannedTime: '11:00' }).status, 'closed');
  });

  it('no planned time → only the day matters', () => {
    assert.equal(classifyOpening({ openingHours: MUSEUM_HOURS, weekday: 1 }).status, 'ok');
    assert.equal(classifyOpening({ openingHours: MUSEUM_HOURS, weekday: 2 }).status, 'closed');
  });
});

describe('scanTripForHours', () => {
  // 2026-06-16 is a Tuesday. "Now" = evening of Monday the 15th in Paris.
  const trip = {
    id: 'trip-h',
    city: 'paris',
    country: 'France',
    start_date: '2026-06-15',
    end_date: '2026-06-17',
    updated_at: '2026-06-01T00:00:00Z',
    days: [
      { date: '2026-06-15', day_number: 1, city: 'paris', activities: [] },
      {
        date: '2026-06-16',
        day_number: 2,
        city: 'paris',
        activities: [
          { time_block: 'morning', start_time: '11:00:00', name: 'Musée Carnavalet', type: 'museum', google_place_id: 'place-carnavalet' },
          { time_block: 'afternoon', start_time: '15:00:00', name: 'Picnic', type: 'park' }, // no placeId → skipped
        ],
      },
      { date: '2026-06-17', day_number: 3, city: 'paris', activities: [] },
    ],
  };
  const now = new Date('2026-06-15T18:00:00Z');

  it('flags tomorrow’s closed stop and skips placeId-less stops', async () => {
    const fetched = [];
    const hit = await scanTripForHours(trip, {}, now, {
      fetchPlace: async (id) => {
        fetched.push(id);
        return { regularOpeningHours: MUSEUM_HOURS };
      },
    });
    assert.deepEqual(fetched, ['place-carnavalet']);
    assert.equal(hit.dayNumber, 2);
    assert.equal(hit.localDate, '2026-06-16');
    assert.deepEqual(hit.issues, [{ name: 'Musée Carnavalet', time: '11:00', status: 'closed', opensAt: null }]);
  });

  it('returns null when everything is open, fetch fails, or no fetcher', async () => {
    assert.equal(await scanTripForHours(trip, {}, now, { fetchPlace: async () => ({ regularOpeningHours: { periods: [{ open: { day: 2, hour: 9, minute: 0 }, close: { day: 2, hour: 18, minute: 0 } }] } }) }), null);
    assert.equal(await scanTripForHours(trip, {}, now, { fetchPlace: async () => { throw new Error('quota'); } }), null);
    assert.equal(await scanTripForHours(trip, {}, now, {}), null);
  });
});

describe('hoursAlertBody', () => {
  it('reads like a person checked, not a cron job', () => {
    const closed = hoursAlertBody([{ name: 'Musée Carnavalet', time: '11:00', status: 'closed' }], { cityName: 'Paris' });
    assert.match(closed, /Checked tomorrow’s Paris plan/);
    assert.match(closed, /Musée Carnavalet looks closed tomorrow \(you had it at 11:00\)/);

    const late = hoursAlertBody([{ name: 'Louvre', time: '08:30', status: 'opens_later', opensAt: '10:00' }]);
    assert.match(late, /doesn’t open until 10:00 tomorrow — your plan has it at 08:30/);
  });
});
