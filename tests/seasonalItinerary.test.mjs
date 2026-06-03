import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getSeasonalContext, summarizeSeasonalContext } from '../src/lib/planning/seasonalContext.js';
import { buildItinerary } from '../src/lib/planning/buildItinerary.js';
import { getCityData } from '../src/lib/data-utils.js';

// Paris has rich monthly data — use it as the fixture.
const paris = await getCityData('paris');

test('getCityData returns Paris with monthly data', () => {
  assert.ok(paris, 'paris city data should load');
  assert.ok(paris.monthly && Object.keys(paris.monthly).length > 0, 'monthly data present');
});

test('seasonal context reflects July: warm, Bastille Day anchored', () => {
  const ctx = getSeasonalContext(paris, '2026-07-13', '2026-07-16');
  assert.equal(ctx.month, 'july');
  assert.ok(ctx.weather.highC >= 20 && ctx.weather.highC <= 32, `July high ~25, got ${ctx.weather.highC}`);
  const bastille = ctx.events.find(e => /bastille/i.test(e.name));
  assert.ok(bastille, 'Bastille Day present in July events');
  assert.equal(bastille.day, 14, 'Bastille Day parsed to day 14');
  assert.ok(summarizeSeasonalContext(ctx).startsWith('Jul'), 'summary starts with month');
});

test('seasonal context reflects January: colder, possibly short daylight', () => {
  const ctx = getSeasonalContext(paris, '2026-01-13', '2026-01-16');
  assert.equal(ctx.month, 'january');
  assert.ok(ctx.weather.highC != null && ctx.weather.highC < 15, `Jan high should be cold, got ${ctx.weather.highC}`);
  assert.equal(ctx.flags.shortDaylight, true, 'January in Paris has < 10h daylight');
});

test('July itinerary anchors Bastille Day on July 14', () => {
  const trip = { city: 'paris', start_date: '2026-07-13', end_date: '2026-07-16', pace: 'balanced', interests: [] };
  const it = buildItinerary(trip, paris);
  const day14 = it.days.find(d => /Jul 14/.test(d.date));
  assert.ok(day14, 'a day labelled Jul 14 exists');
  const hasEvent = day14.timeBlocks.some(tb => tb.activity?.type === 'event' && /bastille/i.test(tb.activity.name));
  assert.ok(hasEvent, 'Bastille Day is anchored as an event block on Jul 14');
});

test('July vs January itineraries differ and carry seasonal notes', () => {
  const base = { city: 'paris', pace: 'balanced', interests: [] };
  const july = buildItinerary({ ...base, start_date: '2026-07-06', end_date: '2026-07-09' }, paris);
  const jan = buildItinerary({ ...base, start_date: '2026-01-06', end_date: '2026-01-09' }, paris);

  assert.ok(july.seasonal && jan.seasonal, 'both carry seasonal block');
  assert.ok(july.days[0].weatherNote, 'July day has a weather note');
  assert.ok(jan.days[0].weatherNote, 'January day has a weather note');
  assert.notEqual(july.days[0].weatherNote, jan.days[0].weatherNote, 'weather notes differ by season');

  // January should schedule fewer/earlier slots when daylight is short.
  const julySlots = july.days[0].timeBlocks.length;
  const janSlots = jan.days[0].timeBlocks.length;
  assert.ok(janSlots <= julySlots, `January day should not be longer (jan ${janSlots} vs july ${julySlots})`);
});

test('mobility needs produce a gentler day (fewer stops)', () => {
  const base = { city: 'paris', start_date: '2026-05-06', end_date: '2026-05-09', pace: 'active', interests: [] };
  const normal = buildItinerary(base, paris);
  const reduced = buildItinerary({ ...base, mobility: 'wheelchair' }, paris);
  assert.ok(
    reduced.days[0].timeBlocks.length <= normal.days[0].timeBlocks.length,
    'mobility itinerary has <= stops than the normal one',
  );
});
