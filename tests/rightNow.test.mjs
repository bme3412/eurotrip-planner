import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRightNow,
  flattenTopExperiences,
  buildDayShape,
} from '../src/components/city-guides/overview/lib/rightNow.js';

// A trimmed visit-calendar shaped like public/data/France/paris/sections/visit-calendar.json
const visitCalendar = {
  months: {
    may: {
      name: 'May',
      crowdLevel: 'Medium-High',
      priceLevel: 'Medium-High',
      weatherDetails: { lowC: 11, highC: 20, sunset: '21:30', daylightHours: 15, sunshineHours: 7.5, rainDays: 11 },
      ranges: [
        { days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], score: 5, notes: 'Early May bloom', crowdLevel: 'Moderate', price: 'Standard' },
        {
          days: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
          score: 4,
          notes: 'Late spring warmth, Roland Garros period',
          crowdLevel: 'Moderate-High',
          price: 'Standard-High',
          considerations: ['Roland Garros crowds in western Paris', 'Prices begin to rise'],
          specialEvents: {
            rolandGarros: { dates: 'Late May - early June', location: 'Stade Roland Garros', tips: 'Book early' },
          },
        },
      ],
    },
    january: {
      name: 'January',
      crowdLevel: 'Low',
      weatherDetails: { lowC: 3, highC: 8, sunset: '17:00' },
      ranges: [{ days: Array.from({ length: 31 }, (_, i) => i + 1), score: 2, crowdLevel: 'Low', price: 'Low' }],
    },
  },
};

// ---------- buildRightNow ----------

test('buildRightNow: returns null when no calendar months', () => {
  assert.equal(buildRightNow({ visitCalendar: null }), null);
  assert.equal(buildRightNow({ visitCalendar: {} }), null);
});

test('buildRightNow: returns null when the current month has no entry', () => {
  // March (index 2) is absent from the fixture.
  assert.equal(buildRightNow({ visitCalendar, today: new Date(2026, 2, 15) }), null);
});

test('buildRightNow: resolves the range covering today (late May)', () => {
  const r = buildRightNow({ visitCalendar, cityDisplayName: 'Paris', today: new Date(2026, 4, 29) });
  assert.equal(r.monthName, 'May');
  assert.equal(r.periodLabel, 'Late May');
  assert.equal(r.score, 4);
  assert.equal(r.scoreLabel, 'Good');
  assert.equal(r.isGoodTime, true);
  assert.equal(r.crowdLevel, 'Moderate-High');
  assert.equal(r.weather.tempLabel, '11–20°C');
  assert.equal(r.weather.sunset, '21:30');
});

test('buildRightNow: surfaces special events and considerations', () => {
  const r = buildRightNow({ visitCalendar, cityDisplayName: 'Paris', today: new Date(2026, 4, 29) });
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].name, 'Roland Garros');
  assert.equal(r.events[0].dates, 'Late May - early June');
  assert.ok(r.considerations.includes('Prices begin to rise'));
  assert.ok(r.verdict.includes('Paris'));
  assert.ok(r.verdict.includes('Roland Garros'));
});

test('buildRightNow: picks the early-May range for an early-May date', () => {
  const r = buildRightNow({ visitCalendar, today: new Date(2026, 4, 3) });
  assert.equal(r.periodLabel, 'Early May');
  assert.equal(r.score, 5);
  assert.equal(r.scoreLabel, 'Excellent');
});

test('buildRightNow: a low-score month reads as not a good time', () => {
  const r = buildRightNow({ visitCalendar, today: new Date(2026, 0, 15) });
  assert.equal(r.monthName, 'January');
  assert.equal(r.score, 2);
  assert.equal(r.isGoodTime, false);
});

test('buildRightNow: handles a month entry that lacks a covering range', () => {
  // May 15 falls between the two fixture ranges (no day 11-18 coverage).
  const r = buildRightNow({ visitCalendar, today: new Date(2026, 4, 15) });
  assert.equal(r.monthName, 'May');
  assert.equal(r.score, null);
  assert.equal(r.scoreLabel, null);
  // Month-level crowd/weather still resolve as a graceful fallback.
  assert.equal(r.crowdLevel, 'Medium-High');
  assert.equal(r.weather.tempLabel, '11–20°C');
});

// ---------- flattenTopExperiences ----------

const experiencesJson = {
  categories: {
    Morning: [
      { name: 'Sunrise at Trocadéro', scores: { total_score: 92 }, themes: ['views'], category: 'x' },
      { name: 'Market run', scores: { total_score: 70 } },
    ],
    Evening: [
      { name: 'Seine cruise', scores: { total_score: 88 }, arrondissement: '7th' },
      { name: 'No-score item' }, // total_score missing → 0
    ],
    Afternoon: [{ name: 'Louvre highlights', scores: { total_score: 95 } }],
  },
};

test('flattenTopExperiences: flattens + sorts by total_score desc', () => {
  const top = flattenTopExperiences(experiencesJson, 3);
  assert.deepEqual(top.map((e) => e.name), ['Louvre highlights', 'Sunrise at Trocadéro', 'Seine cruise']);
  assert.equal(top[0].scoreTotal, 95);
});

test('flattenTopExperiences: carries category + skips nameless items, empty for bad input', () => {
  const all = flattenTopExperiences(experiencesJson, Infinity);
  // 5 named items total (the nameless one is dropped).
  assert.equal(all.length, 5);
  assert.equal(all.find((e) => e.name === 'Seine cruise').category, 'Evening');
  assert.deepEqual(flattenTopExperiences(null), []);
  assert.deepEqual(flattenTopExperiences({}), []);
});

// ---------- buildDayShape ----------

test('buildDayShape: picks one item per time slot, highest-scored first', () => {
  const shape = buildDayShape(experiencesJson);
  assert.equal(shape.morning.name, 'Sunrise at Trocadéro');
  assert.equal(shape.afternoon.name, 'Louvre highlights');
  assert.equal(shape.evening.name, 'Seine cruise');
});

test('buildDayShape: returns null for empty input', () => {
  assert.equal(buildDayShape(null), null);
  assert.equal(buildDayShape({ categories: {} }), null);
});
