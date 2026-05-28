import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION,
  ALL_EXPERIENCES,
  ALL_REGIONS,
  FILTER_TYPES,
  createInitialState,
  filtersReducer,
  hasActiveFilters,
} from '../src/lib/filters/cityGuidesFilters.js';

// ---------- createInitialState ----------

test('createInitialState: defaults to empty filters + null tripDates', () => {
  const s = createInitialState();
  assert.equal(s.searchTerm, '');
  assert.equal(s.selectedRegion, ALL_REGIONS);
  assert.deepEqual(s.selectedCountries, []);
  assert.equal(s.activeFilterType, FILTER_TYPES.EURO_REGION);
  assert.equal(s.tripDates, null);
});

test('createInitialState: seeds tripDates from arg (e.g. URL parse)', () => {
  const dates = { mode: 'dates', start: '2026-04-12', end: '2026-04-20' };
  const s = createInitialState({ tripDates: dates });
  assert.deepEqual(s.tripDates, dates);
});

// ---------- SET_SEARCH_TERM ----------

test('SET_SEARCH_TERM: updates the searchTerm', () => {
  const s = filtersReducer(createInitialState(), {
    type: ACTION.SET_SEARCH_TERM,
    value: 'paris',
  });
  assert.equal(s.searchTerm, 'paris');
});

test('SET_SEARCH_TERM: coerces nullish to empty string', () => {
  const s = filtersReducer(createInitialState(), {
    type: ACTION.SET_SEARCH_TERM,
    value: null,
  });
  assert.equal(s.searchTerm, '');
});

// ---------- SET_REGION ----------

test('SET_REGION: sets the region without changing filterType when none given', () => {
  const initial = createInitialState();
  const s = filtersReducer(initial, {
    type: ACTION.SET_REGION,
    region: 'Mediterranean',
  });
  assert.equal(s.selectedRegion, 'Mediterranean');
  assert.equal(s.activeFilterType, FILTER_TYPES.EURO_REGION);
});

test('SET_REGION: switches filterType when supplied', () => {
  const s = filtersReducer(createInitialState(), {
    type: ACTION.SET_REGION,
    region: 'Beach Destinations',
    filterType: FILTER_TYPES.TRAVEL_EXPERIENCE,
  });
  assert.equal(s.selectedRegion, 'Beach Destinations');
  assert.equal(s.activeFilterType, FILTER_TYPES.TRAVEL_EXPERIENCE);
});

// ---------- TOGGLE_COUNTRY ----------

test('TOGGLE_COUNTRY: adds a country when absent', () => {
  const s = filtersReducer(createInitialState(), {
    type: ACTION.TOGGLE_COUNTRY,
    country: 'France',
  });
  assert.deepEqual(s.selectedCountries, ['France']);
});

test('TOGGLE_COUNTRY: removes a country when already selected', () => {
  const initial = { ...createInitialState(), selectedCountries: ['France', 'Italy'] };
  const s = filtersReducer(initial, {
    type: ACTION.TOGGLE_COUNTRY,
    country: 'France',
  });
  assert.deepEqual(s.selectedCountries, ['Italy']);
});

// ---------- CLEAR_COUNTRIES ----------

test('CLEAR_COUNTRIES: empties selectedCountries', () => {
  const initial = { ...createInitialState(), selectedCountries: ['France', 'Italy'] };
  const s = filtersReducer(initial, { type: ACTION.CLEAR_COUNTRIES });
  assert.deepEqual(s.selectedCountries, []);
});

// ---------- SET_FILTER_TYPE ----------

test('SET_FILTER_TYPE: switches the active chip set', () => {
  const s = filtersReducer(createInitialState(), {
    type: ACTION.SET_FILTER_TYPE,
    value: FILTER_TYPES.TRAVEL_EXPERIENCE,
  });
  assert.equal(s.activeFilterType, FILTER_TYPES.TRAVEL_EXPERIENCE);
});

// ---------- SET_TRIP_DATES ----------

test('SET_TRIP_DATES: replaces tripDates', () => {
  const dates = { mode: 'month', month: '6' };
  const s = filtersReducer(createInitialState(), {
    type: ACTION.SET_TRIP_DATES,
    value: dates,
  });
  assert.deepEqual(s.tripDates, dates);
});

// ---------- CLEAR_FILTERS ----------

test('CLEAR_FILTERS: resets search/region/countries but preserves tripDates', () => {
  const dates = { mode: 'dates', start: '2026-04-12', end: '2026-04-20' };
  const initial = {
    searchTerm: 'paris',
    selectedRegion: 'Mediterranean',
    selectedCountries: ['France', 'Italy'],
    activeFilterType: FILTER_TYPES.TRAVEL_EXPERIENCE,
    tripDates: dates,
  };
  const s = filtersReducer(initial, { type: ACTION.CLEAR_FILTERS });
  assert.equal(s.searchTerm, '');
  assert.equal(s.selectedRegion, ALL_REGIONS);
  assert.deepEqual(s.selectedCountries, []);
  assert.equal(s.activeFilterType, FILTER_TYPES.EURO_REGION);
  assert.deepEqual(s.tripDates, dates);
});

// ---------- unknown action ----------

test('reducer: unknown action returns the same state reference', () => {
  const initial = createInitialState();
  const s = filtersReducer(initial, { type: 'NOT_A_REAL_ACTION' });
  assert.equal(s, initial);
});

// ---------- hasActiveFilters ----------

test('hasActiveFilters: false on a fresh initial state', () => {
  assert.equal(hasActiveFilters(createInitialState()), false);
});

test('hasActiveFilters: false when only tripDates are set', () => {
  const state = { ...createInitialState(), tripDates: { mode: 'month', month: '6' } };
  assert.equal(hasActiveFilters(state), false);
});

test('hasActiveFilters: true when a country is selected', () => {
  const state = { ...createInitialState(), selectedCountries: ['France'] };
  assert.equal(hasActiveFilters(state), true);
});

test('hasActiveFilters: true when a region (other than ALL) is selected', () => {
  const state = { ...createInitialState(), selectedRegion: 'Mediterranean' };
  assert.equal(hasActiveFilters(state), true);
});

test('hasActiveFilters: false when region is the experience-default sentinel', () => {
  const state = { ...createInitialState(), selectedRegion: ALL_EXPERIENCES };
  assert.equal(hasActiveFilters(state), false);
});

test('hasActiveFilters: true with a non-empty search term', () => {
  const state = { ...createInitialState(), searchTerm: 'paris' };
  assert.equal(hasActiveFilters(state), true);
});

test('hasActiveFilters: tolerates null', () => {
  assert.equal(hasActiveFilters(null), false);
});
