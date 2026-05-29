/**
 * Pure derived-data helpers for CityOverview.
 *
 * No React, no DOM, no fetch.
 */

import { MONTH_NAMES, RATING_COLORS } from './constants';

/**
 * Return the most-frequent truthy value in an array, or null.
 */
export const mostFrequent = (items) => {
  if (!Array.isArray(items)) return null;
  const counts = items.filter(Boolean).reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
};

/**
 * Format a months list like "April / May", with a fallback when empty.
 */
export const formatMonthList = (months, fallback = 'See calendar') => {
  if (!months?.length) return fallback;
  return months.slice(0, 2).join(' / ');
};

/**
 * Resolve weather details for a given day inside a month payload.
 * Adjusted by a traveler-type filter when applicable.
 */
const getDayDetails = (day, monthData, travelerTypeFilter) => {
  if (!monthData?.ranges) return null;
  const range = monthData.ranges.find((r) => r.days?.includes(day));
  if (!range) return null;

  let weather = null;
  if (monthData.weatherDetails) {
    weather = `${monthData.weatherDetails.lowC}-${monthData.weatherDetails.highC}°C`;
  } else if (monthData.weatherHighC && monthData.weatherLowC) {
    weather = `${monthData.weatherLowC}-${monthData.weatherHighC}°C`;
  }

  let adjustedScore = range.score;
  if (travelerTypeFilter !== 'all' && range.travelerTypes?.[travelerTypeFilter] !== undefined) {
    adjustedScore = Math.round((range.score + range.travelerTypes[travelerTypeFilter]) / 2);
  }

  return {
    score: adjustedScore,
    special: range.special || false,
    event: range.event || null,
    notes: range.notes || '',
    weather,
    crowdLevel: range.crowdLevel || null,
    price: range.price || null,
    considerations: range.considerations || [],
  };
};

/**
 * Build the per-month, per-day calendar grid used by both the
 * 12-month overview and the selected-month panel.
 *
 * Returns null when no visitCalendar.months is supplied.
 */
export const buildCalendarData = (visitCalendar, travelerTypeFilter = 'all') => {
  if (!visitCalendar?.months) return null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  return MONTH_NAMES.map((monthName, monthIndex) => {
    const monthData = visitCalendar.months[monthName.toLowerCase()];
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
    const isCurrentMonth = monthIndex === currentMonth;

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ type: 'empty' });
    }

    let specialEventsCount = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const details = monthData ? getDayDetails(i, monthData, travelerTypeFilter) : null;
      const rating = details?.score || 3;
      if (details?.special) specialEventsCount++;
      days.push({
        type: 'day',
        dayOfMonth: i,
        rating,
        color: RATING_COLORS[rating],
        special: details?.special,
        event: details?.event,
        notes: details?.notes,
        weather: details?.weather,
        crowdLevel: details?.crowdLevel,
        price: details?.price,
        isPlaceholder: !details,
      });
    }

    return { monthName, monthIndex, days, isCurrentMonth, specialEventsCount };
  });
};

/**
 * Compute per-month aggregates (average score, weather label, crowd
 * level, etc.) from calendar data + the raw monthly payload.
 */
export const buildMonthInsights = (calendarData, visitCalendar) => {
  if (!Array.isArray(calendarData) || calendarData.length === 0) return [];

  return calendarData.map((month) => {
    const monthData = visitCalendar?.months?.[month.monthName.toLowerCase()] || {};
    const days = month.days.filter((day) => day.type === 'day');
    const scoredDays = days.filter((day) => !day.isPlaceholder);
    const scoreSource = scoredDays.length > 0 ? scoredDays : days;
    const averageScore = scoreSource.length
      ? scoreSource.reduce((sum, day) => sum + (day.rating || 3), 0) / scoreSource.length
      : 3;
    const weatherDetails = monthData.weatherDetails || {};
    const crowdLevel = monthData.crowdLevel || mostFrequent(days.map((day) => day.crowdLevel));
    const priceLevel = monthData.priceLevel || mostFrequent(days.map((day) => day.price));

    return {
      ...month,
      averageScore,
      rating: Math.max(1, Math.min(5, Math.round(averageScore))),
      weatherLabel:
        weatherDetails.lowC !== undefined && weatherDetails.highC !== undefined
          ? `${weatherDetails.lowC}-${weatherDetails.highC}°C`
          : null,
      daylightLabel: weatherDetails.daylightHours ? `${weatherDetails.daylightHours}h daylight` : null,
      crowdLevel,
      priceLevel,
      monthData,
    };
  });
};

/**
 * Choose the best month for a given traveler type, based on per-range
 * traveler scores. Returns null when filter is "all" or no data.
 */
export const computeBestTravelerMonth = (visitCalendar, travelerTypeFilter) => {
  if (travelerTypeFilter === 'all' || !visitCalendar?.months) return null;

  const ranked = MONTH_NAMES.map((monthName) => {
    const ranges = visitCalendar.months[monthName.toLowerCase()]?.ranges || [];
    const scores = ranges
      .map((range) => range.travelerTypes?.[travelerTypeFilter])
      .filter((score) => typeof score === 'number');

    if (!scores.length) return null;
    return {
      monthName,
      score: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    };
  }).filter(Boolean);

  return ranked.sort((a, b) => b.score - a.score)[0]?.monthName || null;
};

/**
 * Pick the top-2 "best value" months — high average score combined
 * with low/value pricing and quieter crowds.
 */
export const computeValueMonths = (monthInsights) => {
  if (!Array.isArray(monthInsights)) return [];
  const candidates = monthInsights
    .map((month) => {
      const priceText = String(month.priceLevel || '').toLowerCase();
      const crowdText = String(month.crowdLevel || '').toLowerCase();
      const valueBonus = priceText.includes('low') || priceText.includes('value') ? 0.6 : 0;
      const crowdBonus = crowdText.includes('low') || crowdText.includes('moderate') ? 0.3 : 0;
      return { monthName: month.monthName, score: month.averageScore + valueBonus + crowdBonus };
    })
    .sort((a, b) => b.score - a.score);

  return candidates.slice(0, 2).map((month) => month.monthName);
};

/**
 * Build the URL to the planner pre-filled with a city and month
 * (and optionally a specific event).
 */
export const planMonthHref = (cityName, monthName, eventName = null) => {
  const citySlug = encodeURIComponent(cityName?.toLowerCase() || 'paris');
  const params = new URLSearchParams({
    city: cityName || 'Paris',
    month: monthName,
  });
  if (eventName) params.set('event', eventName);
  return `/plan/${citySlug}?${params.toString()}`;
};

/**
 * Pick the tooltip payload for a calendar day.
 */
export const buildTooltipData = (day, monthIndex, dayOfMonth) => ({
  monthIndex,
  dayOfMonth,
  event: day.event,
  notes: day.notes,
  weather: day.weather,
  crowdLevel: day.crowdLevel,
  price: day.price,
});
