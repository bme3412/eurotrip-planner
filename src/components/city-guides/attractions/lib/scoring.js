/**
 * Pure scoring helpers for the AttractionsList family.
 *
 * No React, no I/O. All functions are deterministic given their inputs.
 *
 * Score factor groups:
 *   • cultural    — historical significance, uniqueness, educational value
 *   • experience  — visitor quality, crowd management, family, photo appeal
 *   • practical   — accessibility, weather independence, value for money
 */

export const MAX_SEASONAL_SCORE = 8;

export const clamp01 = (value) => Math.min(1, Math.max(0, value));

export const normalizeValue = (value, bounds) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !bounds) return null;
  const { min, max } = bounds;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (Math.abs(max - min) < 1e-6) return 0.5;
  return clamp01((value - min) / (max - min));
};

export const CATEGORY_MULTIPLIERS = {
  hiddencorners: 0.86,
  daytrips_seasonal: 0.92,
  fooddrink: 0.95,
  parkgardens: 0.96,
  latenight: 0.97,
  afternoon: 1.02,
  evening: 1.03,
};

export const THEME_ADJUSTMENTS = {
  hidden_gem: -0.08,
  neighborhoods: -0.04,
  day_trip: -0.06,
  parks: -0.02,
  art: 0.02,
  history: 0.05,
  views: 0.05,
  nightlife: 0.02,
  food: 0.02,
};

export const ICONIC_KEYWORDS = [
  'eiffel',
  'louvre',
  'notre-dame',
  'arc de triomphe',
  'versailles',
  'sainte-chapelle',
  'sacre',
  'musée d\'orsay',
  'musee d\'orsay',
  'montmartre',
  'pompidou',
  'palace of versailles',
  'seine river cruise',
];

/**
 * Take the per-factor scores blob and produce the three aggregate axes.
 */
