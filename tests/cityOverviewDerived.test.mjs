import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  mostFrequent,
  formatMonthList,
  buildCalendarData,
  buildMonthInsights,
  computeBestTravelerMonth,
  computeValueMonths,
  computeTripFitRecommendations,
  planMonthHref,
  buildTooltipData,
} from '../src/components/city-guides/overview/lib/derived.js';

// ---------- mostFrequent ----------

test('mostFrequent: returns the most common truthy value', () => {
  assert.equal(mostFrequent(['a', 'b', 'a', 'c', 'a']), 'a');
  assert.equal(mostFrequent(['x', 'y', 'y']), 'y');
});

test('mostFrequent: ignores falsy values', () => {
  assert.equal(mostFrequent([null, undefined, '', 'low', 'low']), 'low');
});

test('mostFrequent: returns null for empty / non-array input', () => {
  assert.equal(mostFrequent([]), null);
  assert.equal(mostFrequent(null), null);
  assert.equal(mostFrequent(undefined), null);
});

// ---------- formatMonthList ----------

test('formatMonthList: joins first two months with a slash', () => {
  assert.equal(formatMonthList(['April', 'May']), 'April / May');
  assert.equal(formatMonthList(['April', 'May', 'June']), 'April / May');
});

test('formatMonthList: returns single month unchanged', () => {
  assert.equal(formatMonthList(['September']), 'September');
});

test('formatMonthList: uses fallback when list is empty', () => {
  assert.equal(formatMonthList([]), 'See calendar');
  assert.equal(formatMonthList(null, 'April-June'), 'April-June');
  assert.equal(formatMonthList(undefined, 'X'), 'X');
});

// ---------- buildCalendarData ----------

const sampleVisitCalendar = {
  months: {
    april: {
      weatherDetails: { lowC: 8, highC: 18, daylightHours: 13 },
      crowdLevel: 'Moderate',
      priceLevel: 'Mid',
      ranges: [
        {
          days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          score: 4,
          special: false,
          event: null,
          notes: '',
          crowdLevel: 'Moderate',
          price: 'Mid',
          travelerTypes: { families: 4, couples: 5, solo: 3 },
        },
        {
          days: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
          score: 5,
          special: true,
          event: 'Spring festival',
          notes: 'Peak bloom in the gardens',
          crowdLevel: 'Moderate',
          price: 'Mid',
          travelerTypes: { families: 5, couples: 5 },
        },
      ],
    },
    august: {
      weatherDetails: { lowC: 17, highC: 28 },
      crowdLevel: 'Very high',
      priceLevel: 'High',
      ranges: [
        {
          days: Array.from({ length: 31 }, (_, i) => i + 1),
          score: 2,
          special: false,
          crowdLevel: 'Very high',
          price: 'High',
          travelerTypes: { families: 2, couples: 3, solo: 2 },
        },
      ],
    },
    november: {
      weatherDetails: { lowC: 4, highC: 10 },
      crowdLevel: 'Low',
      priceLevel: 'Low value',
      ranges: [
        {
          days: Array.from({ length: 30 }, (_, i) => i + 1),
          score: 4,
          special: false,
          crowdLevel: 'Low',
          price: 'Low value',
          travelerTypes: { families: 3, couples: 4, solo: 5, budget: 5 },
        },
      ],
    },
  },
};

test('buildCalendarData: returns null when no months supplied', () => {
  assert.equal(buildCalendarData(null), null);
  assert.equal(buildCalendarData({}), null);
  assert.equal(buildCalendarData({ months: null }), null);
});

test('buildCalendarData: produces 12 months in calendar order', () => {
  const data = buildCalendarData(sampleVisitCalendar);
  assert.equal(data.length, 12);
  assert.equal(data[0].monthName, 'January');
  assert.equal(data[3].monthName, 'April');
  assert.equal(data[11].monthName, 'December');
});

