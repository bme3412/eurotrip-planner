import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConciergeContext, timeToMinutes, minutesToTime } from '../src/lib/concierge/buildContext.js';
import { generateConciergeDay } from '../src/lib/concierge/generateBrief.js';

// Normalized trip as returned by getTripWithDetails (days[].activities[]).
const trip = {
  id: 'trip-ctx-1',
  city: 'paris',
  country: 'France',
  pace: 3,
  interests: ['food', 'art', 'history'],
  start_date: '2026-06-09',
  end_date: '2026-06-11',
  updated_at: '2026-06-01T00:00:00Z',
  days: [
    {
      date: '2026-06-09',
      day_number: 1,
      city: 'paris',
      activities: [
        { time_block: 'morning', start_time: '09:30:00', name: 'Louvre Museum', type: 'museum', neighborhood: '1st arrondissement', indoor: true },
        { time_block: 'afternoon', start_time: '14:00:00', name: 'Tuileries stroll', type: 'park', indoor: false },
      ],
    },
    {
      date: '2026-06-10',
      day_number: 2,
      city: 'paris',
      is_travel_day: true,
      activities: [{ time_block: 'morning', start_time: '08:00:00', name: 'Train to Lyon', type: 'transfer' }],
    },
    {
      date: '2026-06-11',
      day_number: 3,
      city: 'lyon',
      activities: [{ time_block: 'morning', start_time: '10:00:00', name: 'Vieux Lyon walk', type: 'walk' }],
    },
  ],
};

describe('time helpers', () => {
  it('round-trips HH:MM through minutes', () => {
    assert.equal(timeToMinutes('09:30'), 570);
    assert.equal(minutesToTime(570), '09:30');
    assert.equal(timeToMinutes('nope'), null);
  });
});

describe('buildConciergeContext', () => {
  const ctx = buildConciergeContext(trip);

  it('summarizes the trip in meta (cities in order, real vs travel days)', () => {
    assert.equal(ctx.meta.cityName, 'Paris');
    assert.deepEqual(ctx.meta.cities, ['Paris', 'Lyon']);
    assert.equal(ctx.meta.totalDays, 3);
    assert.equal(ctx.meta.totalRealDays, 2);
  });

  it('builds the day scaffold with first activities and travel flags', () => {
    assert.equal(ctx.days.length, 3);
    assert.deepEqual(ctx.days[0].firstActivity, {
      name: 'Louvre Museum',
      startTime: '09:30',
      neighborhood: '1st arrondissement',
    });
    assert.equal(ctx.days[1].isTravelDay, true);
    assert.equal(ctx.days[1].touchCount, 1);
  });

  it('selects the first real day by default, with depart-by 30min before the first stop', () => {
    const d = ctx.selectedDay;
    assert.equal(d.dayNumber, 1);
    assert.equal(d.cityName, 'Paris');
    assert.equal(d.departBy, '09:00');
    assert.equal(d.schedule.length, 2);
    assert.deepEqual(d.schedule.map((s) => s.time), ['09:30', '14:00']);
    assert.deepEqual(d.schedule.map((s) => s.indoor), [true, false]);
  });

  it('selects a requested day (skipping travel days)', () => {
    const lyon = buildConciergeContext(trip, { dayNumber: 3 }).selectedDay;
    assert.equal(lyon.dayNumber, 3);
    assert.equal(lyon.cityName, 'Lyon');

    // Requesting the travel day falls back to the first real day.
    const fallback = buildConciergeContext(trip, { dayNumber: 2 }).selectedDay;
    assert.equal(fallback.dayNumber, 1);
  });

  it('derives personalization from trip fields', () => {
    assert.equal(ctx.personalization.pace, 'moderate');
    assert.deepEqual(ctx.personalization.interests, ['food', 'art', 'history']);
    assert.equal(ctx.personalization.hotelName, null);
  });
});

describe('generateConciergeDay (fallback path, no API key)', () => {
  it('assembles a complete brief bundle from deterministic facts', async () => {
    const savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await generateConciergeDay(trip);

      assert.equal(result.source, 'fallback');
      assert.equal(result.day.dayNumber, 1);
      assert.equal(result.day.cityName, 'Paris');
      assert.equal(result.days.length, 3);
      assert.equal(result.day.schedule.length, 2);

      // All three beats present with body + meta status line.
      for (const beat of ['eveningBrief', 'morningWakeup', 'windDown']) {
        const b = result.day.briefs[beat];
        assert.ok(b?.body, `${beat} has a body`);
        assert.ok(b?.meta, `${beat} has a meta line`);
      }
      assert.match(result.day.pushLine, /Louvre Museum/);
      assert.ok(result.day.sampleAsk?.question);
    } finally {
      if (savedKey != null) process.env.ANTHROPIC_API_KEY = savedKey;
    }
  });
});