export const computeAggregateFactors = (factors) => {
  if (!factors || typeof factors !== 'object') return null;
  const get = (k) => (typeof factors[k] === 'number' ? factors[k] : null);
  const avg = (keys) => {
    const vals = keys.map(get).filter((v) => typeof v === 'number');
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  return {
    culturalValue: avg(['cultural_historical_significance', 'uniqueness_to_paris', 'educational_value']),
    experienceQuality: avg(['visitor_experience_quality', 'crowd_management', 'family_friendliness', 'photo_instagram_appeal']),
    practicalEase: avg(['accessibility', 'weather_independence', 'value_for_money']),
  };
};

export const getPriceRangeScore = (priceRange) => {
  if (!priceRange) return 5;
  const normalized = String(priceRange).toLowerCase();
  if (normalized.includes('free')) return 9;
  if (normalized.includes('budget') || normalized.includes('low')) return 7.5;
  if (normalized.includes('moderate')) return 6;
  if (normalized.includes('premium') || normalized.includes('high') || normalized.includes('expensive')) return 4.5;
  return 5;
};

/**
 * Extract the three raw metrics + composite for a single attraction.
 *
 * Falls back through several shapes the data has accumulated over time:
 * `aggregates.*` → top-level `factorScores.*` → `ratings.*` → composite.
 */
export const getRawMetrics = (attraction) => {
  if (!attraction || typeof attraction !== 'object') {
    return { cultural: null, experience: null, practical: null, composite: null };
  }

  const composite = typeof attraction?.compositeScore === 'number' ? attraction.compositeScore : null;
  const culturalAggregate = typeof attraction?.aggregates?.culturalValue === 'number' ? attraction.aggregates.culturalValue : null;
  const culturalFallback =
    typeof attraction?.ratings?.cultural_significance === 'number'
      ? attraction.ratings.cultural_significance
      : typeof attraction?.factorScores?.cultural_historical_significance === 'number'
        ? attraction.factorScores.cultural_historical_significance
        : null;

  const experienceAggregate = typeof attraction?.aggregates?.experienceQuality === 'number' ? attraction.aggregates.experienceQuality : null;
  const experienceFallbackCandidates = [
    typeof attraction?.factorScores?.visitor_experience_quality === 'number' ? attraction.factorScores.visitor_experience_quality : null,
    typeof attraction?.factorScores?.crowd_management === 'number' ? attraction.factorScores.crowd_management : null,
    typeof attraction?.factorScores?.family_friendliness === 'number' ? attraction.factorScores.family_friendliness : null,
    typeof attraction?.factorScores?.photo_instagram_appeal === 'number' ? attraction.factorScores.photo_instagram_appeal : null,
  ].filter((v) => typeof v === 'number' && !Number.isNaN(v));

  const practicalAggregate = typeof attraction?.aggregates?.practicalEase === 'number' ? attraction.aggregates.practicalEase : null;
  const priceScore = getPriceRangeScore(attraction?.price_range);
  const duration = Number(attraction?.ratings?.suggested_duration_hours);
  let durationScore = null;
  if (Number.isFinite(duration)) {
    if (duration <= 1) durationScore = 9;
    else if (duration <= 1.5) durationScore = 8;
    else if (duration <= 2.5) durationScore = 7;
    else if (duration <= 4) durationScore = 6;
    else durationScore = Math.max(3, 10 - duration);
  }
  const indoorScore =
    attraction.indoor === true ? 8
      : attraction.indoor === false ? 6
        : 7;

  const practicalCandidates = [practicalAggregate, priceScore, durationScore, indoorScore]
    .filter((v) => typeof v === 'number' && !Number.isNaN(v));

  const average = (values) => {
    if (!values || values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  return {
    cultural: culturalAggregate ?? culturalFallback ?? composite,
    experience: experienceAggregate ?? average(experienceFallbackCandidates) ?? composite,
    practical: practicalAggregate ?? average(practicalCandidates) ?? composite,
    composite,
  };
};

/**
 * Compute min/max bounds for each metric over an array of attractions, used
 * to normalise individual scores into [0, 1] for the lens calculation.
 */
export const computeScoringBounds = (attractions) => {
  if (!Array.isArray(attractions) || attractions.length === 0) {
    return { cultural: null, experience: null, practical: null, composite: null };
  }
  const metrics = attractions.map(getRawMetrics);
  const computeBounds = (key) => {
    const values = metrics
      .map((m) => m[key])
      .filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (values.length === 0) return null;
    return { min: Math.min(...values), max: Math.max(...values) };
  };
  return {
    cultural: computeBounds('cultural'),
    experience: computeBounds('experience'),
    practical: computeBounds('practical'),
    composite: computeBounds('composite'),
  };
};

/**
 * Compute the lens-weighted score (0–10) for an attraction given:
 *   • the active ranking lens
 *   • the scoring bounds over the visible dataset
 *   • the active date filter type (folds seasonal_score in when set)
 *   • the per-attraction seasonal score (0..MAX_SEASONAL_SCORE)
 */
export const getLensScore = (attraction, {
  rankingLens = 'overall',
  scoringBounds,
  dateFilterType = 'none',
  seasonalScore = 0,
} = {}) => {
  if (!attraction || typeof attraction !== 'object') return 0;

  const metrics = getRawMetrics(attraction);
  const culturalNorm = normalizeValue(metrics.cultural, scoringBounds?.cultural);
  const experienceNorm = normalizeValue(metrics.experience, scoringBounds?.experience);
  const practicalNorm = normalizeValue(metrics.practical, scoringBounds?.practical);
  const compositeNorm = normalizeValue(metrics.composite, scoringBounds?.composite);
  const fallbackNorm = compositeNorm ?? 0.5;
  const resolve = (value) => (value == null ? fallbackNorm : value);

  const balanced =
    resolve(culturalNorm) * 0.4 +
    resolve(experienceNorm) * 0.35 +
    resolve(practicalNorm) * 0.25;

  let lensNormalized;
  switch (rankingLens) {
    case 'cultural':
      lensNormalized = resolve(culturalNorm);
      break;
    case 'experience':
      lensNormalized = resolve(experienceNorm);
      break;
    case 'practical':
      lensNormalized = resolve(practicalNorm);
      break;
    default:
      lensNormalized = balanced;
      break;
  }

  lensNormalized = clamp01(lensNormalized);

  const categoryKey = typeof attraction.category === 'string'
    ? attraction.category.toLowerCase()
    : null;
  const categoryMultiplier = categoryKey && CATEGORY_MULTIPLIERS[categoryKey] ? CATEGORY_MULTIPLIERS[categoryKey] : 1;
  lensNormalized = clamp01(lensNormalized * categoryMultiplier);

  let themeList = [];
  if (Array.isArray(attraction.themes) && attraction.themes.length > 0) {
    themeList = attraction.themes;
  } else if (attraction.type) {
    themeList = [String(attraction.type).toLowerCase()];
  }
  const themeAdjustment = themeList.reduce((acc, theme) => acc + (THEME_ADJUSTMENTS[theme] || 0), 0);
  lensNormalized = clamp01(lensNormalized + themeAdjustment);

  const name = String(attraction.name || '').toLowerCase();
  if (ICONIC_KEYWORDS.some((keyword) => name.includes(keyword))) {
    lensNormalized = clamp01(lensNormalized + 0.08);
  }

  if (dateFilterType !== 'none') {
    const seasonalNormalized = clamp01((seasonalScore || 0) / MAX_SEASONAL_SCORE);
    const combined = lensNormalized * 0.7 + seasonalNormalized * 0.3;
    return clamp01(combined) * 10;
  }

  return lensNormalized * 10;
};

const MONTH_KEYWORDS = {
  january: ['winter', 'cold', 'snow'],
  february: ['winter', 'cold', 'snow'],
  march: ['spring', 'bloom', 'mild'],
  april: ['spring', 'bloom', 'cherry', 'mild'],
  may: ['spring', 'bloom', 'warm'],
  june: ['summer', 'warm', 'sunny'],
  july: ['summer', 'hot', 'peak'],
  august: ['summer', 'hot', 'peak'],
  september: ['autumn', 'fall', 'mild'],
  october: ['autumn', 'fall', 'cool'],
  november: ['autumn', 'fall', 'cold'],
  december: ['winter', 'cold', 'christmas'],
};

/**
 * Score how well an attraction fits a given month (0..MAX_SEASONAL_SCORE).
 */
export const getSeasonalScore = (attraction, month, monthlyData) => {
  if (month === 'all' || !attraction) return 0;
  const monthData = monthlyData?.[month.charAt(0).toUpperCase() + month.slice(1)];
  if (!monthData) return 0;

  let score = 0;
  if (attraction.indoor === false) {
    const weather = monthData.first_half?.weather || monthData.second_half?.weather;
    if (weather?.average_temperature) {
      const temp = weather.average_temperature;
      const highTemp = temp.high_celsius || parseInt(temp.high, 10);
      const lowTemp = temp.low_celsius || parseInt(temp.low, 10);
      if (Number.isFinite(highTemp) && Number.isFinite(lowTemp)) {
        const avgTemp = (highTemp + lowTemp) / 2;
        if (avgTemp >= 15 && avgTemp <= 25) score += 3;
        else if (avgTemp >= 10 && avgTemp <= 30) score += 2;
        else if (avgTemp >= 5 && avgTemp <= 35) score += 1;
      }
    }
  }

  const seasonalNotes = monthData.first_half?.seasonal_notes || monthData.second_half?.seasonal_notes || '';
  if (seasonalNotes.toLowerCase().includes((attraction.name || '').toLowerCase())) {
    score += 2;
  }

  if (attraction.seasonal_notes) {
    const lower = attraction.seasonal_notes.toLowerCase();
    (MONTH_KEYWORDS[month] || []).forEach((keyword) => {
      if (lower.includes(keyword)) score += 1;
    });
  }

  return score;
};

/**
 * True if `attraction` matches the active curated filter id.
 */
export const matchesCuratedFilter = (attraction, filter) => {
  if (filter === 'all') return true;

  const scores = attraction.factorScores || attraction.scores || {};
  const name = (attraction.name || '').toLowerCase();
  const totalScore = attraction.compositeScore || scores.total_score || 0;
  const weatherIndependence = scores.weather_independence ?? 5;
  const familyFriendliness = scores.family_friendliness ?? 5;

  switch (filter) {
    case 'must-do': {
      const isIconic = ICONIC_KEYWORDS.some((keyword) => name.includes(keyword));
      return totalScore >= 8 || isIconic;
    }
    case 'free': {
      return attraction.estimated_cost_eur === 0
        || attraction.pricing_tier === 'free'
        || String(attraction.price_range || '').toLowerCase().includes('free');
    }
    case 'summer': {
      const isSummerTheme = (attraction.themes || []).some((t) =>
        ['views', 'parks', 'neighborhoods', 'gardens'].includes(t?.toLowerCase()));
      const isOutdoor = weatherIndependence <= 6;
      const summerCategory = ['morning', 'afternoon', 'parkgardens']
        .includes((attraction.category || '').toLowerCase());
      return isOutdoor || isSummerTheme || summerCategory;
    }
    case 'winter': {
      const isIndoor = weatherIndependence >= 7;
      const winterTheme = (attraction.themes || []).some((t) =>
        ['art', 'history', 'food', 'museums'].includes(t?.toLowerCase()));
      const winterCategory = ['afternoon', 'evening', 'latenight', 'fooddrink']
        .includes((attraction.category || '').toLowerCase());
      return isIndoor || winterTheme || winterCategory;
    }
    case 'rainy':
      return weatherIndependence >= 7;
    case 'family':
      return familyFriendliness >= 7;
    default:
      return true;
  }
};

export const getMonthFromDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  return monthNames[date.getMonth()];
};

export const isDateInRange = (dateString, start, end) => {
  if (!dateString || !start || !end) return false;
  const date = new Date(dateString);
  const startDate = new Date(start);
  const endDate = new Date(end);
  return date >= startDate && date <= endDate;
};
