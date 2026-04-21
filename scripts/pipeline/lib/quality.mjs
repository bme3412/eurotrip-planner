/**
 * Data Quality Scoring
 *
 * Calculates quality scores for city data based on completeness and validity.
 */

/**
 * Helper to get attractions array (handles nested structure).
 * Data can be: attractions[] OR attractions.sites[]
 */
function getAttractions(data) {
  if (Array.isArray(data.attractions)) return data.attractions;
  if (Array.isArray(data.attractions?.sites)) return data.attractions.sites;
  return [];
}

/**
 * Helper to get neighborhoods array (handles nested structure).
 * Data can be: neighborhoods[] OR neighborhoods.neighborhoods[]
 */
function getNeighborhoods(data) {
  if (Array.isArray(data.neighborhoods)) return data.neighborhoods;
  if (Array.isArray(data.neighborhoods?.neighborhoods)) return data.neighborhoods.neighborhoods;
  return [];
}

/**
 * Quality check definitions.
 * Each check has a weight and a function that returns a score (0-100).
 */
const QUALITY_CHECKS = {
  // Core data presence
  hasAttractions: {
    weight: 25,
    check: (data) => {
      const attractions = getAttractions(data);
      const count = attractions.length;
      if (count === 0) return 0;
      if (count >= 10) return 100;
      if (count >= 5) return 80;
      if (count >= 3) return 60;
      return 40;
    },
  },

  hasVisitCalendar: {
    weight: 20,
    check: (data) => {
      // months can be an array OR an object keyed by month name
      const months = data.visitCalendar?.months;
      if (!months) return 0;

      const monthCount = Array.isArray(months)
        ? months.length
        : Object.keys(months).length;

      if (monthCount >= 12) return 100;
      if (monthCount >= 6) return 60;
      if (monthCount > 0) return 30;
      return 0;
    },
  },

  hasConnections: {
    weight: 15,
    check: (data) => {
      const connections = data.connections || data.transport || [];
      const count = Array.isArray(connections) ? connections.length : Object.keys(connections).length;
      if (count === 0) return 0;
      if (count >= 10) return 100;
      if (count >= 5) return 80;
      if (count >= 2) return 60;
      return 40;
    },
  },

  hasNeighborhoods: {
    weight: 10,
    check: (data) => {
      const neighborhoods = getNeighborhoods(data);
      const count = neighborhoods.length;
      if (count === 0) return 0;
      if (count >= 5) return 100;
      if (count >= 3) return 70;
      return 50;
    },
  },

  hasCoordinates: {
    weight: 5,
    check: (data) => {
      if (data.coordinates?.lat && data.coordinates?.lng) return 100;
      if (data.latitude && data.longitude) return 100;
      return 0;
    },
  },

  hasDescription: {
    weight: 5,
    check: (data) => {
      // Check various locations for description
      const desc = data.description ||
        data.overview?.brief_description ||
        (typeof data.overview === 'string' ? data.overview : null);
      if (!desc) return 0;
      if (desc.length >= 200) return 100;
      if (desc.length >= 100) return 70;
      return 40;
    },
  },

  hasTourismCategories: {
    weight: 5,
    check: (data) => {
      const count = Array.isArray(data.tourismCategories) ? data.tourismCategories.length : 0;
      if (count === 0) return 0;
      if (count >= 3) return 100;
      if (count >= 1) return 60;
      return 0;
    },
  },

  // Data quality
  attractionsHaveDetails: {
    weight: 10,
    check: (data) => {
      const attractions = getAttractions(data);
      if (attractions.length === 0) return 50; // N/A

      let detailed = 0;
      for (const attr of attractions) {
        // Check for description and either category or type
        if (attr && attr.description && (attr.category || attr.type)) detailed++;
      }
      const ratio = detailed / attractions.length;
      return Math.round(ratio * 100);
    },
  },

  calendarHasEvents: {
    weight: 5,
    check: (data) => {
      const monthsData = data.visitCalendar?.months;
      if (!monthsData) return 50; // N/A

      // Handle both array and object formats
      const months = Array.isArray(monthsData) ? monthsData : Object.values(monthsData);
      if (months.length === 0) return 50; // N/A

      let withEvents = 0;
      for (const month of months) {
        if (!month) continue;

        // Check multiple data shapes:
        // 1. month.events[] / month.highlights[] / month.keyEvents[] (old formats)
        // 2. month.ranges[] with event/special fields (current format)
        const hasEventsArray = month.events?.length > 0 || month.highlights?.length > 0 || month.keyEvents?.length > 0;
        const hasRangesWithEvents = month.ranges?.some(r => r.event || r.special);

        if (hasEventsArray || hasRangesWithEvents) {
          withEvents++;
        }
      }
      const ratio = withEvents / months.length;
      return Math.round(ratio * 100);
    },
  },
};

/**
 * Calculate quality score for city data.
 *
 * @param {Object} data - City data object
 * @returns {Object} { score, breakdown, issues }
 */
export function calculateQualityScore(data) {
  if (!data) {
    return { score: 0, breakdown: {}, issues: ['No data provided'] };
  }

  let totalWeight = 0;
  let weightedScore = 0;
  const breakdown = {};
  const issues = [];

  for (const [checkName, check] of Object.entries(QUALITY_CHECKS)) {
    const score = check.check(data);
    breakdown[checkName] = {
      score,
      weight: check.weight,
      contribution: (score * check.weight) / 100,
    };

    weightedScore += score * check.weight;
    totalWeight += check.weight;

    // Track issues
    if (score === 0) {
      issues.push(`Missing: ${checkName.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}`);
    } else if (score < 50) {
      issues.push(`Incomplete: ${checkName.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}`);
    }
  }

  const finalScore = Math.round(weightedScore / totalWeight);

  return {
    score: finalScore,
    breakdown,
    issues,
  };
}

/**
 * Get completeness summary for a city.
 */
export function getCompletenessCheck(data) {
  // Calendar months can be array or object
  const months = data.visitCalendar?.months;
  const hasCalendar = months && (
    (Array.isArray(months) && months.length > 0) ||
    (typeof months === 'object' && Object.keys(months).length > 0)
  );

  return {
    attractions: getAttractions(data).length > 0,
    calendar: hasCalendar,
    connections: (Array.isArray(data.connections) ? data.connections.length : Object.keys(data.connections || {}).length) > 0,
    neighborhoods: getNeighborhoods(data).length > 0,
    coordinates: !!(data.coordinates?.lat || data.latitude),
    description: !!(data.description || data.overview?.brief_description || (typeof data.overview === 'string' && data.overview)),
    categories: Array.isArray(data.tourismCategories) && data.tourismCategories.length > 0,
  };
}

/**
 * Calculate aggregate quality stats for multiple cities.
 */
export function calculateAggregateStats(cityScores) {
  if (cityScores.length === 0) {
    return { avg: 0, min: 0, max: 0, distribution: {} };
  }

  const scores = cityScores.map(c => c.score);
  const sum = scores.reduce((a, b) => a + b, 0);

  const distribution = {
    excellent: scores.filter(s => s >= 80).length,
    good: scores.filter(s => s >= 60 && s < 80).length,
    fair: scores.filter(s => s >= 40 && s < 60).length,
    poor: scores.filter(s => s >= 20 && s < 40).length,
    minimal: scores.filter(s => s < 20).length,
  };

  return {
    avg: Math.round(sum / scores.length),
    min: Math.min(...scores),
    max: Math.max(...scores),
    distribution,
    total: scores.length,
  };
}

/**
 * Get quality tier label.
 */
export function getQualityTier(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'minimal';
}
