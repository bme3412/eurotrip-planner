import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTime,
  timeBlockForTime,
  resolveActivity,
  buildProposal,
  applyProposal,
} from '../src/lib/concierge/tripActions.js';

// Raw normalized trip shape (getTripWithDetails): DB rows with ids.
const trip = {
  id: 'trip-1',
  days: [
    {
      id: 'day-1',
      day_number: 1,
      city: 'paris',
      is_travel_day: false,
      theme: 'Museums',
      notes: null,
      activities: [
        { id: 'act-1', name: 'Louvre Museum', start_time: '09:30:00', time_block: 'morning', status: 'planned' },
        { id: 'act-2', name: 'Musée d’Orsay', start_time: '14:00:00', time_block: 'afternoon', status: 'planned' },
        { id: 'act-3', name: 'Old café', start_time: '11:00:00', time_block: 'lunch', status: 'skipped' },
      ],
    },
    {
      id: 'day-2',
      day_number: 2,
      city: 'paris',
      is_travel_day: false,
      theme: 'Marais',
      notes: 'Pack light',
      activities: [{ id: 'act-4', name: 'Picasso Museum', start_time: '10:00:00', time_block: 'morning', status: 'planned' }],
    },
    { id: 'day-3', day_number: 3, city: 'berlin', is_travel_day: true, activities: [] },
    {
      id: 'day-4',
      day_number: 4,
      city: 'berlin',
      is_travel_day: false,
      theme: 'Mitte',
      activities: [{ id: 'act-5', name: 'Museum Island', start_time: '09:00:00', time_block: 'morning', status: 'planned' }],
    },
  ],
};

/** Fake supabase capturing update calls; chainable like the real builder. */
function fakeSupabase() {
  const calls = [];
  const builder = (table) => {
    const call = { table, updates: null, filters: [] };
    const api = {
      update(u) { call.updates = u; return api; },
      eq(col, val) { call.filters.push(['eq', col, val]); calls.push(call); return Promise.resolve({ error: null }); },
      in(col, vals) { call.filters.push(['in', col, vals]); calls.push(call); return Promise.resolve({ error: null }); },
    };
    return api;
  };
  return { from: builder, calls };
}

describe('time helpers', () => {
  it('normalizes and maps times to permitted blocks', () => {
    assert.equal(normalizeTime('9:05'), '09:05');
    assert.equal(normalizeTime('23:59'), '23:59');
    assert.equal(normalizeTime('24:00'), null);
    assert.equal(normalizeTime('lunchtime'), null);
    assert.equal(timeBlockForTime('08:00'), 'morning');
    assert.equal(timeBlockForTime('11:30'), 'lunch');
    assert.equal(timeBlockForTime('15:00'), 'afternoon');
    assert.equal(timeBlockForTime('19:00'), 'evening');
    assert.equal(timeBlockForTime('22:00'), 'night');
  });
});

describe('resolveActivity', () => {
  const day = trip.days[0];
  it('matches exactly, then by unique substring, ignoring skipped stops', () => {
    assert.equal(resolveActivity(day, 'louvre museum').activity.id, 'act-1');
    assert.equal(resolveActivity(day, 'orsay').activity.id, 'act-2');
    assert.ok(resolveActivity(day, 'café').error, 'skipped stops are not matchable');
  });
  it('errors helpfully on ambiguity and misses', () => {
    assert.match(resolveActivity(day, 'mus').error, /matches several/);
    assert.match(resolveActivity(day, 'Eiffel').error, /That day has: Louvre Museum, Musée d’Orsay/);
  });
});

