import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeBestMonths, monthAverageScore } from '../src/lib/city-guide/bestMonths.js';

const month = (name, entries) => ({
  name,
  ranges: entries.map(([count, score], i) => ({
    days: Array.from({ length: count }, (_, d) => i * 10 + d + 1),
    score,
  })),
});

test('monthAverageScore weights by day count', () => {
  const m = month('May', [[10, 5], [20, 4]]);
  assert.equal(monthAverageScore(m), (10 * 5 + 20 * 4) / 30);
});

test('monthAverageScore ignores unscored ranges and empty months', () => {
  assert.equal(monthAverageScore({ ranges: [{ days: [1], score: undefined }] }), null);
  assert.equal(monthAverageScore({}), null);
  assert.equal(monthAverageScore(undefined), null);
});

test('computeBestMonths returns top-band months in calendar order', () => {
  const months = {
    january: month('January', [[31, 2]]),
    may: month('May', [[31, 5]]),
    september: month('September', [[30, 5]]),
    december: month('December', [[31, 3]]),
  };
  assert.deepEqual(
    computeBestMonths(months).map((m) => m.key),
    ['may', 'september'],
  );
});

test('computeBestMonths relaxes to the Good band when few months are excellent', () => {
  const months = {
    april: month('April', [[30, 4]]),
    june: month('June', [[30, 4]]),
    august: month('August', [[31, 2]]),
  };
  assert.deepEqual(
    computeBestMonths(months).map((m) => m.key),
    ['april', 'june'],
  );
});

test('computeBestMonths returns empty rather than a single-month answer', () => {
  const months = { may: month('May', [[31, 5]]), june: month('June', [[30, 1]]) };
  assert.deepEqual(computeBestMonths(months), []);
});

test('computeBestMonths caps at max, keeping the best averages', () => {
  const months = Object.fromEntries(
    ['january', 'february', 'march', 'april', 'may', 'june', 'july']
      .map((key, i) => [key, month(key, [[30, i === 3 ? 4.6 : 5]])]),
  );
  const best = computeBestMonths(months, { max: 6 });
  assert.equal(best.length, 6);
  assert.ok(!best.some((m) => m.key === 'april'), 'lowest average is dropped');
});

test('computeBestMonths handles missing input', () => {
  assert.deepEqual(computeBestMonths(null), []);
  assert.deepEqual(computeBestMonths({}), []);
});
