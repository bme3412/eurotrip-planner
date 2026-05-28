import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySuggestedAllocation,
  buildPlannerAction,
  buildRouteSummary,
  buildSuggestedAllocation,
} from '../src/lib/conversation/plannerActions.js';

const tripState = {
  route: {
    cities: [
      { id: 'paris', name: 'Paris', country: 'France', role: 'start', order: 0, nights: 3, arrivalDate: '2025-06-19', departureDate: '2025-06-22' },
      { id: 'tirana', name: 'Tirana', country: 'Albania', role: 'stop', order: 1, nights: 0 },
      { id: 'bucharest', name: 'Bucharest', country: 'Romania', role: 'stop', order: 2, nights: 0 },
    ],
  },
  dates: {
    startDate: '2025-06-19',
    endDate: '2025-07-01',
    totalNights: 12,
  },
};

test('buildSuggestedAllocation splits unplaced nights by city', () => {
  const allocation = buildSuggestedAllocation(tripState);

  assert.deepEqual(
    allocation.segments.map((segment) => [segment.cityName, segment.nights, segment.arrivalDate, segment.departureDate]),
    [
      ['Paris', 3, '2025-06-19', '2025-06-22'],
      ['Tirana', 5, '2025-06-22', '2025-06-27'],
      ['Bucharest', 4, '2025-06-27', '2025-07-01'],
    ]
  );
});

test('planner action confirms allocation and transport next step', () => {
  const allocation = buildSuggestedAllocation(tripState);
  const next = applySuggestedAllocation(tripState, allocation);
  const action = buildPlannerAction('accept_allocation', { before: tripState, after: next });

  assert.equal(buildRouteSummary(next), 'Paris -> Tirana -> Bucharest · 12 nights · 12 placed');
  assert.match(action.confirmation, /Applied the suggested night split/);
  assert.match(action.nextPrompt, /compare transport/i);
});
