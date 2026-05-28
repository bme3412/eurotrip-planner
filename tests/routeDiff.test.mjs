import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  diffRoute,
  mergeDiffs,
  renderStateChangesBlock,
} from '../src/lib/conversation/routeDiff.js';

function state(cities) {
  return { route: { cities } };
}

test('diffRoute: identical routes report no changes', () => {
  const a = state([
    { id: 'paris', name: 'Paris', nights: 3 },
    { id: 'menton', name: 'Menton', nights: 2 },
  ]);
  const b = state([
    { id: 'paris', name: 'Paris', nights: 3 },
    { id: 'menton', name: 'Menton', nights: 2 },
  ]);
  const diff = diffRoute(a, b);
  assert.equal(diff.hasChanges, false);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
});

test('diffRoute: detects a removed city by id', () => {
  const a = state([
    { id: 'paris', name: 'Paris' },
    { id: 'menton', name: 'Menton' },
  ]);
  const b = state([{ id: 'paris', name: 'Paris' }]);
  const diff = diffRoute(a, b);
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.removed[0].name, 'Menton');
});

test('diffRoute: matches by name when id is missing', () => {
  const a = state([
    { name: 'Paris' },
    { name: 'Menton' },
  ]);
  const b = state([{ name: 'Paris' }]);
  const diff = diffRoute(a, b);
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.removed[0].name, 'Menton');
});

test('diffRoute: detects added cities', () => {
  const a = state([{ id: 'paris', name: 'Paris' }]);
  const b = state([
    { id: 'paris', name: 'Paris' },
    { id: 'rome', name: 'Rome' },
  ]);
  const diff = diffRoute(a, b);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.added[0].name, 'Rome');
  assert.deepEqual(diff.removed, []);
});

test('diffRoute: detects nights change', () => {
  const a = state([{ id: 'paris', name: 'Paris', nights: 3 }]);
  const b = state([{ id: 'paris', name: 'Paris', nights: 5 }]);
  const diff = diffRoute(a, b);
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.nightsChanged.length, 1);
  assert.deepEqual(diff.nightsChanged[0], {
    id: 'paris',
    name: 'Paris',
    from: 3,
    to: 5,
  });
});

test('diffRoute: detects reorder when set is unchanged', () => {
  const a = state([
    { id: 'paris', name: 'Paris' },
    { id: 'rome', name: 'Rome' },
  ]);
  const b = state([
    { id: 'rome', name: 'Rome' },
    { id: 'paris', name: 'Paris' },
  ]);
  const diff = diffRoute(a, b);
  assert.equal(diff.reordered, true);
  assert.equal(diff.added.length, 0);
  assert.equal(diff.removed.length, 0);
});

test('diffRoute: tolerates missing/null route', () => {
  assert.equal(diffRoute(null, null).hasChanges, false);
  assert.equal(diffRoute({}, {}).hasChanges, false);
  const diff = diffRoute({ route: { cities: null } }, state([{ id: 'paris', name: 'Paris' }]));
  assert.equal(diff.added.length, 1);
});

test('mergeDiffs: cancels out add-then-remove for the same city', () => {
  const first = diffRoute(state([{ id: 'paris', name: 'Paris' }]), state([
    { id: 'paris', name: 'Paris' },
    { id: 'rome', name: 'Rome' },
  ]));
  const second = diffRoute(
    state([
      { id: 'paris', name: 'Paris' },
      { id: 'rome', name: 'Rome' },
    ]),
    state([{ id: 'paris', name: 'Paris' }]),
  );
  const merged = mergeDiffs(first, second);
  assert.equal(merged.added.length, 0);
  assert.equal(merged.removed.length, 0);
  assert.equal(merged.hasChanges, false);
});

test('mergeDiffs: preserves separate removals across sub-steps', () => {
  const first = diffRoute(
    state([
      { id: 'paris', name: 'Paris' },
      { id: 'menton', name: 'Menton' },
      { id: 'nice', name: 'Nice' },
    ]),
    state([
      { id: 'paris', name: 'Paris' },
      { id: 'nice', name: 'Nice' },
    ]),
  );
  const second = diffRoute(
    state([
      { id: 'paris', name: 'Paris' },
      { id: 'nice', name: 'Nice' },
    ]),
    state([{ id: 'paris', name: 'Paris' }]),
  );
  const merged = mergeDiffs(first, second);
  const names = merged.removed.map((c) => c.name).sort();
  assert.deepEqual(names, ['Menton', 'Nice']);
});

test('renderStateChangesBlock: empty diff returns empty string', () => {
  assert.equal(renderStateChangesBlock(null), '');
  assert.equal(renderStateChangesBlock({ added: [], removed: [], nightsChanged: [], reordered: false, hasChanges: false }), '');
});

test('renderStateChangesBlock: includes the server-tag and removed names', () => {
  const diff = diffRoute(
    state([
      { id: 'paris', name: 'Paris' },
      { id: 'menton', name: 'Menton' },
    ]),
    state([{ id: 'paris', name: 'Paris' }]),
  );
  const text = renderStateChangesBlock(diff);
  assert.match(text, /Recent State Changes/);
  assert.match(text, /server-derived/);
  assert.match(text, /Menton/);
  assert.match(text, /remove_cities/);
});
