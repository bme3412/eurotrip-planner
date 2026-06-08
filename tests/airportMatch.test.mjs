import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchArrivalAirport } from '../src/components/itinerary/arrival/airportMatch.js';

const PARIS = {
  airports: [
    { code: 'CDG', name: 'Charles de Gaulle', fullName: 'Paris Charles de Gaulle Airport' },
    { code: 'ORY', name: 'Orly', fullName: 'Paris Orly Airport' },
  ],
};

test('matches "PARIS-DEGAULLE, FR" to CDG over ORY', () => {
  const a = matchArrivalAirport(PARIS, { toCity: 'PARIS-DEGAULLE, FR' });
  assert.equal(a?.code, 'CDG');
});

test('matches an explicit IATA code token', () => {
  assert.equal(matchArrivalAirport(PARIS, { toCity: 'Paris ORY' })?.code, 'ORY');
});

test('matches the "Roissy" alias to CDG', () => {
  assert.equal(matchArrivalAirport(PARIS, { toCity: 'Roissy, France' })?.code, 'CDG');
});

test('single-airport city returns that airport regardless of name', () => {
  const oneAirport = { airports: [{ code: 'NCE', name: "Côte d'Azur", fullName: 'Nice Côte d’Azur Airport' }] };
  assert.equal(matchArrivalAirport(oneAirport, { toCity: 'SOMEWHERE ELSE' })?.code, 'NCE');
});

test('returns null with no data or no match in a multi-airport city', () => {
  assert.equal(matchArrivalAirport(null, { toCity: 'Paris' }), null);
  assert.equal(matchArrivalAirport({ airports: [] }, { toCity: 'Paris' }), null);
  assert.equal(matchArrivalAirport(PARIS, { toCity: 'Tokyo Haneda' }), null);
});
