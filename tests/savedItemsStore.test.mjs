import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultIdOf,
  makeIdOf,
  isFavorited,
  toggleFavorite,
  fromSupabaseRow as favFromSupabase,
  toSupabaseInsert as favToSupabase,
  favoritesStorageKey,
  readLocalFavorites,
  writeLocalFavorites,
  readAllLocalFavorites,
  clearLocalFavorites,
} from '../src/lib/savedItems/favoritesStore.js';

import { migrateRows } from '../src/lib/savedItems/createSavedCollection.js';

import {
  WISHLIST_STORAGE_KEY,
  isWishlisted,
  buildLocalWishlistEntry,
  toggleWishlist,
  toSupabaseInsert as wishToSupabase,
  fromSupabaseRow as wishFromSupabase,
  readLocalWishlist,
  writeLocalWishlist,
} from '../src/lib/savedItems/wishlistStore.js';

// ---------------------------------------------------------------------------
// In-memory storage stub mimicking the localStorage interface.
// ---------------------------------------------------------------------------

function memStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    get length() { return Object.keys(data).length; },
    key: (i) => Object.keys(data)[i] ?? null,
    _data: data,
  };
}

// Minimal chainable Supabase stub for migrateRows. `existing` seeds the table;
// inserted payloads are captured for assertions.
function supabaseStub({ existing = [], readError = null, insertError = null } = {}) {
  const captured = { inserted: null, upsertOpts: null };
  return {
    captured,
    from() {
      return {
        select() {
          return {
            eq: async () => ({ data: readError ? null : existing, error: readError }),
          };
        },
        upsert(rows, opts) {
          captured.inserted = rows;
          captured.upsertOpts = opts;
          return Promise.resolve({ error: insertError });
        },
      };
    },
  };
}

// ===========================================================================
// favoritesStore
// ===========================================================================

test('defaultIdOf prefers name → activity → title', () => {
  assert.equal(defaultIdOf({ name: 'Louvre' }), 'Louvre');
  assert.equal(defaultIdOf({ activity: 'Brunch' }), 'Brunch');
  assert.equal(defaultIdOf({ title: 'Cathedral' }), 'Cathedral');
  // Both name and activity present → name wins.
  assert.equal(defaultIdOf({ name: 'N', activity: 'A' }), 'N');
  assert.equal(defaultIdOf({}), null);
  assert.equal(defaultIdOf(null), null);
});

test('makeIdOf builds an extractor with a custom precedence (CityOverview shape)', () => {
  // CityOverview historically prefers activity > title > name.
  const idOf = makeIdOf(['activity', 'title', 'name']);
  assert.equal(idOf({ name: 'N', activity: 'A' }), 'A');
  assert.equal(idOf({ name: 'N', title: 'T' }), 'T');
  assert.equal(idOf({ name: 'N' }), 'N');
  assert.equal(idOf({}), null);
});

test('isFavorited matches by extracted id, not deep equality', () => {
  const list = [{ name: 'Louvre', extra: 'whatever' }];
  assert.equal(isFavorited(list, { name: 'Louvre' }), true);
  // Same id, different object identity, different fields — still considered favorited.
  assert.equal(isFavorited(list, { name: 'Louvre', rating: 4.9 }), true);
  assert.equal(isFavorited(list, { name: 'Eiffel' }), false);
  // No id → never favorited.
  assert.equal(isFavorited(list, {}), false);
});

test('toggleFavorite adds when not present', () => {
  const list = [{ name: 'A' }];
  const r = toggleFavorite(list, { name: 'B' });
  assert.equal(r.action, 'added');
  assert.equal(r.id, 'B');
  assert.deepEqual(r.next.map((x) => x.name), ['A', 'B']);
  // Original list not mutated.
  assert.deepEqual(list.map((x) => x.name), ['A']);
});

