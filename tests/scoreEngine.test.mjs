import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ScoreEngine } from '../src/lib/scoring/v4/core/ScoreEngine.js';
import { getFactorClasses } from '../src/lib/scoring/v4/factors/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function cultureRichCity(overrides = {}) {
  return {
    country: 'FR',
    tourismCategories: ['Museums', 'Historical', 'Art & Architecture', 'UNESCO Sites'],
    attractions: {
      sites: [
        { name: 'Louvre Museum', type: 'museum', rating: 4.8, mustSee: true },
        { name: 'Notre-Dame Cathedral', type: 'cathedral', rating: 4.7 },
        { name: 'Palace of Versailles', type: 'palace', rating: 4.8 },
        { name: 'Sainte-Chapelle', type: 'church', rating: 4.7 },
        { name: 'Musée d\'Orsay', type: 'museum', rating: 4.8 },
      ],
    },
    highlights: ['Iconic museums', 'Historic monuments', 'World-class galleries'],
    description: 'Paris is the capital of France.',
    ...overrides,
  };
}

function emptyCity(overrides = {}) {
  return { country: 'XX', ...overrides };
}

function makeEngine() {
  return new ScoreEngine(null, getFactorClasses());
}

// ---------------------------------------------------------------------------
// calculateScore — shape & bounds
// ---------------------------------------------------------------------------

test('calculateScore returns the documented shape for a culture-rich city', () => {
  const engine = makeEngine();
  const result = engine.calculateScore({
    cityId: 'paris',
    cityData: cultureRichCity(),
    startDate: '2025-06-15',
    endDate: '2025-06-20',
  });

  assert.equal(result.cityId, 'paris');
  assert.equal(result.country, 'FR');
  assert.equal(typeof result.finalScore, 'number');
  assert.ok(result.finalScore >= 0 && result.finalScore <= 100, 'finalScore in 0..100');

  // All ENABLED factors must be present in the breakdown. `value` is disabled
  // in scoringConfig.json (no city carries price data, so it only ever returned
  // a constant fallback), so it is intentionally absent.
  for (const name of ['culture', 'beach', 'timing', 'crowds', 'logistics']) {
    assert.ok(result.breakdown[name], `breakdown.${name} present`);
    const f = result.breakdown[name];
    assert.equal(typeof f.score, 'number');
    assert.ok(f.score >= 0 && f.score <= 10, `${name}.score in 0..10`);
    assert.ok(f.confidence >= 0 && f.confidence <= 1, `${name}.confidence in 0..1`);
    assert.equal(typeof f.reason, 'string');
  }

  assert.ok(result.dynamicWeights, 'dynamicWeights present');
  assert.equal(typeof result.formatted, 'string');
});

test('calculateScore: culture-rich city scores noticeably higher on culture than an empty city', () => {
  const engine = makeEngine();
  const rich = engine.calculateScore({
    cityId: 'paris',
    cityData: cultureRichCity(),
    startDate: '2025-06-15',
    endDate: '2025-06-20',
  });
  const sparse = engine.calculateScore({
    cityId: 'nowhere',
    cityData: emptyCity(),
    startDate: '2025-06-15',
    endDate: '2025-06-20',
  });

  assert.ok(
    rich.breakdown.culture.score > sparse.breakdown.culture.score,
    `expected rich.culture (${rich.breakdown.culture.score}) > sparse.culture (${sparse.breakdown.culture.score})`,
  );
});

test('calculateScore: beach city in beach season scores beach > 0; non-beach city scores beach == 0', () => {
  const engine = makeEngine();

  const beachCity = engine.calculateScore({
    cityId: 'barcelona', // in hardcoded BEACH_CITIES list
    cityData: { country: 'ES', tourismCategories: ['Beach & Coastal'] },
    startDate: '2025-07-15',
    endDate: '2025-07-20',
  });
  const inlandCity = engine.calculateScore({
    cityId: 'prague',
    cityData: { country: 'CZ', tourismCategories: ['Historical'] },
    startDate: '2025-07-15',
    endDate: '2025-07-20',
  });

  assert.ok(beachCity.breakdown.beach.score > 0, 'beach city scores beach > 0');
  assert.equal(inlandCity.breakdown.beach.score, 0, 'inland city scores beach == 0');
});

test('calculateScore: missing data falls back without crashing', () => {
  const engine = makeEngine();
  const result = engine.calculateScore({
    cityId: 'bare',
    cityData: emptyCity(),
    startDate: '2025-06-15',
    endDate: '2025-06-20',
  });
  // Engine must still produce a finalScore in range and full breakdown.
  assert.ok(Number.isFinite(result.finalScore));
  assert.ok(result.finalScore >= 0 && result.finalScore <= 100);
  for (const name of ['culture', 'beach', 'timing', 'crowds', 'logistics']) {
    assert.ok(result.breakdown[name], `breakdown.${name} present even on empty city`);
  }
});

// ---------------------------------------------------------------------------
// formatResult / formatCityName
// ---------------------------------------------------------------------------

