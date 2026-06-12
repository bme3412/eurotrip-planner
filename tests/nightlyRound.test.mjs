import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pushLineFrom, resolveRoundDay, buildNightlyRoundPrompt } from '@/lib/concierge/nightlyRound';
import { resolvePersona } from '@/lib/concierge/personas';

describe('pushLineFrom', () => {
  it('takes the first sentence', () => {
    assert.equal(
      pushLineFrom('Tomorrow opens with the Louvre at 9. Wear comfortable shoes.'),
      'Tomorrow opens with the Louvre at 9.'
    );
  });

  it('caps at 90 chars with an ellipsis', () => {
    const long = `${'word '.repeat(30)}end.`;
    const line = pushLineFrom(long);
    assert.ok(line.length <= 90);
    assert.ok(line.endsWith('…'));
  });

  it('collapses whitespace and handles missing punctuation', () => {
    assert.equal(pushLineFrom('No punctuation here\nat all'), 'No punctuation here at all');
    assert.equal(pushLineFrom(''), null);
    assert.equal(pushLineFrom(null), null);
  });
});

describe('resolveRoundDay', () => {
  const ctx = {
    days: [
      { dayNumber: 1, date: '2026-06-19', isTravelDay: false },
      { dayNumber: 2, date: '2026-06-20', isTravelDay: false },
      { dayNumber: 3, date: '2026-06-21', isTravelDay: true },
      { dayNumber: 4, date: '2026-06-22', isTravelDay: false },
    ],
  };

  it('before the trip → the first real day', () => {
    assert.equal(resolveRoundDay(ctx, '2026-06-10T20:00:00Z'), 1);
  });

  it('mid-trip → the next real day after today (skipping travel days)', () => {
    assert.equal(resolveRoundDay(ctx, '2026-06-19T20:00:00Z'), 2);
    assert.equal(resolveRoundDay(ctx, '2026-06-20T20:00:00Z'), 4); // day 3 is travel
  });

  it('on the last day → stays on the last real day', () => {
    assert.equal(resolveRoundDay(ctx, '2026-06-22T20:00:00Z'), 4);
  });

  it('after the trip → the first real day; no real days → null', () => {
    assert.equal(resolveRoundDay(ctx, '2026-07-10T20:00:00Z'), 1);
    assert.equal(resolveRoundDay({ days: [{ dayNumber: 1, isTravelDay: true }] }, '2026-06-10T00:00:00Z'), null);
  });
});

describe('buildNightlyRoundPrompt', () => {
  const ctx = {
    days: [
      { dayNumber: 1, dateLabel: 'Fri, Jun 19', cityName: 'Paris', city: 'paris', country: 'France' },
      { dayNumber: 2, dateLabel: 'Sat, Jun 20', cityName: 'Paris', city: 'paris', country: 'France' },
    ],
    meta: { cities: ['Paris'], cityName: 'Paris', totalRealDays: 2 },
    personalization: { pace: 'balanced', interests: ['Culture & History'] },
  };
  const d = {
    dayNumber: 1,
    dateLabel: 'Fri, Jun 19',
    cityName: 'Paris',
    city: 'paris',
    country: 'France',
    theme: 'Île de la Cité',
    departBy: '08:45',
    firstActivity: { name: 'Sainte-Chapelle', startTime: '09:00', neighborhood: '1st' },
    hotelName: 'Hotel X',
    nextCity: 'Berlin',
  };

  it('contains the marching orders, the day facts, and the traveler profile', () => {
    const persona = resolvePersona({ country: d.country, city: d.city });
    const prompt = buildNightlyRoundPrompt({ ctx, d, persona, handoff: null, memoryDigest: '- hates crowds' });
    assert.match(prompt, /evening before Day 1/);
    assert.match(prompt, /check_hours for Day 1/);
    assert.match(prompt, /get_weather for Day 1/);
    assert.match(prompt, /Sainte-Chapelle at 09:00 \(1st\)/);
    assert.match(prompt, /Suggested depart-by: 08:45/);
    assert.match(prompt, /they move to Berlin/);
    assert.match(prompt, /hates crowds/);
    assert.match(prompt, /propose_itinerary_change ONCE/);
  });

  it('adds the handoff instruction when tomorrow belongs to another persona', () => {
    const persona = resolvePersona({ country: d.country, city: d.city });
    const handoff = { toCity: 'Berlin', toPersona: { name: 'Lena', id: 'lena_berlin' } };
    const prompt = buildNightlyRoundPrompt({ ctx, d, persona, handoff });
    assert.match(prompt, /HANDOFF: .*Berlin — Lena/);
  });
});
