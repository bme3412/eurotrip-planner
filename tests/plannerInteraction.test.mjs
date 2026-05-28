import { test } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeGaps } from '../src/lib/conversation/gapAnalysis.js';
import { derivePlannerInteraction } from '../src/lib/conversation/plannerInteraction.js';
import { initialTripState, mergeTripData } from '../src/lib/conversation/tripState.js';
import { handleExtractTripData } from '../src/lib/conversation/toolHandlers.js';

test('empty planner shows welcome, no progress noise, and empty map', () => {
  const gaps = analyzeGaps(initialTripState);
  const interaction = derivePlannerInteraction({
    tripState: initialTripState,
    gaps,
    pendingInput: null,
    messages: [],
  });

  assert.equal(interaction.mode, 'collect_anchor');
  assert.equal(interaction.activeWidget, 'none');
  assert.equal(interaction.mapMode, 'empty');
  assert.equal(interaction.showWelcome, true);
  assert.equal(interaction.showProgress, false);
});

test('proposed intermediate stops show preview suggestions without committing them', () => {
  const tripState = mergeTripData(initialTripState, {
    cities: [
      { name: 'Paris', role: 'start' },
      { name: 'Rome', role: 'end' },
    ],
    totalNights: 8,
  });
  const pendingInput = {
    type: 'render_city_picker',
    data: {
      purpose: 'suggest_stops',
      suggestions: [{ id: 'florence', name: 'Florence', country: 'Italy' }],
    },
  };
  const interaction = derivePlannerInteraction({
    tripState,
    gaps: analyzeGaps(tripState),
    pendingInput,
    messages: [{ role: 'user', content: 'Paris to Rome' }],
  });

  assert.equal(interaction.activeWidget, 'city_picker');
  assert.equal(interaction.mapMode, 'review_route');
  assert.equal(interaction.previewSuggestions.length, 1);
  assert.equal(interaction.previewSuggestions[0].name, 'Florence');
  assert.deepEqual(tripState.route.cities.map((city) => city.name), ['Paris', 'Rome']);
});

test('confirmed selected stops move the interaction back to confirmed route', () => {
  const tripState = mergeTripData(initialTripState, {
    cities: [
      { name: 'Paris', role: 'start', nights: 2 },
      { name: 'Florence', role: 'stop', nights: 2 },
      { name: 'Rome', role: 'end', nights: 2 },
    ],
    totalNights: 6,
  });
  const interaction = derivePlannerInteraction({
    tripState,
    gaps: analyzeGaps(tripState),
    pendingInput: null,
    messages: [{ role: 'user', content: 'Add Florence' }],
  });

  assert.equal(interaction.activeWidget, 'none');
  assert.equal(interaction.mapMode, 'confirmed_route');
  assert.equal(interaction.previewSuggestions.length, 0);
  assert.equal(interaction.showProgress, true);
});

test('pendingInput cannot render a widget that conflicts with current trip state', () => {
  const pendingInput = {
    type: 'render_nights_allocator',
    data: {
      cities: [{ id: 'paris', name: 'Paris', suggested: 3 }],
      totalNights: 3,
    },
  };
  const interaction = derivePlannerInteraction({
    tripState: initialTripState,
    gaps: analyzeGaps(initialTripState),
    pendingInput,
    messages: [{ role: 'assistant', content: 'Allocate nights' }],
  });

  assert.equal(interaction.pendingInput, null);
  assert.equal(interaction.pendingInputValid, false);
  assert.equal(interaction.activeWidget, 'none');
  assert.equal(interaction.mode, 'collect_anchor');
});

test('country-level destinations become target regions, not committed cities', () => {
  const { updatedState, extracted } = handleExtractTripData({
    cities: [
      { name: 'Paris', role: 'start' },
      { name: 'Albania', role: 'stop' },
      { name: 'Romania', role: 'stop' },
    ],
    targetRegions: ['Balkans'],
    totalNights: 12,
  }, initialTripState);

  assert.deepEqual(updatedState.route.cities.map((city) => city.name), ['Paris']);
  assert.ok(updatedState.brief.targetRegions.includes('Albania'));
  assert.ok(updatedState.brief.targetRegions.includes('Romania'));
  assert.ok(updatedState.brief.targetRegions.includes('Balkans'));
  assert.deepEqual(extracted.cities.map((city) => city.name), ['Paris']);
});

test('region-level destinations like Albanian Riviera stay target regions', () => {
  const { updatedState, extracted } = handleExtractTripData({
    cities: [
      { name: 'Paris', role: 'start', arrivalDate: '2026-06-19', departureDate: '2026-06-22' },
      { name: 'Albanian Riviera', role: 'stop' },
      { name: 'Romania', role: 'stop' },
    ],
    startDate: '2026-06-19',
    endDate: '2026-07-01',
  }, initialTripState);

  assert.deepEqual(updatedState.route.cities.map((city) => city.name), ['Paris']);
  assert.ok(updatedState.brief.targetRegions.includes('Albanian Riviera'));
  assert.ok(updatedState.brief.targetRegions.includes('Romania'));
  assert.deepEqual(extracted.cities.map((city) => city.name), ['Paris']);
});

test('city picker for country-level intent is choose-stops, not needs-anchor', () => {
  const tripState = mergeTripData(initialTripState, {
    cities: [{ name: 'Paris', role: 'start' }],
    targetRegions: ['Albania', 'Romania'],
    totalNights: 12,
  });
  const pendingInput = {
    type: 'render_city_picker',
    data: {
      purpose: 'suggest_stops',
      suggestions: [
        {
          id: 'tirana',
          name: 'Tirana',
          country: 'Albania',
          regionFocus: 'Albanian Riviera',
          routeRole: 'flight gateway',
          transportNote: 'use onward road transfer to the coast',
        },
        { id: 'bucharest', name: 'Bucharest', country: 'Romania', routeRole: 'flight hub' },
      ],
    },
  };
  const interaction = derivePlannerInteraction({
    tripState,
    gaps: analyzeGaps(tripState),
    pendingInput,
    messages: [{ role: 'user', content: 'Paris then Albania and Romania' }],
  });

  assert.equal(interaction.mode, 'choose_stops');
  assert.equal(interaction.copy.status, 'Pick suggested stops');
  assert.equal(interaction.copy.nextLabel, 'Choose a city card');
  assert.equal(interaction.previewSuggestions[0].regionFocus, 'Albanian Riviera');
  assert.equal(interaction.previewSuggestions[0].routeRole, 'flight gateway');
  assert.equal(interaction.previewSuggestions[0].transportNote, 'use onward road transfer to the coast');
});
