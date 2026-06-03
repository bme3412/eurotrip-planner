import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getCityData } from '../src/lib/data-utils.js';
import { buildItinerary } from '../src/lib/planning/buildItinerary.js';
import { toDbTimeBlock, DB_TIME_BLOCKS } from '../src/lib/trips/tripsRepository.js';

// Regression: the itinerary builder uses fine-grained time slots
// (early_morning / late_morning / late_afternoon) that the trip_activities
// DB CHECK constraint does NOT allow. Persisting them raised a 500. Every time
// value the builder can emit must map to an allowed DB block.

test('toDbTimeBlock only ever returns DB-allowed values', () => {
  const inputs = [
    'early_morning', 'morning', 'late_morning', 'lunch', 'noon',
    'afternoon', 'late_afternoon', 'evening', 'night', 'whatever', '', null, undefined,
  ];
  for (const i of inputs) {
    assert.ok(DB_TIME_BLOCKS.includes(toDbTimeBlock(i)), `"${i}" → ${toDbTimeBlock(i)} not allowed`);
  }
});

test('every time block a generated itinerary emits is DB-persistable', async () => {
  const paris = await getCityData('paris');
  // Cover all three pace profiles (active uses the widest slot set).
  for (const pace of ['relaxed', 'balanced', 'active']) {
    const it = buildItinerary(
      { city: 'paris', start_date: '2026-07-12', end_date: '2026-07-16', pace, interests: ['Culture & History'] },
      paris,
    );
    for (const day of it.days) {
      for (const tb of day.timeBlocks) {
        assert.ok(
          DB_TIME_BLOCKS.includes(toDbTimeBlock(tb.time)),
          `pace=${pace} day ${day.dayNumber} time "${tb.time}" not persistable`,
        );
      }
    }
  }
});