test('buildCalendarData: each month has empty cells + day cells', () => {
  const data = buildCalendarData(sampleVisitCalendar);
  const april = data[3];
  const dayCells = april.days.filter((d) => d.type === 'day');
  // April has 30 days.
  assert.equal(dayCells.length, 30);
  // First scored day should have rating 4 from the first range.
  assert.equal(dayCells[0].rating, 4);
  assert.equal(dayCells[0].color, '#34d399');
  // Last scored day should be in the second range with rating 5 + special.
  assert.equal(dayCells[29].rating, 5);
  assert.equal(dayCells[29].special, true);
  assert.equal(dayCells[29].event, 'Spring festival');
});

test('buildCalendarData: counts special events per month', () => {
  const data = buildCalendarData(sampleVisitCalendar);
  const april = data[3];
  assert.equal(april.specialEventsCount, 15);
  const august = data[7];
  assert.equal(august.specialEventsCount, 0);
});

test('buildCalendarData: months without data get placeholder days at rating 3', () => {
  const data = buildCalendarData(sampleVisitCalendar);
  const january = data[0];
  const dayCells = january.days.filter((d) => d.type === 'day');
  assert.equal(dayCells[0].rating, 3);
  assert.equal(dayCells[0].isPlaceholder, true);
});

test('buildCalendarData: traveler filter blends per-range traveler scores', () => {
  const data = buildCalendarData(sampleVisitCalendar, 'families');
  const april = data[3];
  const dayCells = april.days.filter((d) => d.type === 'day');
  // First range general 4 + families 4 → round((4+4)/2) = 4.
  assert.equal(dayCells[0].rating, 4);
  // Second range general 5 + families 5 → 5.
  assert.equal(dayCells[29].rating, 5);
});

// ---------- buildMonthInsights ----------

test('buildMonthInsights: returns [] when calendar is empty', () => {
  assert.deepEqual(buildMonthInsights(null, sampleVisitCalendar), []);
  assert.deepEqual(buildMonthInsights([], sampleVisitCalendar), []);
});

test('buildMonthInsights: aggregates averageScore, rating, weatherLabel', () => {
  const calendar = buildCalendarData(sampleVisitCalendar);
  const insights = buildMonthInsights(calendar, sampleVisitCalendar);
  const april = insights.find((m) => m.monthName === 'April');
  assert.ok(april.averageScore > 4 && april.averageScore <= 5);
  assert.equal(april.rating, 5);
  assert.equal(april.weatherLabel, '8-18°C');
  assert.equal(april.daylightLabel, '13h daylight');
  assert.equal(april.crowdLevel, 'Moderate');
  assert.equal(april.priceLevel, 'Mid');
});

test('buildMonthInsights: clamps rating to 1-5 range', () => {
  const calendar = buildCalendarData(sampleVisitCalendar);
  const insights = buildMonthInsights(calendar, sampleVisitCalendar);
  insights.forEach((m) => {
    assert.ok(m.rating >= 1 && m.rating <= 5, `${m.monthName} rating in range`);
  });
});

// ---------- computeBestTravelerMonth ----------

test('computeBestTravelerMonth: returns null for "all"', () => {
  assert.equal(computeBestTravelerMonth(sampleVisitCalendar, 'all'), null);
});

test('computeBestTravelerMonth: returns null with no calendar', () => {
  assert.equal(computeBestTravelerMonth(null, 'families'), null);
  assert.equal(computeBestTravelerMonth({}, 'families'), null);
});

test('computeBestTravelerMonth: picks highest-scoring month for the filter', () => {
  // For families: April (4 and 5) vs August (2) vs November (3) → April wins.
  assert.equal(computeBestTravelerMonth(sampleVisitCalendar, 'families'), 'April');
  // For budget: only November has a budget score (5).
  assert.equal(computeBestTravelerMonth(sampleVisitCalendar, 'budget'), 'November');
});