test('formatCityName capitalises hyphenated city ids', () => {
  const engine = makeEngine();
  assert.equal(engine.formatCityName('paris'), 'Paris');
  assert.equal(engine.formatCityName('san-sebastian'), 'San Sebastian');
  assert.equal(engine.formatCityName('aix-en-provence'), 'Aix En Provence');
});

test('formatResult emits "City flag — N (factor n, ...)" shape', () => {
  const engine = makeEngine();
  const result = engine.calculateScore({
    cityId: 'paris',
    cityData: cultureRichCity(),
    startDate: '2025-06-15',
    endDate: '2025-06-20',
  });
  // e.g. "Paris 🇫🇷 — 50 (culture 8, beach 0, timing 5, crowds 5, logistics 5)"
  // (value factor is disabled, so it does not appear in the breakdown string)
  assert.match(result.formatted, /^Paris .* — \d+ \(culture \d+, beach \d+, timing \d+, crowds \d+, logistics \d+\)$/);
});

// ---------------------------------------------------------------------------
// groupIntoTiers
// ---------------------------------------------------------------------------

function syntheticResult(cityId, finalScore) {
  return {
    cityId,
    country: 'FR',
    finalScore,
    breakdown: {
      culture: { score: 5, confidence: 0.8, reason: '' },
      beach: { score: 0, confidence: 0.9, reason: '' },
      timing: { score: 5, confidence: 0.5, reason: '' },
      crowds: { score: 5, confidence: 0.5, reason: '' },
      value: { score: 5, confidence: 0.5, reason: '' },
      logistics: { score: 5, confidence: 0.5, reason: '' },
    },
    formatted: `${cityId} — ${finalScore}`,
  };
}

test('groupIntoTiers respects min-score thresholds (73/64/55)', () => {
  const engine = makeEngine();
  // Default thresholds come from scoringConfig.json: tier1 >= 73, tier2 >= 64,
  // tier3 >= 55, tier4 >= 0 (recalibrated to the real score distribution).
  const tiers = engine.groupIntoTiers([
    syntheticResult('a', 95),
    syntheticResult('b', 82),
    syntheticResult('c', 75),
    syntheticResult('d', 65),
    syntheticResult('e', 50),
  ]);

  assert.deepEqual(tiers.tier1.cities.map((c) => c.cityId), ['a', 'b', 'c']); // all >= 73
  assert.deepEqual(tiers.tier2.cities.map((c) => c.cityId), ['d']);          // 65 >= 64
  assert.deepEqual(tiers.tier3.cities.map((c) => c.cityId), []);             // none in 55..63
  assert.deepEqual(tiers.tier4.cities.map((c) => c.cityId), ['e']);          // 50 < 55
});

test('groupIntoTiers respects maxPerTier count caps and overflows downward', () => {
  const engine = makeEngine();
  // 5 tier-1-eligible scores (>= 80), but only 2 slots in tier1.
  const tiers = engine.groupIntoTiers(
    [
      syntheticResult('a', 95),
      syntheticResult('b', 90),
      syntheticResult('c', 85),
      syntheticResult('d', 82),
      syntheticResult('e', 81),
    ],
    { maxPerTier: [2, 2, 2, 2], minScores: [80, 70, 60, 0] },
  );

  assert.equal(tiers.tier1.cities.length, 2);
  // Overflow goes to tier2 because score still >= 70.
  assert.equal(tiers.tier2.cities.length, 2);
  // Then tier3, then tier4.
  assert.equal(tiers.tier3.cities.length, 1);
});

// ---------------------------------------------------------------------------
// buildWhyString / buildExpandedWhyString
// ---------------------------------------------------------------------------

test('buildWhyString prefers an event headline when present', () => {
  const engine = makeEngine();
  const breakdown = {
    timing: { score: 8, confidence: 0.9, reason: 'good', details: { event: 'Bastille Day', weatherHighC: 26 } },
    crowds: { score: 5 },
  };
  const why = engine.buildWhyString(breakdown, cultureRichCity());
  assert.match(why, /Bastille Day/);
  assert.match(why, /26/);
});

test('buildWhyString falls back to weather phrasing when nothing else is set', () => {
  const engine = makeEngine();
  const why = engine.buildWhyString(
    {
      timing: { score: 5, confidence: 0.5, reason: 'meh', details: { weatherHighC: 18 } },
      crowds: { score: 5 },
    },
    emptyCity(),
  );
  // 18°C should map to "mild ... sightseeing"
  assert.match(why, /mild|18/);
});

test('getTopAttraction handles both .sites and bare-array shapes', () => {
  const engine = makeEngine();
  assert.equal(
    engine.getTopAttraction({ attractions: { sites: [{ name: 'Louvre' }] } }),
    'Louvre',
  );
  assert.equal(
    engine.getTopAttraction({ attractions: [{ name: 'Sagrada Familia' }] }),
    'Sagrada Familia',
  );
  assert.equal(engine.getTopAttraction({}), null);
});