test('toggleFavorite removes when present (returns the surviving list)', () => {
  const list = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
  const r = toggleFavorite(list, { name: 'B' });
  assert.equal(r.action, 'removed');
  assert.equal(r.id, 'B');
  assert.deepEqual(r.next.map((x) => x.name), ['A', 'C']);
});

test('toggleFavorite is a noop on items without an extractable id', () => {
  const list = [{ name: 'A' }];
  const r = toggleFavorite(list, {});
  assert.equal(r.action, 'noop');
  assert.equal(r.id, null);
  assert.equal(r.next, list);
});

test('toggleFavorite respects a custom idOf', () => {
  const idOf = makeIdOf(['activity']);
  const list = [{ activity: 'Brunch' }];
  // Same activity, different `name` → still a remove.
  const r = toggleFavorite(list, { name: 'Whatever', activity: 'Brunch' }, idOf);
  assert.equal(r.action, 'removed');
  assert.equal(r.next.length, 0);
});

test('favFromSupabase unpacks experience_data over the column scalars', () => {
  const row = {
    experience_name: 'Louvre',
    category: 'museum',
    subcategory: 'art',
    description: 'big museum',
    experience_data: { rating: 4.8, neighborhood: 'Rivoli' },
  };
  const f = favFromSupabase(row);
  assert.equal(f.name, 'Louvre');
  assert.equal(f.category, 'museum');
  assert.equal(f.rating, 4.8);
  assert.equal(f.neighborhood, 'Rivoli');
});

test('favToSupabase produces the documented insert payload', () => {
  const payload = favToSupabase({
    userId: 'u1',
    cityName: 'paris',
    id: 'Louvre',
    item: { name: 'Louvre', category: 'museum', rating: 4.8 },
  });
  assert.equal(payload.user_id, 'u1');
  assert.equal(payload.city_name, 'paris');
  assert.equal(payload.experience_name, 'Louvre');
  assert.equal(payload.category, 'museum');
  assert.equal(payload.rating, 4.8);
  // Full item stored as JSON column.
  assert.deepEqual(payload.experience_data, { name: 'Louvre', category: 'museum', rating: 4.8 });
});

test('favoritesStorageKey uses the legacy `favorites-{city}` shape', () => {
  assert.equal(favoritesStorageKey('paris'), 'favorites-paris');
});

test('readLocalFavorites: missing / malformed / non-array values all yield []', () => {
  assert.deepEqual(readLocalFavorites('paris', memStorage()), []);
  assert.deepEqual(readLocalFavorites('paris', memStorage({ 'favorites-paris': 'not json' })), []);
  assert.deepEqual(readLocalFavorites('paris', memStorage({ 'favorites-paris': '"a string"' })), []);
});

test('readLocalFavorites + writeLocalFavorites round-trip', () => {
  const storage = memStorage();
  writeLocalFavorites('paris', [{ name: 'Louvre' }], storage);
  const list = readLocalFavorites('paris', storage);
  assert.deepEqual(list, [{ name: 'Louvre' }]);
});

test('readLocalFavorites is a noop with no storage (SSR)', () => {
  assert.deepEqual(readLocalFavorites('paris', null), []);
});

// ===========================================================================
// wishlistStore
// ===========================================================================

test('isWishlisted matches by cityName', () => {
  const list = [{ cityName: 'paris' }, { cityName: 'rome' }];
  assert.equal(isWishlisted(list, 'paris'), true);
  assert.equal(isWishlisted(list, 'berlin'), false);
  assert.equal(isWishlisted(list, ''), false);
  assert.equal(isWishlisted([], 'paris'), false);
});

test('buildLocalWishlistEntry fills defaults when cityData is sparse', () => {
  const entry = buildLocalWishlistEntry({ cityName: 'paris', savedAt: '2025-01-01' });
  assert.equal(entry.cityName, 'paris');
  assert.equal(entry.displayName, 'paris');
  assert.equal(entry.country, 'Unknown');
  assert.equal(entry.image, null);
  assert.equal(entry.description, null);
  assert.equal(entry.savedAt, '2025-01-01');
});

