import { test } from 'node:test';
import assert from 'node:assert/strict';

import { enrichItineraryLLM } from '../src/lib/planning/enrichItineraryLLM.js';

const SAMPLE = {
  routeType: 'multi-city',
  cities: [{ name: 'Paris' }],
  summary: 'A short trip.',
  days: [
    {
      dayNumber: 1, isTravelDay: false, cityName: 'Paris', theme: 'Old Town',
      timeBlocks: [{ time: 'morning', activity: { name: 'Louvre', type: 'Museum', description: 'Art.' } }],
    },
  ],
};

test('enrich disabled via env returns the itinerary unchanged', async () => {
  const prev = process.env.ITINERARY_LLM_ENRICH;
  process.env.ITINERARY_LLM_ENRICH = 'false';
  try {
    const out = await enrichItineraryLLM(SAMPLE, {});
    assert.equal(out, SAMPLE, 'same reference returned when disabled');
  } finally {
    if (prev === undefined) delete process.env.ITINERARY_LLM_ENRICH;
    else process.env.ITINERARY_LLM_ENRICH = prev;
  }
});

test('enrich without API key returns the itinerary unchanged', async () => {
  const prevFlag = process.env.ITINERARY_LLM_ENRICH;
  const prevKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ITINERARY_LLM_ENRICH;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const out = await enrichItineraryLLM(SAMPLE, {});
    assert.equal(out, SAMPLE, 'same reference returned when keyless');
    assert.equal(out.days[0].theme, 'Old Town', 'deterministic content intact');
  } finally {
    if (prevFlag !== undefined) process.env.ITINERARY_LLM_ENRICH = prevFlag;
    if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
  }
});

test('enrich tolerates a malformed itinerary', async () => {
  const out = await enrichItineraryLLM({ foo: 'bar' }, {});
  assert.deepEqual(out, { foo: 'bar' });
});
