import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCitySelectionMessage } from '../src/lib/conversation/citySelectionMessage.js';

test('city selection preserves region, dates, and transport guidance', () => {
  const message = buildCitySelectionMessage(
    {
      name: 'Tirana',
      country: 'Albania',
      regionFocus: 'Albanian Riviera',
      routeRole: 'flight gateway',
      nextStep: 'choose a coastal base next',
      transportNote: 'flight onward to Romania is likely',
    },
    'stop',
    {
      brief: {
        targetRegions: ['Albanian Riviera', 'Romania'],
      },
    }
  );

  assert.match(message, /I'll add Tirana as the flight gateway for Albanian Riviera/);
  assert.match(message, /keep Romania in scope too/);
  assert.match(message, /assigning dates\/nights for each segment/);
  assert.match(message, /compare the best transport between stops/);
  assert.match(message, /choose a coastal base next/);
});