test('buildLocalWishlistEntry uses cityData when provided', () => {
  const entry = buildLocalWishlistEntry({
    cityName: 'paris',
    cityData: {
      displayName: 'Paris',
      country: 'France',
      heroImage: '/img/paris.jpg',
      overview: { introduction: 'City of light.' },
    },
    savedAt: '2025-01-01',
  });
  assert.equal(entry.displayName, 'Paris');
  assert.equal(entry.country, 'France');
  assert.equal(entry.image, '/img/paris.jpg');
  assert.equal(entry.description, 'City of light.');
});

test('toggleWishlist adds a new entry', () => {
  const r = toggleWishlist([], { cityName: 'paris', cityData: { displayName: 'Paris', country: 'France' } });
  assert.equal(r.action, 'added');
  assert.equal(r.next.length, 1);
  assert.equal(r.next[0].cityName, 'paris');
  assert.equal(r.next[0].displayName, 'Paris');
});

test('toggleWishlist removes an existing entry', () => {
  const list = [
    { cityName: 'paris', displayName: 'Paris' },
    { cityName: 'rome', displayName: 'Rome' },
  ];
  const r = toggleWishlist(list, { cityName: 'paris' });
  assert.equal(r.action, 'removed');
  assert.deepEqual(r.next.map((t) => t.cityName), ['rome']);
});

test('toggleWishlist is a noop when no cityName is provided', () => {
  const list = [{ cityName: 'paris' }];
  const r = toggleWishlist(list, {});
  assert.equal(r.action, 'noop');
  assert.equal(r.next, list);
});

test('wishToSupabase produces the documented insert payload', () => {
  const payload = wishToSupabase({
    userId: 'u1',
    cityName: 'paris',
    cityData: {
      displayName: 'Paris',
      country: 'France',
      heroImage: '/p.jpg',
      overview: { introduction: 'City of light.' },
    },
  });
  assert.equal(payload.user_id, 'u1');
  assert.equal(payload.city_name, 'paris');
  assert.equal(payload.display_name, 'Paris');
  assert.equal(payload.country, 'France');
  assert.equal(payload.image, '/p.jpg');
  assert.equal(payload.description, 'City of light.');
});

test('wishFromSupabase maps snake_case columns to legacy camelCase shape', () => {
  const row = {
    id: 42,
    city_name: 'paris',
    display_name: 'Paris',
    country: 'France',
    image: '/p.jpg',
    description: 'City of light.',
    created_at: '2025-01-01T00:00:00Z',
  };
  const t = wishFromSupabase(row);
  assert.equal(t.id, 42);
  assert.equal(t.cityName, 'paris');
  assert.equal(t.displayName, 'Paris');
  assert.equal(t.country, 'France');
  assert.equal(t.image, '/p.jpg');
  assert.equal(t.description, 'City of light.');
  assert.equal(t.savedAt, '2025-01-01T00:00:00Z');
});

test('WISHLIST_STORAGE_KEY is "savedTrips" (matches existing localStorage)', () => {
  assert.equal(WISHLIST_STORAGE_KEY, 'savedTrips');
});

test('readLocalWishlist + writeLocalWishlist round-trip', () => {
  const storage = memStorage();
  writeLocalWishlist([{ cityName: 'paris' }], storage);
  assert.deepEqual(readLocalWishlist(storage), [{ cityName: 'paris' }]);
});

test('readLocalWishlist is a noop with no storage (SSR)', () => {
  assert.deepEqual(readLocalWishlist(null), []);
});

test('readLocalWishlist tolerates malformed JSON', () => {
  assert.deepEqual(readLocalWishlist(memStorage({ savedTrips: 'garbage' })), []);
});

// ===========================================================================
// favoritesStore — multi-city scan (readAllLocalFavorites)
// ===========================================================================

