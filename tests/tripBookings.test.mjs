import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveTripWindow,
  accommodationsByCity,
  matchFlight,
  pickInbound,
  pickOutbound,
  getBookings,
} from '../src/lib/planning/tripBookings.js';
import { buildMultiCityItinerary } from '../src/lib/planning/buildMultiCityItinerary.js';

// Mirrors the user's pasted trip: Boston⇄CDG flights + Saint-Germain & Menton stays.
const SAMPLE = {
  transport: {
    bookings: [
      { type: 'flight', provider: 'Delta', flightNumber: '8723', fromCity: 'Boston', toCity: 'Paris-DeGaulle', departureDate: '2026-06-18', departureTime: '09:45PM', arrivalDate: '2026-06-19', arrivalTime: '10:35AM', direction: 'inbound' },
      { type: 'flight', provider: 'Delta', flightNumber: '8583', fromCity: 'Nice', toCity: 'Paris-DeGaulle', departureDate: '2026-06-30', departureTime: '09:05AM', arrivalDate: '2026-06-30', arrivalTime: '10:40AM', direction: 'outbound' },
      { type: 'flight', provider: 'Delta', flightNumber: '225', fromCity: 'Paris-DeGaulle', toCity: 'Boston', departureDate: '2026-06-30', departureTime: '11:45AM', arrivalDate: '2026-06-30', arrivalTime: '01:37PM', direction: 'outbound' },
    ],
  },
  route: {
    cities: [
      { id: 'paris', name: 'Paris', accommodation: { name: 'Large 1 Bedroom Apt Saint-Germain', address: '16 Rue Dauphine, 75006 Paris, France', checkIn: '2026-06-19', checkOut: '2026-06-22' } },
      { id: 'berlin', name: 'Berlin' },
      { id: 'nice', name: 'Nice', accommodation: { address: '8 Rue Sainte-Anne, 06500 Menton, France', checkIn: '2026-06-27', checkOut: '2026-06-30' } },
    ],
  },
};

test('deriveTripWindow bounds the trip by inbound arrival → outbound departure', () => {
  assert.deepEqual(deriveTripWindow(SAMPLE), { startDate: '2026-06-19', endDate: '2026-06-30' });
});

test('deriveTripWindow returns null without bounding flights', () => {
  assert.equal(deriveTripWindow({ transport: { bookings: [] } }), null);
  assert.equal(deriveTripWindow({}), null);
});

test('pickInbound / pickOutbound select the right legs', () => {
  const b = getBookings(SAMPLE);
  assert.equal(pickInbound(b).flightNumber, '8723');
  assert.equal(pickInbound(b).arrivalDate, '2026-06-19');
  // Earliest outbound leg = leaving the last city (Nice → CDG).
  assert.equal(pickOutbound(b).flightNumber, '8583');
  assert.equal(pickOutbound(b).departureDate, '2026-06-30');
});

test('accommodationsByCity keys real stays by city id (and surfaces Menton under Nice)', () => {
  const acc = accommodationsByCity(SAMPLE);
  assert.deepEqual(Object.keys(acc).sort(), ['nice', 'paris']);
  assert.ok(!('berlin' in acc), 'Berlin had no accommodation');
  assert.match(acc.nice.address, /Menton/);
  assert.equal(acc.paris.checkIn, '2026-06-19');
});

test('matchFlight matches a leg by city name loosely; null when unbooked', () => {
  const b = getBookings(SAMPLE);
  assert.equal(matchFlight(b, 'Nice', 'Paris-DeGaulle')?.flightNumber, '8583');
  assert.equal(matchFlight(b, 'Berlin', 'Krakow'), null);
});

test('builder folds lodging + flight framing into the generated days', async () => {
  // Trip ends in Nice — matching the booked Nice→CDG outbound leg.
  const cities = [
    { id: 'paris', name: 'Paris', country: 'France' },
    { id: 'nice', name: 'Nice', country: 'France' },
  ];
  const it = await buildMultiCityItinerary(
    { start_date: '2026-06-19', end_date: '2026-06-24', interests: ['Culture & History'], pace: 'balanced' },
    cities,
    {
      dayAllocation: { paris: 3, nice: 2 },
      includeTransfers: true,
      enrich: false,
      accommodations: accommodationsByCity(SAMPLE),
      flights: getBookings(SAMPLE),
    },
  );

  const realDays = it.days.filter((d) => !d.isTravelDay);
  const first = realDays[0];
  const last = realDays[realDays.length - 1];

  assert.equal(first.accommodation?.name, 'Large 1 Bedroom Apt Saint-Germain', 'Paris stay on day 1');
  assert.equal(first.cityName, 'Paris');
  assert.equal(first.arrival?.flightNumber, '8723', 'inbound (→CDG) frames the first Paris day');
  assert.equal(last.cityName, 'Nice');
  assert.equal(last.departure?.flightNumber, '8583', 'outbound LEAVING the last city (Nice→CDG) frames the last day');
});

test('builder does NOT paint a departure banner when no flight leaves the last city', async () => {
  // Open-jaw guard: trip ends in Berlin, but the only outbound legs depart Nice /
  // CDG — neither leaves Berlin, so no misleading "Depart …" banner.
  const cities = [
    { id: 'paris', name: 'Paris', country: 'France' },
    { id: 'berlin', name: 'Berlin', country: 'Germany' },
  ];
  const it = await buildMultiCityItinerary(
    { start_date: '2026-06-19', end_date: '2026-06-24', interests: ['Culture & History'], pace: 'balanced' },
    cities,
    { dayAllocation: { paris: 3, berlin: 2 }, includeTransfers: true, enrich: false, flights: getBookings(SAMPLE) },
  );
  const realDays = it.days.filter((d) => !d.isTravelDay);
  assert.equal(realDays[realDays.length - 1].cityName, 'Berlin');
  assert.equal(realDays[realDays.length - 1].departure, undefined, 'no departure banner for an unmatched last city');
});

test('builder day dates stay within the trip window (no per-leg inflation)', async () => {
  const cities = [
    { id: 'paris', name: 'Paris', country: 'France' },
    { id: 'nice', name: 'Nice', country: 'France' },
  ];
  const it = await buildMultiCityItinerary(
    { start_date: '2026-06-19', end_date: '2026-06-24', interests: ['Culture & History'], pace: 'balanced' },
    cities,
    { dayAllocation: { paris: 3, nice: 2 }, includeTransfers: true, enrich: false },
  );
  // 5 nights → 6 calendar days, Jun 19..24, contiguous, ending on checkout.
  assert.equal(it.meta.totalDays, 6);
  assert.equal(it.days[0].date, '2026-06-19');
  assert.equal(it.days[it.days.length - 1].date, '2026-06-24');
  assert.equal(it.meta.endDate, '2026-06-24');
});
