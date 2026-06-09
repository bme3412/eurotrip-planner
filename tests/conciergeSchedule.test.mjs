import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  localDateIn,
  isQuietHour,
  dayNumberForLocalDate,
  dueBeats,
} from '../src/lib/concierge/schedule.js';

// Europe/Paris is UTC+2 in June, so these UTC instants land on exact beat hours.
const PARIS = 'Europe/Paris';
const AT_PARIS_20 = new Date('2026-06-09T18:00:00Z'); // evening_brief hour
const AT_PARIS_08 = new Date('2026-06-09T06:00:00Z'); // morning_wakeup hour
const AT_PARIS_21 = new Date('2026-06-09T19:00:00Z'); // wind_down hour
const AT_PARIS_15 = new Date('2026-06-09T13:00:00Z'); // no beat

const trip = {
  id: 'trip-1',
  country: 'France',
  days: [
    { date: '2026-06-09', day_number: 1 },
    { date: '2026-06-10', day_number: 2 },
    { date: '2026-06-11', day_number: 3 },
  ],
};

describe('addDays', () => {
  it('adds within a month and across month/year boundaries', () => {
    assert.equal(addDays('2026-06-09', 1), '2026-06-10');
    assert.equal(addDays('2026-06-30', 1), '2026-07-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  });

  it('returns the input unchanged when it is not a date', () => {
    assert.equal(addDays('not-a-date', 1), 'not-a-date');
  });
});

describe('localDateIn', () => {
  it('formats the local calendar date for a zone', () => {
    // 23:30Z on the 9th is already the 10th in Paris.
    assert.equal(localDateIn(PARIS, new Date('2026-06-09T23:30:00Z')), '2026-06-10');
    assert.equal(localDateIn(PARIS, AT_PARIS_15), '2026-06-09');
  });

  it('returns null for missing or invalid zones', () => {
    assert.equal(localDateIn(null), null);
    assert.equal(localDateIn('Not/AZone'), null);
  });
});

describe('isQuietHour', () => {
  it('uses the default 21:30–07:30 window, wrapping midnight', () => {
    assert.equal(isQuietHour(22), true);
    assert.equal(isQuietHour(3), true);
    assert.equal(isQuietHour(7), true); // 07:00 < 07:30
    assert.equal(isQuietHour(8), false);
    assert.equal(isQuietHour(21), false); // 21:00 < 21:30
  });

  it('supports a non-wrapping custom window', () => {
    assert.equal(isQuietHour(13, '12:00', '14:00'), true);
    assert.equal(isQuietHour(15, '12:00', '14:00'), false);
  });
});

describe('dayNumberForLocalDate', () => {
  it('maps a local date to the trip day, null outside the trip', () => {
    assert.equal(dayNumberForLocalDate(trip, '2026-06-10'), 2);
    assert.equal(dayNumberForLocalDate(trip, '2026-06-20'), null);
    assert.equal(dayNumberForLocalDate(null, '2026-06-10'), null);
  });
});

describe('dueBeats', () => {
  it('fires the evening brief at local 20:00, targeting TOMORROW\'s day', () => {
    const beats = dueBeats(trip, { timezone: PARIS }, AT_PARIS_20);
    assert.deepEqual(beats, [
      { type: 'evening_brief', dayNumber: 2, localDate: '2026-06-09' },
    ]);
  });

  it('fires morning wakeup and wind-down for TODAY', () => {
    assert.deepEqual(dueBeats(trip, { timezone: PARIS }, AT_PARIS_08), [
      { type: 'morning_wakeup', dayNumber: 1, localDate: '2026-06-09' },
    ]);
    assert.deepEqual(dueBeats(trip, { timezone: PARIS }, AT_PARIS_21), [
      { type: 'wind_down', dayNumber: 1, localDate: '2026-06-09' },
    ]);
  });

  it('returns nothing on hours with no beat', () => {
    assert.deepEqual(dueBeats(trip, { timezone: PARIS }, AT_PARIS_15), []);
  });

  it('skips the evening brief when tomorrow is outside the trip', () => {
    const lastNight = new Date('2026-06-11T18:00:00Z'); // tomorrow = 06-12, not a trip day
    assert.deepEqual(dueBeats(trip, { timezone: PARIS }, lastNight), []);
  });

  it('respects custom quiet hours', () => {
    const prefs = { timezone: PARIS, quiet_start: '19:00', quiet_end: '21:30' };
    assert.deepEqual(dueBeats(trip, prefs, AT_PARIS_20), []);
  });

  it('falls back to the trip country timezone, and bails without one', () => {
    const beats = dueBeats(trip, {}, AT_PARIS_08); // France → Europe/Paris
    assert.equal(beats.length, 1);
    assert.equal(beats[0].type, 'morning_wakeup');

    assert.deepEqual(dueBeats({ ...trip, country: 'Atlantis' }, {}, AT_PARIS_08), []);
  });
});
