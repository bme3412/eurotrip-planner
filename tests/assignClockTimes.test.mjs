import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assignDayClockTimes,
  assignClockTimes,
  assignFlightDayClockTimes,
  parseClockToMinutes,
} from '../src/lib/planning/assignClockTimes.js';

function block(time, activity) {
  return { time, startTime: '0:00', endTime: '0:00', activity };
}

test('sequences stops from the pace anchor using duration + travel', () => {
  const day = {
    timeBlocks: [
      block('morning', { name: 'A', duration: '1.5h', nextTravel: { durationMinutes: 15 } }),
      block('afternoon', { name: 'B', duration: '1h' }),
    ],
  };
  const out = assignDayClockTimes(day, { pace: 'active' }); // anchor 9:00
  assert.equal(out.timeBlocks[0].startTime, '9:00');
  assert.equal(out.timeBlocks[0].endTime, '10:30'); // +90m
  // 10:30 + 15m travel = 10:45
  assert.equal(out.timeBlocks[1].startTime, '10:45');
  assert.equal(out.timeBlocks[1].endTime, '11:45'); // +60m
});

test('does not seat lunch before 12:30', () => {
  const day = {
    timeBlocks: [
      block('morning', { name: 'A', duration: '30m' }),
      block('lunch', { name: 'Lunch: X', type: 'food_recommendation' }),
    ],
  };
  const out = assignDayClockTimes(day, { pace: 'active' }); // anchor 9:00
  assert.equal(out.timeBlocks[1].startTime, '12:30');
  assert.equal(out.timeBlocks[1].endTime, '13:30'); // 60m lunch
});

test('respects opening hours by pushing the start later', () => {
  const day = {
    timeBlocks: [
      block('morning', { name: 'Museum', duration: '1h', _hours: { opensAt: 11, closesAt: 18 } }),
    ],
  };
  const out = assignDayClockTimes(day, { pace: 'active' }); // anchor 9:00 < opens 11:00
  assert.equal(out.timeBlocks[0].startTime, '11:00');
  assert.equal(out.timeBlocks[0].endTime, '12:00');
});

test('never mutates the time slot label and leaves travel days alone', () => {
  const itinerary = {
    days: [
      { isTravelDay: true, timeBlocks: [block('morning', { name: 'Train' })] },
      { timeBlocks: [block('afternoon', { name: 'A', duration: '1h' })] },
    ],
  };
  const out = assignClockTimes(itinerary, { pace: 'moderate' });
  assert.equal(out.days[0].timeBlocks[0].startTime, '0:00'); // travel day untouched
  assert.equal(out.days[1].timeBlocks[0].time, 'afternoon'); // label preserved
  assert.equal(out.days[1].timeBlocks[0].startTime, '9:30'); // moderate anchor
});

test('parseClockToMinutes handles 24h, am/pm and seconds', () => {
  assert.equal(parseClockToMinutes('10:35'), 635);
  assert.equal(parseClockToMinutes('10:35AM'), 635);
  assert.equal(parseClockToMinutes('10:35 PM'), 1355);
  assert.equal(parseClockToMinutes('10:35:00'), 635);
  assert.equal(parseClockToMinutes('12:00AM'), 0);
  assert.equal(parseClockToMinutes('12:00 PM'), 720);
  assert.equal(parseClockToMinutes('garbage'), null);
  assert.equal(parseClockToMinutes(undefined), null);
});

test('arrival day starts after landing + transit buffer, not the pace anchor', () => {
  const day = {
    arrival: { arrivalTime: '10:35' }, // +135m buffer → 12:50 floor
    timeBlocks: [
      block('morning', { name: 'A', duration: '1h' }),
      block('afternoon', { name: 'B', duration: '1h' }),
    ],
  };
  const out = assignFlightDayClockTimes(day, { pace: 'moderate', direction: 'arrival' });
  assert.equal(out.timeBlocks[0].startTime, '12:50'); // not 9:30
  assert.equal(out.timeBlocks[0].endTime, '13:50');
});

test('arrival day unchanged when arrival time is missing/unparseable', () => {
  const day = { arrival: {}, timeBlocks: [block('morning', { name: 'A', duration: '1h' })] };
  const out = assignFlightDayClockTimes(day, { pace: 'active', direction: 'arrival' });
  assert.equal(out, day); // returned as-is
});

test('very late arrival clears daytime activities', () => {
  const day = {
    arrival: { arrivalTime: '21:00' }, // floor 23:15 ≥ 20:00 cutoff
    timeBlocks: [block('morning', { name: 'A', duration: '1h' })],
  };
  const out = assignFlightDayClockTimes(day, { pace: 'moderate', direction: 'arrival' });
  assert.deepEqual(out.timeBlocks, []);
});

test('departure day drops stops that start after the airport cutoff', () => {
  const day = {
    departure: { departureTime: '14:00' }, // -180m → cap at 11:00
    timeBlocks: [
      block('morning', { name: 'A', duration: '1h' }), // 9:30–10:30, starts before 11:00 → kept
      block('afternoon', { name: 'B', duration: '1h' }), // starts ~10:4x… kept; later ones dropped
      block('evening', { name: 'C', duration: '2h' }),
    ],
  };
  const out = assignFlightDayClockTimes(day, { pace: 'moderate', direction: 'departure' });
  // Every kept block must start strictly before 11:00 (660 min).
  for (const b of out.timeBlocks) {
    assert.ok(parseClockToMinutes(b.startTime) < 660, `kept block starts too late: ${b.startTime}`);
  }
  assert.ok(out.timeBlocks.length < day.timeBlocks.length, 'should drop at least one late stop');
});

test('estimates walking time from coordinates when routing is absent', () => {
  // ~1.1km apart → ~14 min walk at 4.8km/h
  const day = {
    timeBlocks: [
      block('morning', { name: 'A', duration: '1h', coordinates: [2.2945, 48.8584] }),
      block('afternoon', { name: 'B', duration: '1h', coordinates: [2.2950, 48.8685] }),
    ],
  };
  const out = assignDayClockTimes(day, { pace: 'active' }); // 9:00 → +60m = 10:00
  const [h, m] = out.timeBlocks[1].startTime.split(':').map(Number);
  const startMin = h * 60 + m;
  assert.ok(startMin > 600 && startMin < 630, `expected ~10:1x, got ${out.timeBlocks[1].startTime}`);
});