test('readAllLocalFavorites scans every favorites-{city} bucket, skips others', () => {
  const storage = memStorage();
  writeLocalFavorites('paris', [{ name: 'Louvre' }], storage);
  writeLocalFavorites('rome', [{ name: 'Colosseum' }, { name: 'Forum' }], storage);
  storage.setItem('savedTrips', '[]'); // unrelated key ignored
  storage.setItem('favorites-empty', '[]'); // empty bucket skipped

  const all = readAllLocalFavorites(storage);
  const byCity = Object.fromEntries(all.map((x) => [x.cityName, x.items.length]));
  assert.deepEqual(byCity, { paris: 1, rome: 2 });
});

test('readAllLocalFavorites is a noop with no storage (SSR)', () => {
  assert.deepEqual(readAllLocalFavorites(null), []);
});

test('clearLocalFavorites removes a single city bucket', () => {
  const storage = memStorage();
  writeLocalFavorites('paris', [{ name: 'Louvre' }], storage);
  clearLocalFavorites('paris', storage);
  assert.equal(storage.getItem('favorites-paris'), null);
});

// ===========================================================================
// createSavedCollection — migrateRows engine
// ===========================================================================

test('migrateRows inserts only rows whose key is not already on the server', async () => {
  const supabase = supabaseStub({ existing: [{ city_name: 'paris' }] });
  const rows = [
    { user_id: 'u1', city_name: 'paris' },
    { user_id: 'u1', city_name: 'rome' },
  ];
  const res = await migrateRows({
    supabase, table: 'saved_trips', userId: 'u1', rows,
    keyColumns: ['city_name'], keyOf: (r) => r.city_name,
  });
  assert.equal(res.inserted, 1);
  assert.equal(res.skipped, 1);
  assert.equal(res.error, null);
  assert.deepEqual(supabase.captured.inserted, [{ user_id: 'u1', city_name: 'rome' }]);
  assert.equal(supabase.captured.upsertOpts.onConflict, 'user_id,city_name');
});

test('migrateRows is a noop when every row already exists', async () => {
  const supabase = supabaseStub({ existing: [{ city_name: 'paris' }] });
  const res = await migrateRows({
    supabase, table: 'saved_trips', userId: 'u1',
    rows: [{ user_id: 'u1', city_name: 'paris' }],
    keyColumns: ['city_name'], keyOf: (r) => r.city_name,
  });
  assert.equal(res.inserted, 0);
  assert.equal(res.skipped, 1);
  assert.equal(supabase.captured.inserted, null); // upsert never called
});

test('migrateRows composite key uses all key columns in the conflict target', async () => {
  const supabase = supabaseStub({ existing: [] });
  const rows = [{ user_id: 'u1', city_name: 'paris', experience_name: 'Louvre' }];
  const res = await migrateRows({
    supabase, table: 'saved_experiences', userId: 'u1', rows,
    keyColumns: ['city_name', 'experience_name'],
    keyOf: (r) => `${r.city_name}::${r.experience_name}`,
  });
  assert.equal(res.inserted, 1);
  assert.equal(supabase.captured.upsertOpts.onConflict, 'user_id,city_name,experience_name');
});

test('migrateRows surfaces a read error without inserting', async () => {
  const supabase = supabaseStub({ readError: { message: 'boom' } });
  const res = await migrateRows({
    supabase, table: 'saved_trips', userId: 'u1',
    rows: [{ user_id: 'u1', city_name: 'paris' }],
    keyColumns: ['city_name'], keyOf: (r) => r.city_name,
  });
  assert.equal(res.inserted, 0);
  assert.ok(res.error);
  assert.equal(supabase.captured.inserted, null);
});

test('migrateRows handles empty input', async () => {
  const supabase = supabaseStub({ existing: [] });
  const res = await migrateRows({
    supabase, table: 'saved_trips', userId: 'u1', rows: [],
    keyColumns: ['city_name'], keyOf: (r) => r.city_name,
  });
  assert.deepEqual(res, { inserted: 0, skipped: 0, error: null });
});
