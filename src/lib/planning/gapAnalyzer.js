/**
 * Gap Analyzer
 *
 * Analyzes trip dates and anchors to identify gaps that need to be filled.
 */

/**
 * Calculate the number of days between two dates
 */
function daysBetween(startDate, endDate) {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Analyze gaps between anchors in a trip
 *
 * @param {Object} tripDates - { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 * @param {Array} anchors - Array of { id, city, startDate, endDate, ... }
 * @returns {Array} Array of gap objects
 */
export function analyzeGaps(tripDates, anchors) {
  if (!tripDates.start || !tripDates.end || anchors.length === 0) {
    return [];
  }

  const gaps = [];

  // Sort anchors by start date
  const sortedAnchors = [...anchors].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  // Check for gap at the beginning (before first anchor)
  const firstAnchor = sortedAnchors[0];
  if (firstAnchor.startDate > tripDates.start) {
    const days = daysBetween(tripDates.start, firstAnchor.startDate);
    if (days > 0) {
      gaps.push({
        id: `gap-start-${firstAnchor.id}`,
        startDate: tripDates.start,
        endDate: firstAnchor.startDate,
        days,
        position: 'before',
        nextCity: firstAnchor.city,
        nextCityName: firstAnchor.cityName,
      });
    }
  }

  // Check for gaps between anchors
  for (let i = 0; i < sortedAnchors.length - 1; i++) {
    const current = sortedAnchors[i];
    const next = sortedAnchors[i + 1];

    const days = daysBetween(current.endDate, next.startDate);
    if (days > 0) {
      gaps.push({
        id: `gap-${current.id}-${next.id}`,
        startDate: current.endDate,
        endDate: next.startDate,
        days,
        position: 'between',
        previousCity: current.city,
        previousCityName: current.cityName,
        nextCity: next.city,
        nextCityName: next.cityName,
      });
    }
  }

  // Check for gap at the end (after last anchor)
  const lastAnchor = sortedAnchors[sortedAnchors.length - 1];
  if (lastAnchor.endDate < tripDates.end) {
    const days = daysBetween(lastAnchor.endDate, tripDates.end);
    if (days > 0) {
      gaps.push({
        id: `gap-${lastAnchor.id}-end`,
        startDate: lastAnchor.endDate,
        endDate: tripDates.end,
        days,
        position: 'after',
        previousCity: lastAnchor.city,
        previousCityName: lastAnchor.cityName,
      });
    }
  }

  return gaps;
}

/**
 * Validate that anchors don't overlap and fit within trip dates
 *
 * @param {Object} tripDates - { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 * @param {Array} anchors - Array of anchor objects
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateAnchors(tripDates, anchors) {
  const errors = [];

  if (!tripDates.start || !tripDates.end) {
    errors.push('Trip dates are required');
    return { valid: false, errors };
  }

  const tripStart = new Date(tripDates.start);
  const tripEnd = new Date(tripDates.end);

  // Sort anchors by start date
  const sortedAnchors = [...anchors].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  for (let i = 0; i < sortedAnchors.length; i++) {
    const anchor = sortedAnchors[i];
    const anchorStart = new Date(anchor.startDate);
    const anchorEnd = new Date(anchor.endDate);

    // Check if anchor is within trip dates
    if (anchorStart < tripStart) {
      errors.push(`${anchor.cityName} starts before your trip begins`);
    }
    if (anchorEnd > tripEnd) {
      errors.push(`${anchor.cityName} ends after your trip ends`);
    }

    // Check for overlap with next anchor
    if (i < sortedAnchors.length - 1) {
      const nextAnchor = sortedAnchors[i + 1];
      const nextStart = new Date(nextAnchor.startDate);

      if (anchorEnd > nextStart) {
        errors.push(`${anchor.cityName} overlaps with ${nextAnchor.cityName}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Suggest how many days to allocate to a city based on the gap size
 *
 * @param {number} gapDays - Number of days in the gap
 * @param {string} cityId - The city being suggested
 * @returns {number} Recommended days
 */
export function suggestDaysForCity(gapDays, cityId) {
  // Major cities deserve more time
  const majorCities = [
    'paris', 'london', 'rome', 'barcelona', 'amsterdam',
    'berlin', 'prague', 'vienna', 'lisbon', 'madrid'
  ];

  const isMajor = majorCities.includes(cityId);

  if (gapDays <= 2) return gapDays;
  if (gapDays <= 4) return isMajor ? gapDays : Math.min(gapDays - 1, 3);
  if (gapDays <= 7) return isMajor ? 4 : 3;

  // For very long gaps, cap at 4-5 days per city
  return isMajor ? 5 : 4;
}
