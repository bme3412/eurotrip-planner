import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getInsiderTips,
  sortNeighborhoods,
  getNearbyNeighborhoods,
} from '../src/components/city-guides/neighborhoodsList/lib/constants.js';

// ---------- getInsiderTips ----------

test('getInsiderTips: combines authored tips + best time + pickpocket note, capped', () => {
  const n = {
    insider_tips: ['Tip A', 'Tip B'],
    practical_info: { best_time_to_visit: 'Spring', safety: 'Watch for pickpockets near the metro' },
  };
  const tips = getInsiderTips(n); // default cap 3
  assert.equal(tips.length, 3);
  assert.equal(tips[0], 'Tip A');
  assert.equal(tips[2], 'Best time: Spring');
});

test('getInsiderTips: Infinity limit returns all (modal use)', () => {
  const n = {
    insider_tips: ['A', 'B', 'C', 'D'],
    practical_info: { best_time_to_visit: 'Fall', safety: 'pickpocket hotspot' },
  };
  const tips = getInsiderTips(n, Infinity);
  // 4 authored + best time + pickpocket = 6
  assert.equal(tips.length, 6);
});

test('getInsiderTips: tolerates missing fields', () => {
  assert.deepEqual(getInsiderTips({}), []);
  assert.deepEqual(getInsiderTips({ practical_info: { best_time_to_visit: 'Summer' } }), ['Best time: Summer']);
});

// ---------- sortNeighborhoods ----------

const sample = [
  { name: 'A', location: { central: false }, categories: { nightlife: 1, dining: 2, cultural: 5, historic: 5, touristy: 5, green_spaces: 1 } },
  { name: 'B', location: { central: true }, categories: { nightlife: 5, dining: 5, cultural: 2, historic: 1, touristy: 4, green_spaces: 2 } },
  { name: 'C', location: { central: false }, categories: { nightlife: 2, dining: 2, cultural: 3, historic: 2, touristy: 1, green_spaces: 5 } },
];

test('sortNeighborhoods: recommended keeps source order and does not mutate', () => {
  const out = sortNeighborhoods(sample, 'recommended');
  assert.deepEqual(out.map((n) => n.name), ['A', 'B', 'C']);
  assert.notEqual(out, sample); // returns a copy
});

test('sortNeighborhoods: central-first puts central neighborhoods ahead', () => {
  assert.equal(sortNeighborhoods(sample, 'central')[0].name, 'B');
});

test('sortNeighborhoods: liveliest ranks by nightlife+dining', () => {
  assert.equal(sortNeighborhoods(sample, 'liveliest')[0].name, 'B'); // 5+5
});

test('sortNeighborhoods: most cultural ranks by cultural+historic', () => {
  assert.equal(sortNeighborhoods(sample, 'cultural')[0].name, 'A'); // 5+5
});

test('sortNeighborhoods: quietest ranks by low nightlife+touristy', () => {
  assert.equal(sortNeighborhoods(sample, 'quietest')[0].name, 'C'); // 2+1
});

test('sortNeighborhoods: greenest ranks by green_spaces', () => {
  assert.equal(sortNeighborhoods(sample, 'green')[0].name, 'C'); // 5
});

test('sortNeighborhoods: tolerates non-array input', () => {
  assert.deepEqual(sortNeighborhoods(null, 'liveliest'), []);
});

// ---------- getNearbyNeighborhoods ----------

const marais = { name: 'Le Marais', location: { borders: ['Bastille', 'Île de la Cité', 'République'] } };
const all = [marais, { name: 'Bastille' }, { name: 'Île de la Cité' }];

test('getNearbyNeighborhoods: resolves borders to known neighborhoods', () => {
  const nearby = getNearbyNeighborhoods(marais, all);
  assert.equal(nearby.length, 3);
  const bastille = nearby.find((b) => b.name === 'Bastille');
  assert.ok(bastille.resolved, 'Bastille resolves to a known neighborhood');
  // enriched with the hardcoded Le Marais -> Bastille walk time (10 min)
  assert.equal(bastille.walkTime, 10);
});

test('getNearbyNeighborhoods: unknown border stays unresolved (non-clickable)', () => {
  const nearby = getNearbyNeighborhoods(marais, all);
  const rep = nearby.find((b) => b.name === 'République');
  assert.equal(rep.resolved, null);
  assert.equal(rep.walkTime, null);
});

test('getNearbyNeighborhoods: empty when no borders', () => {
  assert.deepEqual(getNearbyNeighborhoods({ name: 'X', location: {} }, all), []);
  assert.deepEqual(getNearbyNeighborhoods(null), []);
});
