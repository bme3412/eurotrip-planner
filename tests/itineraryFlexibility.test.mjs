import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assembleCuratedDays, mustIncludeRefs } from '../src/lib/planning/curateCityDays.js';
import { matchesMustSee } from '../src/lib/planning/buildItinerary.js';
import { buildDayScaffold, namesUsedElsewhere, dayToPlan } from '../src/lib/planning/regenerateDay.js';

// ── Fixtures (same shapes as curatorValidation.test.mjs) ─────────────
function sight(ref, name) {
  return {
    ref, kind: 'sight', neighborhood: null, durationLabel: '1.5h', outdoor: false, hours: null,
    activity: { name, type: 'Attraction', description: '', duration: '1.5h', price: null, coordinates: null, bookingUrl: null, neighborhood: null },
  };
}
function food(ref, name) {
  return {
    ref, kind: 'food', neighborhood: null, durationLabel: '1h', outdoor: false, hours: null,
    activity: { name, type: 'food_recommendation', description: '', duration: '1h', price: null, coordinates: null, bookingUrl: null, neighborhood: null },
  };
}
function makePool() {
  const candidates = [
    sight('a1', 'Louvre'), sight('a2', 'Orsay'), sight('a3', 'Eiffel Tower'),
    sight('a4', 'Arc de Triomphe'), sight('a5', 'Sainte-Chapelle'), sight('a6', 'Panthéon'),
    food('f1', 'Bistro'), food('f2', 'Café'),
  ];
  return { candidates, byRef: new Map(candidates.map((c) => [c.ref, c])) };
}
const slot = (time, name) => ({
  time, startTime: '9:00', endTime: '10:00',
  activity: { name, type: time === 'lunch' ? 'food_recommendation' : 'Attraction' },
});
function makeBaseDays() {
  const day = (n) => ({
    dayNumber: n, theme: `orig-theme-${n}`, summary: `orig-summary-${n}`, weatherNote: '', tips: [],
    timeBlocks: [slot('morning', `o${n}a`), slot('lunch', `Lunch: o${n}`), slot('afternoon', `o${n}b`)],
  });
  return [day(1), day(2)];
}
const names = (day) => day.timeBlocks.map((b) => b.activity.name);

// ── Must-see matching ────────────────────────────────────────────────
describe('matchesMustSee / mustIncludeRefs', () => {
  it('matches by slug containment in both directions', () => {
    assert.equal(matchesMustSee({ name: 'Sainte-Chapelle' }, ['sainte-chapelle']), true);
    assert.equal(matchesMustSee({ name: 'The Louvre Museum' }, ['the-louvre']), true);
    assert.equal(matchesMustSee({ name: 'Panthéon' }, ['louvre']), false);
    assert.equal(matchesMustSee({ name: 'Louvre' }, []), false);
  });

  it('resolves must-see slugs to pool refs', () => {
    const pool = makePool();
    assert.deepEqual(mustIncludeRefs(pool, ['sainte-chapelle', 'eiffel-tower']), ['a3', 'a5']);
    assert.deepEqual(mustIncludeRefs(pool, []), []);
  });
});

