import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeClientDedupKey,
  getClientDedupKey,
  ensureClientDedupKey,
} from '../src/lib/trips/clientDedupKey.js';

test('makeClientDedupKey returns a non-empty unique string each call', () => {
  const a = makeClientDedupKey();
  const b = makeClientDedupKey();
  assert.equal(typeof a, 'string');
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test('getClientDedupKey reads meta.clientDedupKey, null when absent', () => {
  assert.equal(getClientDedupKey({ meta: { clientDedupKey: 'k1' } }), 'k1');
  assert.equal(getClientDedupKey({ meta: {} }), null);
  assert.equal(getClientDedupKey({}), null);
  assert.equal(getClientDedupKey(null), null);
});

test('ensureClientDedupKey mints a key and stamps it into meta', () => {
  const { key, tripState } = ensureClientDedupKey({ route: { cities: [] } });
  assert.ok(key);
  assert.equal(tripState.meta.clientDedupKey, key);
  // Other fields are preserved.
  assert.deepEqual(tripState.route, { cities: [] });
});

test('ensureClientDedupKey reuses an existing key (stable identity across edits)', () => {
  const first = ensureClientDedupKey({ dates: { totalNights: 3 } });
  // Simulate an edit: new object, same meta carried forward.
  const edited = { ...first.tripState, dates: { totalNights: 5 } };
  const second = ensureClientDedupKey(edited);
  assert.equal(second.key, first.key);
  assert.equal(second.tripState.meta.clientDedupKey, first.key);
});

test('ensureClientDedupKey does not mutate the input', () => {
  const input = { meta: { other: 'x' } };
  const { tripState } = ensureClientDedupKey(input);
  assert.equal(input.meta.clientDedupKey, undefined);
  assert.equal(tripState.meta.other, 'x');
  assert.ok(tripState.meta.clientDedupKey);
});