// ---------- computeValueMonths ----------

test('computeValueMonths: returns [] for non-array input', () => {
  assert.deepEqual(computeValueMonths(null), []);
  assert.deepEqual(computeValueMonths(undefined), []);
});

test('computeValueMonths: rewards low-priced, lower-crowd months', () => {
  const calendar = buildCalendarData(sampleVisitCalendar);
  const insights = buildMonthInsights(calendar, sampleVisitCalendar);
  const result = computeValueMonths(insights);
  assert.equal(result.length, 2);
  // November has "Low value" pricing + "Low" crowds → gets +0.6 +0.3 bonuses.
  assert.ok(result.includes('November'), 'November in top value months');
});

// ---------- computeTripFitRecommendations ----------

test('computeTripFitRecommendations: returns [] for empty input', () => {
  assert.deepEqual(computeTripFitRecommendations([], { traveler: 'couples' }), []);
  assert.deepEqual(computeTripFitRecommendations(null, { traveler: 'couples' }), []);
});

test('computeTripFitRecommendations: returns at most 3 months sorted by fit', () => {
  const calendar = buildCalendarData(sampleVisitCalendar);
  const insights = buildMonthInsights(calendar, sampleVisitCalendar);
  const result = computeTripFitRecommendations(insights, {
    traveler: 'couples',
    budget: 'budget',
    crowd: 'quiet',
  });
  assert.equal(result.length, 3);
  // Each entry carries a fitScore.
  result.forEach((m) => assert.equal(typeof m.fitScore, 'number'));
  // Sorted descending.
  for (let i = 1; i < result.length; i++) {
    assert.ok(result[i - 1].fitScore >= result[i].fitScore, 'sorted desc');
  }
});

test('computeTripFitRecommendations: penalises high-crowd months for "quiet"', () => {
  const calendar = buildCalendarData(sampleVisitCalendar);
  const insights = buildMonthInsights(calendar, sampleVisitCalendar);
  const result = computeTripFitRecommendations(insights, {
    traveler: 'couples',
    budget: 'mid',
    crowd: 'quiet',
  });
  // August has "Very high" crowds → should be penalised hard.
  const august = result.find((m) => m.monthName === 'August');
  if (august) {
    assert.ok(august.fitScore < (insights.find((m) => m.monthName === 'August').averageScore));
  }
});

// ---------- planMonthHref ----------

test('planMonthHref: builds an encoded city + month URL', () => {
  const href = planMonthHref('Paris', 'April');
  assert.ok(href.startsWith('/plan/paris?'));
  assert.ok(href.includes('city=Paris'));
  assert.ok(href.includes('month=April'));
});

test('planMonthHref: includes the event query when provided', () => {
  const href = planMonthHref('Rome', 'July', 'Festa de Noantri');
  assert.ok(href.includes('event=Festa+de+Noantri') || href.includes('event=Festa%20de%20Noantri'));
});

test('planMonthHref: defaults city to paris when missing', () => {
  const href = planMonthHref(null, 'May');
  assert.ok(href.startsWith('/plan/paris?'));
  assert.ok(href.includes('city=Paris'));
});

// ---------- buildTooltipData ----------

test('buildTooltipData: copies the event/notes/weather/crowd/price fields', () => {
  const day = {
    event: 'Bastille Day',
    notes: 'Fireworks at the Eiffel Tower',
    weather: '15-28°C',
    crowdLevel: 'High',
    price: 'Premium',
  };
  const data = buildTooltipData(day, 6, 14);
  assert.equal(data.monthIndex, 6);
  assert.equal(data.dayOfMonth, 14);
  assert.equal(data.event, 'Bastille Day');
  assert.equal(data.notes, 'Fireworks at the Eiffel Tower');
  assert.equal(data.weather, '15-28°C');
  assert.equal(data.crowdLevel, 'High');
  assert.equal(data.price, 'Premium');
});