// ── Pin enforcement in assembly ──────────────────────────────────────
test('a must-include ref the model dropped gets swapped into the last non-pinned slot', () => {
  const pool = makePool();
  const plan = { days: [
    { day: 1, theme: 'T1', summary: 'S1', sights: ['a1', 'a2'], meal: 'f1' },
    { day: 2, theme: 'T2', summary: 'S2', sights: ['a3', 'a4'], meal: 'f2' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool, { mustInclude: ['a5'] });
  // a5 (Sainte-Chapelle) replaced the LAST placement (day 2 afternoon = a4).
  assert.deepEqual(names(out[0]), ['Louvre', 'Bistro', 'Orsay']);
  assert.deepEqual(names(out[1]), ['Eiffel Tower', 'Café', 'Sainte-Chapelle']);
});

test('pins already placed by the model are left exactly where the model put them', () => {
  const pool = makePool();
  const plan = { days: [
    { day: 1, theme: 'T1', summary: 'S1', sights: ['a5', 'a1'], meal: 'f1' },
    { day: 2, theme: 'T2', summary: 'S2', sights: ['a2', 'a3'], meal: 'f2' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool, { mustInclude: ['a5'] });
  assert.deepEqual(names(out[0]), ['Sainte-Chapelle', 'Bistro', 'Louvre']);
  assert.deepEqual(names(out[1]), ['Orsay', 'Café', 'Eiffel Tower']);
});

test('two missing pins never overwrite each other', () => {
  const pool = makePool();
  const plan = { days: [
    { day: 1, theme: 'T1', summary: 'S1', sights: ['a1', 'a2'], meal: 'f1' },
    { day: 2, theme: 'T2', summary: 'S2', sights: ['a3', 'a4'], meal: 'f2' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool, { mustInclude: ['a5', 'a6'] });
  const all = [...names(out[0]), ...names(out[1])];
  assert.ok(all.includes('Sainte-Chapelle'));
  assert.ok(all.includes('Panthéon'));
});

// ── Regenerate-day pure helpers ──────────────────────────────────────
const act = (name, { time_block = 'morning', type = 'Attraction', status = 'planned' } = {}) =>
  ({ name, time_block, type, status });

describe('buildDayScaffold', () => {
  it('mirrors the saved day: same sight count, meal kept', () => {
    const dayRow = {
      day_number: 3,
      date: '2026-06-21',
      city: 'krakow',
      activities: [act('Wawel'), act('Rynek'), act('Lunch spot', { time_block: 'lunch', type: 'food_recommendation' }), act('Schindler')],
    };
    const s = buildDayScaffold(dayRow);
    assert.equal(s.dayNumber, 3);
    const kinds = s.timeBlocks.map((b) => b.time);
    assert.equal(kinds.filter((k) => k !== 'lunch').length, 3);
    assert.equal(kinds.filter((k) => k === 'lunch').length, 1);
    // Lunch sits mid-day, not at the edges.
    assert.ok(kinds.indexOf('lunch') > 0 && kinds.indexOf('lunch') < kinds.length - 1);
  });

  it('skipped activities do not count toward the shape', () => {
    const dayRow = {
      day_number: 1,
      activities: [act('A'), act('B', { status: 'skipped' }), act('C', { status: 'weather_swapped' })],
    };
    const s = buildDayScaffold(dayRow);
    assert.equal(s.timeBlocks.filter((b) => b.time !== 'lunch').length, 1);
  });

  it('an empty day defaults to a sensible 3-stop + meal shape', () => {
    const s = buildDayScaffold({ day_number: 2, activities: [] });
    assert.equal(s.timeBlocks.filter((b) => b.time !== 'lunch').length, 3);
    assert.ok(s.timeBlocks.some((b) => b.time === 'lunch'));
  });
});

describe('namesUsedElsewhere', () => {
  const tripRow = {
    days: [
      { day_number: 1, city: 'paris', activities: [act('Louvre'), act('Skipped one', { status: 'skipped' })] },
      { day_number: 2, city: 'paris', activities: [act('Orsay')] },
      { day_number: 3, city: 'berlin', activities: [act('Museum Island')] },
    ],
  };

  it('collects active names from other days in the SAME city only', () => {
    assert.deepEqual(namesUsedElsewhere(tripRow, 2, 'paris'), ['Louvre']);
    assert.deepEqual(namesUsedElsewhere(tripRow, 1, 'paris'), ['Orsay']);
  });

  it('skipped stops are free to reuse', () => {
    assert.ok(!namesUsedElsewhere(tripRow, 2, 'paris').includes('Skipped one'));
  });
});

describe('dayToPlan', () => {
  it('serializes only blocks with activities, sanitized', () => {
    const day = {
      dayNumber: 2,
      theme: 'Old Town',
      summary: 'A slow loop.',
      timeBlocks: [
        { time: 'morning', startTime: '9:30', endTime: '11:00', activity: { name: 'Wawel', type: 'Castle', coordinates: [19.93, 50.05], indoor: false } },
        { time: 'lunch', activity: { name: 'Pod Aniolami', type: 'food_recommendation' } },
        { time: 'afternoon' }, // empty slot dropped
      ],
    };
    const plan = dayToPlan(day);
    assert.equal(plan.dayNumber, 2);
    assert.equal(plan.blocks.length, 2);
    assert.equal(plan.blocks[0].name, 'Wawel');
    assert.deepEqual(plan.blocks[0].coordinates, [19.93, 50.05]);
    assert.equal(plan.blocks[1].time, 'lunch');
  });
});
