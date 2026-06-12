import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeMessage, BEAT_KINDS } from '../src/lib/concierge/thread.js';
import { normalizeFact, formatMemoryDigest } from '../src/lib/concierge/memories.js';
import { currentDayNumber, itinerarySketch, buildAgentSystemPrompt, threadToMessages } from '../src/lib/concierge/agentPrompt.js';
import { buildConciergeContext } from '../src/lib/concierge/buildContext.js';
import { execAgentTool } from '../src/lib/concierge/agentToolsThread.js';

const trip = {
  id: 'trip-agent-1',
  city: 'paris',
  country: 'France',
  pace: 3,
  interests: ['food', 'art'],
  start_date: '2026-06-09',
  end_date: '2026-06-11',
  updated_at: '2026-06-01T00:00:00Z',
  days: [
    {
      date: '2026-06-09',
      day_number: 1,
      city: 'paris',
      activities: [
        { time_block: 'morning', start_time: '09:30:00', name: 'Louvre Museum', type: 'museum', neighborhood: '1st arrondissement', latitude: 48.8606, longitude: 2.3376 },
      ],
    },
    { date: '2026-06-10', day_number: 2, city: 'paris', is_travel_day: true, activities: [{ time_block: 'morning', start_time: '08:00:00', name: 'Train to Lyon', type: 'transfer' }] },
    { date: '2026-06-11', day_number: 3, city: 'lyon', activities: [{ time_block: 'morning', start_time: '10:00:00', name: 'Vieux Lyon walk', type: 'walk' }] },
  ],
};
const ctx = buildConciergeContext(trip);

describe('thread normalizeMessage', () => {
  it('accepts chat and trims/limits the body', () => {
    const { record } = normalizeMessage({ role: 'user', body: '  hello  ' });
    assert.equal(record.body, 'hello');
    assert.equal(record.kind, 'chat');
    assert.equal(record.channel, 'app');
    assert.equal(record.day_number, null);
  });

  it('requires a dayNumber for beat kinds', () => {
    for (const kind of BEAT_KINDS) {
      assert.ok(normalizeMessage({ role: 'olivier', kind, body: 'x' }).error, `${kind} without day`);
      assert.ok(normalizeMessage({ role: 'olivier', kind, body: 'x', dayNumber: 2 }).record, `${kind} with day`);
    }
  });

  it('rejects bad role/kind/channel/empty body', () => {
    assert.ok(normalizeMessage({ role: 'assistant', body: 'x' }).error);
    assert.ok(normalizeMessage({ role: 'user', kind: 'nope', body: 'x' }).error);
    assert.ok(normalizeMessage({ role: 'user', body: 'x', channel: 'sms' }).error);
    assert.ok(normalizeMessage({ role: 'user', body: '   ' }).error);
  });
});

describe('memories', () => {
  it('normalizes facts and formats the digest', () => {
    assert.equal(normalizeFact('  Hates crowds  ').fact, 'Hates crowds');
    assert.ok(normalizeFact('').error);
    assert.equal(formatMemoryDigest([{ fact: 'Vegetarian' }, { fact: ' Hates crowds ' }, { fact: '' }]), '- Vegetarian\n- Hates crowds');
    assert.equal(formatMemoryDigest([]), null);
  });
});

describe('agent prompt', () => {
  it('anchors "today" to the trip calendar', () => {
    assert.equal(currentDayNumber(ctx, '2026-06-09T10:00:00Z'), 1);
    assert.equal(currentDayNumber(ctx, '2026-06-10T10:00:00Z'), 2);
    assert.equal(currentDayNumber(ctx, '2026-06-01T10:00:00Z'), 0); // before
    assert.equal(currentDayNumber(ctx, '2026-07-01T10:00:00Z'), null); // after
  });

  it('sketches the itinerary with travel days marked', () => {
    const sketch = itinerarySketch(ctx);
    assert.match(sketch, /Day 1 .*Paris: Louvre Museum @ 09:30/);
    assert.match(sketch, /Day 2 .*travel day/);
  });

  it('builds a grounded system prompt with memory and temporal anchor', () => {
    const system = buildAgentSystemPrompt({ ctx, memoryDigest: '- Vegetarian', todayIso: '2026-06-09T08:00:00Z' });
    assert.match(system, /Today is Day 1 of the trip/);
    assert.match(system, /WHAT YOU REMEMBER ABOUT THEM\n- Vegetarian/);
    assert.match(system, /Paris → Lyon/);
    assert.match(system, /never invent venue names/i);
  });

  it('converts thread rows to alternating Anthropic messages', () => {
    const rows = [
      { role: 'olivier', kind: 'evening_brief', day_number: 1, body: 'Tomorrow: the Louvre.' },
      { role: 'user', kind: 'chat', body: 'Can we go later?' },
      { role: 'user', kind: 'chat', body: 'Like 11?' },
      { role: 'olivier', kind: 'chat', body: 'Easily.' },
      { role: 'user', kind: 'chat', body: 'Great.' },
    ];
    const msgs = threadToMessages(rows);
    // Leading assistant beat is dropped (API requires user-first)…
    assert.equal(msgs[0].role, 'user');
    // …consecutive user turns merge…
    assert.match(msgs[0].content, /Can we go later\?\n\nLike 11\?/);
    assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant', 'user']);
  });

  it('tags beat bodies so the model knows it already sent them', () => {
    const rows = [
      { role: 'user', kind: 'chat', body: 'hi' },
      { role: 'olivier', kind: 'evening_brief', day_number: 3, body: 'Lyon tomorrow.' },
    ];
    const msgs = threadToMessages(rows);
    assert.match(msgs[1].content, /^\[evening brief · day 3\] Lyon tomorrow\./);
  });
});

describe('agent tools (read-only)', () => {
  const env = { ctx, supabase: null, userId: 'u-1', tripId: trip.id };

  it('get_day_details returns the deterministic day', async () => {
    const r = await execAgentTool('get_day_details', { dayNumber: 1 }, env);
    assert.equal(r.city, 'Paris');
    assert.equal(r.departBy, '09:00');
    assert.equal(r.schedule[0].name, 'Louvre Museum');
    const missing = await execAgentTool('get_day_details', { dayNumber: 9 }, env);
    assert.ok(missing.error);
  });

  it('get_directions returns maps links for mappable stops', async () => {
    const r = await execAgentTool('get_directions', { dayNumber: 1 }, env);
    assert.equal(r.legs.length, 1);
    assert.match(r.legs[0].url, /google\.com\/maps/);
  });

  it('remember validates through rememberFact', async () => {
    let inserted = null;
    const supabase = {
      from(table) {
        assert.equal(table, 'concierge_memories');
        return { insert: (row) => { inserted = row; return Promise.resolve({ error: null }); } };
      },
    };
    const r = await execAgentTool('remember', { fact: 'Hates crowds', scope: 'always' }, { ...env, supabase });
    assert.equal(r.remembered, 'Hates crowds');
    assert.equal(inserted.trip_id, null); // 'always' → cross-trip
    const bad = await execAgentTool('remember', { fact: '' }, { ...env, supabase });
    assert.ok(bad.error);
  });

  it('unknown tools fail soft', async () => {
    const r = await execAgentTool('time_travel', {}, env);
    assert.ok(r.error);
  });
});
