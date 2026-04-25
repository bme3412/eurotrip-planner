import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRankedCandidate,
  rankedCandidateToPlannerParams,
  rankedCandidateToPlanPrompt,
} from '@/lib/discovery/rankedCandidate';

test('normalizes discovery results into planner-ready candidates', () => {
  const candidate = normalizeRankedCandidate({
    cityId: 'paris',
    cityName: 'Paris',
    country: 'France',
    score: 92,
    why: 'Great weather and major events for your dates.',
    crowdLevel: 'Moderate',
    highlights: [
      { type: 'weather', name: '21C and sunny' },
      { type: 'event', name: 'Nuit Blanche', date: 'Oct 3' },
    ],
  }, {
    rank: 1,
    startDate: '2026-10-01',
    endDate: '2026-10-08',
  });

  assert.equal(candidate.cityId, 'paris');
  assert.equal(candidate.name, 'Paris');
  assert.equal(candidate.rank, 1);
  assert.equal(candidate.reason, 'Great weather and major events for your dates.');
  assert.equal(candidate.weather.label, '21C and sunny');
  assert.equal(candidate.events[0].name, 'Nuit Blanche');
  assert.deepEqual(candidate.dateWindow, {
    start: '2026-10-01',
    end: '2026-10-08',
  });
});

test('builds a seeded planner prompt and query params from ranking context', () => {
  const source = {
    cityId: 'lisbon',
    cityName: 'Lisbon',
    country: 'Portugal',
    reason: 'Strong value, warm weather, and lower crowds.',
    dateWindow: { start: '2026-04-10', end: '2026-04-17' },
    rank: 2,
  };

  const prompt = rankedCandidateToPlanPrompt(source);
  const params = rankedCandidateToPlannerParams(source);

  assert.match(prompt, /Plan a trip to Lisbon, Portugal/);
  assert.match(prompt, /2026-04-10 to 2026-04-17/);
  assert.equal(params.get('city'), 'lisbon');
  assert.equal(params.get('cityName'), 'Lisbon');
  assert.equal(params.get('rank'), '2');
  assert.match(params.get('q'), /Strong value/);
});
