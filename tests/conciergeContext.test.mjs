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
        { time_block: 'morning', start_time: '09:30:00', name: 'Louvre Museum', type: 'museum', neighborhood: '1st arrondissement', indoor: true, latitude: 48.8606, longitude: 2.3376 },
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
      type: 'museum',
      placeId: null,
      lat: 48.8606,
      lng: 2.3376,
    });
    assert.equal(ctx.days[1].isTravelDay, true);
    assert.equal(ctx.days[1].touchCount, 1);
  });

  it('carries the full deterministic day in the scaffold (instant client render)', () => {
    const d0 = ctx.days[0];
    assert.equal(d0.date, '2026-06-09');
    assert.equal(d0.departBy, '09:00');
    assert.deepEqual(d0.schedule.map((s) => s.time), ['09:30', '14:00']);
    assert.deepEqual(d0.schedule.map((s) => s.indoor), [true, false]);
    assert.equal(d0.hotelName, null);
    // Travel days carry their schedule too (the rhythm view uses it).
    assert.deepEqual(ctx.days[1].schedule.map((s) => s.name), ['Train to Lyon']);
    assert.equal(ctx.days[2].city, 'lyon');
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

  it('carries country and coordinates for persona resolution and maps links', () => {
    assert.equal(ctx.selectedDay.country, 'France');
    assert.equal(ctx.days[0].country, 'France');
    assert.deepEqual(ctx.meta.destinations, [
      { name: 'Paris', city: 'paris', country: 'France' },
      { name: 'Lyon', city: 'lyon', country: 'France' },
    ]);
    assert.equal(ctx.selectedDay.schedule[0].lat, 48.8606);
    assert.equal(ctx.selectedDay.schedule[0].lng, 2.3376);
    assert.equal(ctx.selectedDay.schedule[1].lat, null);
  });

  it('derives personalization from trip fields', () => {
    assert.equal(ctx.personalization.pace, 'moderate');
    assert.deepEqual(ctx.personalization.interests, ['food', 'art', 'history']);
    assert.equal(ctx.personalization.hotelName, null);
  });
});

// Multi-country trip: day countries come from per-day rows, the trip cities[]
// array, then the trip-level country, in that order.
const multiCountryTrip = {
  id: 'trip-ctx-2',
  city: 'paris',
  country: null,
  pace: 3,
  start_date: '2026-09-01',
  end_date: '2026-09-03',
  updated_at: '2026-08-01T00:00:00Z',
  cities: [
    { id: 'paris', name: 'Paris', country: 'France' },
    { id: 'rome', name: 'Rome', country: 'Italy' },
    { id: 'venice', name: 'Venice', country: 'Italy' },
  ],
  days: [
    {
      date: '2026-09-01',
      day_number: 1,
      city: 'paris',
      country: 'France',
      activities: [{ time_block: 'morning', start_time: '10:00:00', name: 'Musée d’Orsay', type: 'museum' }],
    },
    {
      date: '2026-09-02',
      day_number: 2,
      city: 'rome',
      // country intentionally missing — falls back to trip.cities[].country
      activities: [{ time_block: 'morning', start_time: '09:00:00', name: 'Colosseum', type: 'landmark' }],
    },
    {
      date: '2026-09-03',
      day_number: 3,
      city: 'venice',
      country: 'Italy',
      activities: [{ time_block: 'morning', start_time: '10:00:00', name: 'Doge’s Palace', type: 'palace' }],
    },
  ],
};

describe('buildConciergeContext (multi-country)', () => {
  it('resolves each day country with the cities[] fallback', () => {
    const ctx = buildConciergeContext(multiCountryTrip);
    assert.deepEqual(ctx.days.map((d) => d.country), ['France', 'Italy', 'Italy']);
    assert.deepEqual(ctx.meta.destinations.map((d) => d.country), ['France', 'Italy', 'Italy']);
  });

  it('exposes tomorrow’s slug and country for handoff detection', () => {
    const paris = buildConciergeContext(multiCountryTrip, { dayNumber: 1 }).selectedDay;
    assert.equal(paris.country, 'France');
    assert.equal(paris.nextCity, 'Rome');
    assert.equal(paris.nextCitySlug, 'rome');
    assert.equal(paris.nextCountry, 'Italy');

    const venice = buildConciergeContext(multiCountryTrip, { dayNumber: 3 }).selectedDay;
    assert.equal(venice.nextCity, null);
    assert.equal(venice.nextCountry, null);
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

      // France days stay with Olivier himself.
      assert.equal(result.day.persona?.id, 'olivier');
      assert.match(result.day.signoff, /Olivier/);
    } finally {
      if (savedKey != null) process.env.ANTHROPIC_API_KEY = savedKey;
    }
  });

  it('fronts the local persona and hands off at country borders', async () => {
    const savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      // Italy day → Giulia fronts the brief.
      const rome = await generateConciergeDay(multiCountryTrip, 2);
      assert.equal(rome.source, 'fallback');
      assert.equal(rome.day.persona?.id, 'giulia-rome');
      assert.equal(rome.day.persona?.name, 'Giulia');
      assert.match(rome.day.signoff, /Giulia/);
      // Rome→Venice is a city-override handoff (Giulia → Marco).
      assert.equal(rome.day.handoff?.toPersona?.id, 'marco-venice');
      assert.match(rome.day.briefs.windDown.tomorrowTease, /Marco/);

      // Paris day → Olivier, handing off to Giulia tomorrow.
      const paris = await generateConciergeDay(multiCountryTrip, 1);
      assert.equal(paris.day.persona?.id, 'olivier');
      assert.equal(paris.day.handoff?.toPersona?.id, 'giulia-rome');

      // Last day → no handoff.
      const venice = await generateConciergeDay(multiCountryTrip, 3);
      assert.equal(venice.day.persona?.id, 'marco-venice');
      assert.equal(venice.day.handoff, null);
    } finally {
      if (savedKey != null) process.env.ANTHROPIC_API_KEY = savedKey;
    }
  });
});
