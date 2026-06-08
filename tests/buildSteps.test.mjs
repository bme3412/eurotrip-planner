import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildBuildSteps } from '../src/lib/planning/buildSteps.js';

const tripStateWith = (cities) => ({ route: { cities } });

test('buildBuildSteps: multi-city → route, per-city, transport, polish', () => {
  const steps = buildBuildSteps(tripStateWith([
    { id: 'paris', name: 'Paris', order: 0 },
    { id: 'berlin', name: 'Berlin', order: 1 },
  ]));
  assert.deepEqual(steps.map((s) => s.label), [
    'Mapping your route',
    'Planning Paris',
    'Planning Berlin',
    'Adding transport between cities',
    'Polishing the details',
  ]);
});

test('buildBuildSteps: single city → no transport step', () => {
  const steps = buildBuildSteps(tripStateWith([{ id: 'paris', name: 'Paris', order: 0 }]));
  assert.deepEqual(steps.map((s) => s.label), [
    'Mapping your route',
    'Planning Paris',
    'Polishing the details',
  ]);
});

test('buildBuildSteps: respects city order and drops cities missing id/name', () => {
  const steps = buildBuildSteps(tripStateWith([
    { id: 'berlin', name: 'Berlin', order: 2 },
    { id: 'paris', name: 'Paris', order: 1 },
    { id: 'x' }, // no name → dropped
  ]));
  assert.deepEqual(
    steps.filter((s) => s.id.startsWith('city:')).map((s) => s.city.name),
    ['Paris', 'Berlin'],
  );
});

test('buildBuildSteps: empty route still yields route + polish', () => {
  assert.deepEqual(buildBuildSteps(tripStateWith([])).map((s) => s.id), ['route', 'polish']);
  assert.deepEqual(buildBuildSteps({}).map((s) => s.id), ['route', 'polish']);
});
