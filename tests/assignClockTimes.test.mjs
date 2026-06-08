import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assignDayClockTimes, assignClockTimes } from '../src/lib/planning/assignClockTimes.js';

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
