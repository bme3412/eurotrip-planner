/**
 * Pure display helpers for the AttractionsList family.
 *
 * No React, no DOM, no fetch. Easy to unit test.
 */

export const capitalizeCity = (name) => {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const normalizePlaceName = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const getPriceIcon = (priceRange) => {
  if (!priceRange) return '€€';
  const value = String(priceRange).toLowerCase();
  if (value.includes('free')) return '🆓';
  if (value.includes('budget') || value.includes('low')) return '€';
  if (value.includes('moderate')) return '€€';
  if (value.includes('expensive') || value.includes('premium') || value.includes('high')) return '€€€';
  return '€€';
};

const TYPE_ICONS = {
  monument: '🏛️',
  'monument / tower': '🏛️',
  tower: '🏛️',
  'government building': '🏛️',
  museum: '🖼️',
  cathedral: '⛪',
  basilica: '⛪',
  chapel: '⛪',
  park: '🌳',
  garden: '🌳',
  square: '🏙️',
  plaza: '🏙️',
  district: '🏘️',
  neighborhood: '🏘️',
  street: '🛣️',
  activity: '🎯',
  experience: '🎯',
  'historical site': '🏺',
  'historical district': '🏺',
  'opera house': '🎭',
  'concert hall': '🎭',
  cemetery: '⚰️',
  harbor: '⚓',
  zoo: '🦁',
  lake: '🌊',
  'entertainment district': '🎪',
  architecture: '🏢',
};

export const getTypeIcon = (type) => TYPE_ICONS[String(type || '').toLowerCase()] || '📍';

export const getSignificanceColor = (significance) => {
  if (!significance) return 'bg-gray-100 text-gray-800';
  if (significance >= 9) return 'bg-green-100 text-green-800';
  if (significance >= 8) return 'bg-blue-100 text-blue-800';
  if (significance >= 7) return 'bg-indigo-100 text-indigo-800';
  return 'bg-gray-100 text-gray-800';
};

export const getSeasonalScoreColor = (score) => {
  if (score >= 5) return 'bg-green-100 text-green-800';
  if (score >= 3) return 'bg-blue-100 text-blue-800';
  if (score >= 1) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
};

export const overallScoreClass = (score) => {
  if (typeof score !== 'number') return 'bg-gray-100 text-gray-800';
  if (score >= 9) return 'bg-emerald-100 text-emerald-800';
  if (score >= 8) return 'bg-blue-100 text-blue-800';
  if (score >= 7) return 'bg-indigo-100 text-indigo-800';
  return 'bg-gray-100 text-gray-800';
};

export const formatDuration = (durationHours) => {
  const numeric = Number(durationHours);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Flexible';
  if (numeric < 1) return `${Math.round(numeric * 60)} mins`;
  if (Number.isInteger(numeric)) return `${numeric}h`;
  return `${numeric.toFixed(1)}h`;
};

export const formatCost = (attraction) => {
  if (attraction?.estimated_cost_eur === 0 || attraction?.pricing_tier === 'free') {
    return 'Free';
  }
  if (attraction?.estimated_cost_eur && attraction.estimated_cost_eur > 0) {
    return `~€${Math.round(attraction.estimated_cost_eur)}`;
  }
  const estimate = Number(attraction?.ratings?.cost_estimate);
  if (Number.isFinite(estimate) && estimate > 0) {
    return `~€${Math.round(estimate)}`;
  }
  if (Number.isFinite(estimate) && estimate === 0) {
    return 'Free';
  }
  if (attraction?.price_range) {
    const label = String(attraction.price_range);
    if (label.toLowerCase().includes('free')) return 'Free';
    if (label.length > 28) {
      return `${label.slice(0, 25).trimEnd()}…`;
    }
    return label;
  }
  return 'Varies';
};

/**
 * Generate up to 2 practical tips for an attraction.
 *
 * Prefers tips from the attraction's data; otherwise derives generic tips
 * from its scores / best_time / cost fields.
 */
export const generateTips = (attraction) => {
  if (Array.isArray(attraction?.tips) && attraction.tips.length > 0) {
    return attraction.tips.slice(0, 2);
  }

  const tips = [];
  const scores = attraction?.factorScores || attraction?.scores || {};
  const weatherScore = scores.weatherIndependence ?? scores.weather_independence;
  const accessScore = scores.accessibility;
  const crowdScore = scores.crowdManagement ?? scores.crowd_management;

  if (attraction?.best_time === 'morning') {
    tips.push('Morning visits offer the best experience—softer light and smaller crowds before 10am.');
  } else if (attraction?.best_time === 'evening' || attraction?.best_time === 'sunset') {
    tips.push('Plan to arrive 30–45 minutes before sunset for the magical golden hour atmosphere.');
  }

  if (weatherScore && weatherScore <= 5) {
    tips.push('This is an outdoor experience—check the forecast and have a covered backup nearby.');
  } else if (weatherScore && weatherScore >= 8) {
    tips.push('Mostly indoors, making it a reliable option for rainy days.');
  }

  if (accessScore && accessScore <= 5) {
    tips.push('Involves significant stairs or walking—check if elevator access is available before visiting.');
  }

  if (attraction?.estimated_cost_eur === 0 || attraction?.pricing_tier === 'free') {
    tips.push('Free to visit—bring a blanket or snacks to make the most of your time here.');
  } else if (attraction?.estimated_cost_eur && attraction.estimated_cost_eur > 15) {
    tips.push(`Entry is around €${attraction.estimated_cost_eur}—book online to save time and sometimes get a discount.`);
  }

  if (crowdScore && crowdScore <= 5) {
    tips.push('Can get very crowded—weekday mornings or the last hour before closing are typically quieter.');
  }

  return tips.slice(0, 2);
};
