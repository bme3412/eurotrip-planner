import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assembleCuratedDays } from '../src/lib/planning/curateCityDays.js';

// ── Test fixtures ────────────────────────────────────────────────────
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
    sight('a1', 'Louvre'), sight('a2', 'Orsay'), sight('a3', 'Eiffel'),
    sight('a4', 'Arc'), sight('a5', 'Sainte-Chapelle'), sight('a6', 'Panthéon'),
    food('f1', 'Bistro'), food('f2', 'Café'),
  ];
  return { candidates, byRef: new Map(candidates.map((c) => [c.ref, c])) };
}
const slot = (time, name, extra = {}) => ({
  time, startTime: '9:00', endTime: '10:00',
  activity: { name, type: time === 'lunch' ? 'food_recommendation' : 'Attraction', ...extra },
});
function makeBaseDays() {
  const day = (n) => ({
    dayNumber: n, theme: `orig-theme-${n}`, summary: `orig-summary-${n}`, weatherNote: '', tips: [],
    timeBlocks: [slot('morning', `o${n}a`), slot('lunch', `Lunch: o${n}`), slot('afternoon', `o${n}b`)],
  });
  return [day(1), day(2)]; // 2 sight slots + 1 meal slot each
}

const names = (day) => day.timeBlocks.map((b) => b.activity.name);

test('happy path: places valid sight + food refs and sets theme/summary', () => {
  const pool = makePool();
  const plan = { days: [
    { day: 1, theme: 'Right Bank', summary: 'A good day.', sights: ['a1', 'a2'], meal: 'f1' },
    { day: 2, theme: 'Island', summary: 'Another.', sights: ['a3', 'a4'], meal: 'f2' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool);
  assert.deepEqual(names(out[0]), ['Louvre', 'Bistro', 'Orsay']);
  assert.deepEqual(names(out[1]), ['Eiffel', 'Café', 'Arc']);
  assert.equal(out[0].theme, 'Right Bank');
  assert.equal(out[0].summary, 'A good day.');
  assert.equal(out[0]._curated, true);
});

test('dedupes refs across the whole trip and backfills the shortfall', () => {
  const pool = makePool();
  // a1 repeated on day 2 → must be dropped and backfilled with an unused sight.
  const plan = { days: [
    { day: 1, sights: ['a1', 'a2'], meal: 'f1' },
    { day: 2, sights: ['a1', 'a3'], meal: 'f2' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool);
  const all = [...names(out[0]), ...names(out[1])].filter((n) => n !== 'Bistro' && n !== 'Café');
  assert.equal(new Set(all).size, all.length, 'no sight repeats across the trip');
  assert.ok(!names(out[1]).includes('Louvre'), 'duplicate Louvre dropped from day 2');
});

test('ignores unknown refs and backfills from the pool', () => {
  const pool = makePool();
  const plan = { days: [
    { day: 1, sights: ['zzz', 'a2'], meal: 'nope' },
    { day: 2, sights: ['a3', 'a4'], meal: 'f2' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool);
  // First slot backfilled with the top unused sight (a1/Louvre), meal backfilled with a food.
  assert.equal(out[0].timeBlocks[0].activity.type, 'Attraction');
  assert.notEqual(out[0].timeBlocks[0].activity.name, 'o1a', 'unknown ref replaced, not left as original');
  assert.equal(out[0].timeBlocks[1].activity.type, 'food_recommendation');
  assert.ok(['Bistro', 'Café'].includes(out[0].timeBlocks[1].activity.name), 'invalid meal backfilled with food');
});

test('rejects a food ref placed in a sight slot', () => {
  const pool = makePool();
  const plan = { days: [
    { day: 1, sights: ['f1', 'a2'], meal: 'f2' }, // f1 is food → invalid for a sight slot
    { day: 2, sights: ['a3', 'a4'], meal: 'f1' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool);
  assert.equal(out[0].timeBlocks[0].activity.type, 'Attraction', 'sight slot never holds a food venue');
  assert.notEqual(out[0].timeBlocks[0].activity.name, 'Bistro');
});

test('truncates an overstuffed day to its slot count', () => {
  const pool = makePool();
  const plan = { days: [
    { day: 1, sights: ['a1', 'a2', 'a3', 'a4', 'a5'], meal: 'f1' }, // 5 sights, 2 slots
    { day: 2, sights: ['a6'], meal: 'f2' },
  ] };
  const out = assembleCuratedDays(plan, makeBaseDays(), pool);
  const sightSlots = out[0].timeBlocks.filter((b) => b.activity.type === 'Attraction');
  assert.equal(sightSlots.length, 2, 'only the 2 available sight slots are filled');
  assert.deepEqual(sightSlots.map((b) => b.activity.name), ['Louvre', 'Orsay']);
});

test('leaves locked event slots untouched', () => {
  const pool = makePool();
  const base = makeBaseDays();
  base[0].timeBlocks[0] = slot('morning', 'Bastille Day', { type: 'event', isEvent: true });
  const plan = { days: [{ day: 1, sights: ['a1', 'a2'], meal: 'f1' }, { day: 2, sights: ['a3', 'a4'], meal: 'f2' }] };
  const out = assembleCuratedDays(plan, base, pool);
  assert.equal(out[0].timeBlocks[0].activity.name, 'Bastille Day', 'event preserved');
  assert.equal(out[0].timeBlocks[0].activity.isEvent, true);
  // The single remaining sight slot still gets a curated pick.
  assert.equal(out[0].timeBlocks[2].activity.name, 'Louvre');
});

test('empty / missing model plan falls back to deterministic blocks but is structurally valid', () => {
  const pool = makePool();
  const out = assembleCuratedDays(null, makeBaseDays(), pool);
  assert.equal(out.length, 2);
  // With no plan, sight slots are backfilled deterministically from the pool.
  assert.equal(out[0].timeBlocks[0].activity.type, 'Attraction');
  assert.equal(out[0].timeBlocks[1].activity.type, 'food_recommendation');
});