describe('buildProposal', () => {
  it('move: validates times, day targets, travel days', () => {
    const ok = buildProposal(trip, { action: 'move_activity', dayNumber: 1, activityName: 'louvre', toTime: '11:30' });
    assert.match(ok.proposal.diff, /Move “Louvre Museum” from Day 1 \(paris\) 09:30 to 11:30/);
    assert.equal(ok.proposal.intent.activityName, 'Louvre Museum');

    const cross = buildProposal(trip, { action: 'move_activity', dayNumber: 1, activityName: 'orsay', toDayNumber: 2 });
    assert.match(cross.proposal.diff, /to Day 2 \(paris\)/);

    assert.ok(buildProposal(trip, { action: 'move_activity', dayNumber: 1, activityName: 'louvre' }).error, 'needs a target');
    assert.ok(buildProposal(trip, { action: 'move_activity', dayNumber: 1, activityName: 'louvre', toTime: 'noonish' }).error);
    assert.ok(buildProposal(trip, { action: 'move_activity', dayNumber: 1, activityName: 'louvre', toDayNumber: 3 }).error, 'travel day target');
    assert.ok(buildProposal(trip, { action: 'move_activity', dayNumber: 9, activityName: 'louvre', toTime: '11:00' }).error, 'missing day');
  });

  it('swap_days: same-city real days only', () => {
    assert.ok(buildProposal(trip, { action: 'swap_days', dayNumber: 1, toDayNumber: 2 }).proposal);
    assert.ok(buildProposal(trip, { action: 'swap_days', dayNumber: 1, toDayNumber: 1 }).error);
    assert.ok(buildProposal(trip, { action: 'swap_days', dayNumber: 1, toDayNumber: 3 }).error, 'travel day');
    assert.match(buildProposal(trip, { action: 'swap_days', dayNumber: 1, toDayNumber: 4 }).error, /different cities/);
  });

  it('remove + note', () => {
    assert.match(buildProposal(trip, { action: 'remove_activity', dayNumber: 2, activityName: 'picasso' }).proposal.diff, /Skip “Picasso Museum” on Day 2/);
    assert.match(buildProposal(trip, { action: 'add_note', dayNumber: 1, note: 'Book lunch' }).proposal.diff, /Add a note to Day 1/);
    assert.ok(buildProposal(trip, { action: 'add_note', dayNumber: 1, note: '  ' }).error);
    assert.ok(buildProposal(trip, { action: 'teleport', dayNumber: 1 }).error);
  });
});

describe('applyProposal', () => {
  it('move: updates time + block and bumps trips.updated_at', async () => {
    const sb = fakeSupabase();
    const r = await applyProposal(sb, trip, { action: 'move_activity', dayNumber: 1, activityName: 'Louvre Museum', toTime: '11:30' });
    assert.equal(r.ok, true);
    const actCall = sb.calls.find((c) => c.table === 'trip_activities');
    assert.deepEqual(actCall.updates, { start_time: '11:30:00', time_block: 'lunch' });
    assert.deepEqual(actCall.filters, [['eq', 'id', 'act-1']]);
    const bump = sb.calls.find((c) => c.table === 'trips');
    assert.ok(bump.updates.updated_at, 'trip version bumped');
  });

  it('move across days sets trip_day_id', async () => {
    const sb = fakeSupabase();
    await applyProposal(sb, trip, { action: 'move_activity', dayNumber: 1, activityName: 'orsay', toDayNumber: 2, toTime: '17:30' });
    const actCall = sb.calls.find((c) => c.table === 'trip_activities');
    assert.equal(actCall.updates.trip_day_id, 'day-2');
    assert.equal(actCall.updates.time_block, 'evening');
  });

  it('swap_days crosses activity day ids by explicit id lists and swaps themes', async () => {
    const sb = fakeSupabase();
    const r = await applyProposal(sb, trip, { action: 'swap_days', dayNumber: 1, toDayNumber: 2 });
    assert.equal(r.ok, true);
    const actCalls = sb.calls.filter((c) => c.table === 'trip_activities');
    assert.deepEqual(actCalls[0].updates, { trip_day_id: 'day-2' });
    assert.deepEqual(actCalls[0].filters, [['in', 'id', ['act-1', 'act-2', 'act-3']]]);
    assert.deepEqual(actCalls[1].updates, { trip_day_id: 'day-1' });
    const themeCalls = sb.calls.filter((c) => c.table === 'trip_days');
    assert.deepEqual(themeCalls.map((c) => c.updates.theme), ['Marais', 'Museums']);
  });

  it('remove sets status skipped; note appends', async () => {
    const sb = fakeSupabase();
    await applyProposal(sb, trip, { action: 'remove_activity', dayNumber: 2, activityName: 'picasso' });
    assert.deepEqual(sb.calls.find((c) => c.table === 'trip_activities').updates, { status: 'skipped' });

    const sb2 = fakeSupabase();
    await applyProposal(sb2, trip, { action: 'add_note', dayNumber: 2, note: 'Dinner at 8' });
    assert.equal(sb2.calls.find((c) => c.table === 'trip_days').updates.notes, 'Pack light\nDinner at 8');
  });

  it('re-validates: a stale intent fails without writing', async () => {
    const sb = fakeSupabase();
    const r = await applyProposal(sb, trip, { action: 'move_activity', dayNumber: 1, activityName: 'Eiffel Tower', toTime: '10:00' });
    assert.ok(r.error);
    assert.equal(sb.calls.length, 0, 'nothing written');
  });
});
