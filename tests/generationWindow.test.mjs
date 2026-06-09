import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  nightsBetween,
  deriveConcreteDates,
  resolveGenerationWindow,
} from '../src/lib/trips/generationWindow.js';

function tripState({ cities = [], dates = {}, bookings = [] } = {}) {
  return {
    route: { cities },
    dates: { startDate: null, endDate: null, flexibleMonth: null, totalNights: null, ...dates },
    transport: { bookings },
  };
}

const PARIS_3N = { id: 'paris', name: 'Paris', country: 'France', order: 0, nights: 3 };
const LYON_2N = { id: 'lyon', name: 'Lyon', country: 'France', order: 1, nights: 2 };

describe('nightsBetween', () => {
  it('counts whole nights, null on missing or invalid dates', () => {
    assert.equal(nightsBetween('2026-06-09', '2026-06-14'), 5);
    assert.equal(nightsBetween('2026-06-09', '2026-06-09'), 0);
    assert.equal(nightsBetween(null, '2026-06-14'), null);
    assert.equal(nightsBetween('garbage', '2026-06-14'), null);
  });
});

describe('deriveConcreteDates', () => {
  it('passes through explicit dates', () => {
    const out = deriveConcreteDates(tripState({ dates: { startDate: '2026-06-09', endDate: '2026-06-14' } }));
    assert.deepEqual(out, { startDate: '2026-06-09', endDate: '2026-06-14' });
  });

  it('resolves a flexible month + night count to the 1st of that month', () => {
    const out = deriveConcreteDates(tripState({ dates: { flexibleMonth: '2026-09', totalNights: 5 } }));
    assert.deepEqual(out, { startDate: '2026-09-01', endDate: '2026-09-06' });
  });

  it('derives the end date from start + totalNights, across month boundaries', () => {
    const out = deriveConcreteDates(tripState({ dates: { startDate: '2026-06-29', totalNights: 4 } }));
    assert.deepEqual(out, { startDate: '2026-06-29', endDate: '2026-07-03' });
  });

  it('leaves dates null when nothing can be derived', () => {
    assert.deepEqual(deriveConcreteDates(tripState()), { startDate: null, endDate: null });
  });
});

describe('resolveGenerationWindow', () => {
  it('resolves cities, window, and per-city allocation when everything fits', () => {
    const out = resolveGenerationWindow(
      tripState({
        cities: [PARIS_3N, LYON_2N],
        dates: { startDate: '2026-06-09', endDate: '2026-06-14' }, // 5 nights = 3 + 2
      })
    );
    assert.deepEqual(out.errors, []);
    assert.deepEqual(out.cities.map((c) => c.id), ['paris', 'lyon']);
    assert.equal(out.startDate, '2026-06-09');
    assert.equal(out.endDate, '2026-06-14');
    assert.deepEqual(out.dayAllocation, { paris: 3, lyon: 2 });
  });

  it('drops the explicit allocation when it does not fit the window', () => {
    const out = resolveGenerationWindow(
      tripState({
        cities: [PARIS_3N, LYON_2N], // 5 allocated nights
        dates: { startDate: '2026-06-09', endDate: '2026-06-12' }, // 3-night window
      })
    );
    assert.deepEqual(out.errors, []);
    assert.equal(out.dayAllocation, null);
  });

  it('prefers the flight-derived window over planner dates', () => {
    const out = resolveGenerationWindow(
      tripState({
        cities: [PARIS_3N, LYON_2N],
        dates: { startDate: '2026-06-01', endDate: '2026-06-20' },
        bookings: [
          { direction: 'inbound', arrivalDate: '2026-06-09' },
          { direction: 'outbound', departureDate: '2026-06-14' },
        ],
      })
    );
    assert.equal(out.startDate, '2026-06-09');
    assert.equal(out.endDate, '2026-06-14');
    assert.deepEqual(out.dayAllocation, { paris: 3, lyon: 2 }); // 5 nights still fit
  });

  it('orders cities by their route order', () => {
    const out = resolveGenerationWindow(
      tripState({
        cities: [{ ...LYON_2N, order: 0 }, { ...PARIS_3N, order: 1 }],
        dates: { startDate: '2026-06-09', endDate: '2026-06-14' },
      })
    );
    assert.deepEqual(out.cities.map((c) => c.id), ['lyon', 'paris']);
  });

  it('collects every validation error', () => {
    const out = resolveGenerationWindow(tripState());
    assert.deepEqual(out.errors, [
      'At least 1 city is required.',
      'A start date or flexible month is required.',
      'An end date or total night count is required.',
    ]);
  });
});
