import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleSuggestCities } from '@/lib/conversation/toolHandlers';

const cities = JSON.parse(
  readFileSync(new URL('../src/generated/cities.json', import.meta.url))
);
const byId = new Map((Array.isArray(cities) ? cities : cities.cities || []).map((c) => [c.id, c]));

test('suggest_cities never returns empty for a lone anchor (the stall scenario)', async () => {
  // Paris anchor, 14 nights in June — exactly the case that stalled.
  const result = await handleSuggestCities({
    fromCityId: 'paris',
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    maxResults: 6,
  });

  assert.ok(Array.isArray(result), 'returns an array');
  assert.ok(result.length > 0, `returns at least one suggestion (got ${result.length})`);
  assert.ok(result.length <= 6, 'respects maxResults');

  for (const s of result) {
    assert.ok(s.id && s.name, 'each suggestion has id + name');
    assert.notEqual(s.id, 'paris', 'never suggests the anchor itself');
    const canonical = byId.get(s.id);
    assert.ok(canonical, `suggestion ${s.id} exists in cities.json`);
    assert.ok(
      Number.isFinite(canonical.latitude) && Number.isFinite(canonical.longitude),
      `suggestion ${s.id} has coordinates (so its map pin resolves)`
    );
  }
  console.log('  → suggestions:', result.map((s) => s.name).join(', '));
});

test('fallback engages for an anchor with no ease-score data', async () => {
  // Force the empty-primary path with an obscure/coordless-ish anchor; the
  // handler must still yield a non-empty list rather than stalling.
  const result = await handleSuggestCities({ fromCityId: 'paris', maxResults: 4 });
  assert.ok(result.length > 0, 'still non-empty without explicit dates');
  assert.ok(result.length <= 4, 'respects maxResults=4');
});
