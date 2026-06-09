import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OLIVIER,
  COUNTRY_PERSONAS,
  CITY_PERSONAS,
  normalizeCountry,
  resolvePersona,
  personasForTrip,
  detectHandoff,
} from '../src/lib/concierge/personas.js';

describe('registry integrity', () => {
  const all = [OLIVIER, ...Object.values(COUNTRY_PERSONAS), ...Object.values(CITY_PERSONAS)];

  it('every persona has the required identity fields', () => {
    for (const p of all) {
      for (const field of ['id', 'name', 'initial', 'intro', 'voice', 'signoffStyle']) {
        assert.ok(p[field], `${p.id || '?'} has ${field}`);
      }
      assert.match(p.accent?.from || '', /^#[0-9a-f]{6}$/i, `${p.id} accent.from is a hex color`);
      assert.match(p.accent?.to || '', /^#[0-9a-f]{6}$/i, `${p.id} accent.to is a hex color`);
    }
  });

  it('persona ids are unique (France intentionally aliases Olivier)', () => {
    const ids = all.map((p) => p.id);
    const unique = new Set(ids);
    // OLIVIER appears twice: standalone and as COUNTRY_PERSONAS.France.
    assert.equal(unique.size, ids.length - 1);
    assert.equal(COUNTRY_PERSONAS.France, OLIVIER);
  });

  it('country keys match the generated cities.json country strings', () => {
    // Pinned: the registry must use the exact strings stored in city data.
    assert.ok(COUNTRY_PERSONAS.UK, 'UK (not United Kingdom)');
    assert.ok(COUNTRY_PERSONAS.Czechia, 'Czechia (not Czech Republic)');
    assert.ok(!COUNTRY_PERSONAS['United Kingdom']);
  });
});

describe('normalizeCountry', () => {
  it('maps aliases to registry keys', () => {
    assert.equal(normalizeCountry('United Kingdom'), 'UK');
    assert.equal(normalizeCountry('czech republic'), 'Czechia');
    assert.equal(normalizeCountry('italy'), 'Italy');
    assert.equal(normalizeCountry('  France '), 'France');
  });

  it('passes unknown countries through and nulls empty input', () => {
    assert.equal(normalizeCountry('Poland'), 'Poland');
    assert.equal(normalizeCountry(''), null);
    assert.equal(normalizeCountry(null), null);
    assert.equal(normalizeCountry(undefined), null);
  });
});

describe('resolvePersona', () => {
  it('city override beats country', () => {
    assert.equal(resolvePersona({ country: 'Italy', city: 'venice' }).id, 'marco-venice');
    assert.equal(resolvePersona({ country: 'Italy', city: 'rome' }).id, 'giulia-rome');
    assert.equal(resolvePersona({ country: 'Italy', city: 'florence' }).id, 'giulia-rome');
  });

  it('France resolves to Olivier himself', () => {
    assert.equal(resolvePersona({ country: 'France', city: 'paris' }).id, 'olivier');
    assert.equal(resolvePersona({ country: 'France', city: 'lyon' }).id, 'olivier');
  });

  it('normalizes country strings on the way in', () => {
    assert.equal(resolvePersona({ country: 'United Kingdom', city: 'london' }).id, 'theo-london');
    assert.equal(resolvePersona({ country: 'Czech Republic', city: 'prague' }).id, 'tomas-prague');
  });

  it('falls back to Olivier for uncovered or missing destinations', () => {
    assert.equal(resolvePersona({ country: 'Poland', city: 'krakow' }).id, 'olivier');
    assert.equal(resolvePersona({}).id, 'olivier');
    assert.equal(resolvePersona().id, 'olivier');
  });
});

describe('personasForTrip', () => {
  it('dedupes and puts Olivier first', () => {
    const trip = [
      { city: 'paris', country: 'France' },
      { city: 'rome', country: 'Italy' },
      { city: 'florence', country: 'Italy' },
      { city: 'venice', country: 'Italy' },
    ];
    const ids = personasForTrip(trip).map((p) => p.id);
    assert.deepEqual(ids, ['olivier', 'giulia-rome', 'marco-venice']);
  });

  it('returns just Olivier for empty or fully-uncovered trips', () => {
    assert.deepEqual(personasForTrip([]).map((p) => p.id), ['olivier']);
    assert.deepEqual(personasForTrip([{ city: 'krakow', country: 'Poland' }]).map((p) => p.id), ['olivier']);
  });
});

describe('detectHandoff', () => {
  it('is null when tomorrow stays with the same persona (Paris→Lyon)', () => {
    const day = { country: 'France', city: 'paris', nextCity: 'Lyon', nextCountry: 'France', nextCitySlug: 'lyon' };
    assert.equal(detectHandoff(day), null);
  });

  it('hands off across countries (Paris→Rome)', () => {
    const day = { country: 'France', city: 'paris', nextCity: 'Rome', nextCountry: 'Italy', nextCitySlug: 'rome' };
    const h = detectHandoff(day);
    assert.equal(h.toPersona.id, 'giulia-rome');
    assert.equal(h.toCity, 'Rome');
    assert.equal(h.toCountry, 'Italy');
  });

  it('hands off across a city-override boundary (Rome→Venice)', () => {
    const day = { country: 'Italy', city: 'rome', nextCity: 'Venice', nextCountry: 'Italy', nextCitySlug: 'venice' };
    assert.equal(detectHandoff(day).toPersona.id, 'marco-venice');
  });

  it('is null on the last day or without context', () => {
    assert.equal(detectHandoff({ country: 'Italy', city: 'rome', nextCity: null }), null);
    assert.equal(detectHandoff(null), null);
  });
});
