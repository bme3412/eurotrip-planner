import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, placeParam, pickTravelMode, directionsUrl, legLinks } from '../src/lib/concierge/mapsLink.js';

const LOUVRE = { name: 'Louvre Museum', time: '09:30', lat: 48.8606, lng: 2.3376 };
const ORSAY = { name: 'Musée d’Orsay', time: '14:00', lat: 48.86, lng: 2.3266 }; // ~0.8 km from the Louvre
const VERSAILLES = { name: 'Château de Versailles', time: '10:00', lat: 48.8049, lng: 2.1204 }; // ~17 km
const NAME_ONLY = { name: 'Tuileries stroll', time: '16:00', lat: null, lng: null };

describe('placeParam', () => {
  it('prefers coordinates, falls back to "name, city", then null', () => {
    assert.equal(placeParam(LOUVRE, 'Paris'), '48.8606,2.3376');
    assert.equal(placeParam(NAME_ONLY, 'Paris'), 'Tuileries stroll, Paris');
    assert.equal(placeParam(NAME_ONLY, null), 'Tuileries stroll');
    assert.equal(placeParam({ lat: null, lng: null }, 'Paris'), null);
  });
});

describe('pickTravelMode', () => {
  it('walks short hops, rides transit otherwise', () => {
    assert.ok(Math.abs(distanceKm(LOUVRE, ORSAY) - 0.8) < 0.2);
    assert.equal(pickTravelMode(LOUVRE, ORSAY), 'walking');
    assert.equal(pickTravelMode(LOUVRE, VERSAILLES), 'transit');
  });

  it('defaults to transit when coordinates are missing', () => {
    assert.equal(pickTravelMode(LOUVRE, NAME_ONLY), 'transit');
    assert.equal(pickTravelMode(null, LOUVRE), 'transit');
  });
});

describe('directionsUrl', () => {
  it('builds an api=1 URL with encoded params', () => {
    const url = directionsUrl({ destination: 'Musée d’Orsay, Paris', travelmode: 'walking' });
    assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1&'));
    assert.match(url, /destination=Mus%C3%A9e\+d%E2%80%99Orsay%2C\+Paris/);
    assert.match(url, /travelmode=walking/);
    assert.ok(!url.includes('origin='));
  });

  it('includes origin when given, returns null without a destination', () => {
    const url = directionsUrl({ origin: '48.8606,2.3376', destination: '48.86,2.3266' });
    assert.match(url, /origin=48.8606%2C2.3376/);
    assert.equal(directionsUrl({}), null);
  });
});

describe('legLinks', () => {
  it('starts the first leg from the current location and chains the rest', () => {
    const legs = legLinks([LOUVRE, ORSAY, VERSAILLES], { cityName: 'Paris' });
    assert.equal(legs.length, 3);
    assert.ok(!legs[0].url.includes('origin='), 'first leg has no origin');
    assert.match(legs[0].url, /travelmode=transit/);
    assert.match(legs[1].url, /origin=48.8606%2C2.3376/);
    assert.match(legs[1].url, /travelmode=walking/);
    assert.match(legs[2].url, /travelmode=transit/);
  });

  it('falls back to name search and nulls unmappable stops', () => {
    const legs = legLinks([NAME_ONLY, { name: null, lat: null, lng: null }], { cityName: 'Paris' });
    assert.match(legs[0].url, /destination=Tuileries\+stroll%2C\+Paris/);
    assert.equal(legs[1].url, null);
    assert.deepEqual(legLinks([], {}), []);
    assert.deepEqual(legLinks(null, {}), []);
  });
});
