/**
 * Value Normalization Utilities for V3 Scoring
 *
 * Consolidates crowd level aliases and normalization logic from:
 * - cityScorer.js (CROWD_ALIASES)
 * - cityScoreV2.js (CROWD_ALIASES duplicate)
 */

import config from '../config/scoringConfig.json';

const { levels: CROWD_LEVELS } = config.factors.crowds;

/**
 * Extended crowd level aliases mapping.
 * Maps non-standard strings to canonical crowd levels.
 */
const CROWD_ALIASES = {
  // Standard lowercase mappings
  'very low': 'Very Low',
  'low': 'Low',
  'moderate': 'Moderate',
  'high': 'High',
  'very high': 'Very High',
  'extreme': 'Extreme',

  // Alternative names
  'medium': 'Moderate',
  'medium-high': 'High',
  'extremely high': 'Extreme',

  // Compound/transitional levels
  'low-moderate': 'Low',
  'low to moderate': 'Low',
  'moderate-high': 'High',
  'moderate to high': 'High',
  'moderately high': 'High',
  'high-very high': 'Very High',
  'very high to extreme': 'Very High',

  // Location-specific qualifiers (normalize to base level)
  'high at popular spots': 'High',
  'high at major museums': 'High',
  'high in montmartre': 'High',
  'high in tourist areas': 'High',
  'high at attractions': 'High',
  'high (tourists), low (locals)': 'High',
  'very high along route': 'Very High',
  'very high (tourists)': 'Very High',
  'very high at beaches': 'Very High',
  'low (streets), full (restaurants)': 'Moderate',

  // Descriptive terms
  'empty': 'Very Low',
  'quiet': 'Very Low',
  'sparse': 'Low',
  'manageable': 'Moderate',
  'busy': 'High',
  'crowded': 'Very High',
  'packed': 'Extreme',
  'overwhelming': 'Extreme',
  'tourist heavy': 'High',

  // Peak season indicators
  'peak season': 'Very High',
  'shoulder season': 'Moderate',
  'off-season': 'Low',
  'off season': 'Low',
};

/**
 * Normalize crowd level string to canonical form.
 *
 * @param {string} raw - Raw crowd level string
 * @returns {string|null} Canonical crowd level or null
 */
export function normalizeCrowdLevel(raw) {
  if (!raw) return null;

  const lower = raw.toLowerCase().trim();

  // Direct alias match
  if (CROWD_ALIASES[lower]) {
    return CROWD_ALIASES[lower];
  }

  // Check if already canonical (case-insensitive)
  const canonical = CROWD_LEVELS.find(l => l.toLowerCase() === lower);
  if (canonical) return canonical;

  // Partial match fallback - find first matching keyword
  for (const level of CROWD_LEVELS) {
    if (lower.includes(level.toLowerCase())) {
      return level;
    }
  }

  // Keyword inference
  if (lower.includes('extreme') || lower.includes('packed')) return 'Extreme';
  if (lower.includes('very high')) return 'Very High';
  if (lower.includes('high') || lower.includes('busy') || lower.includes('crowded')) return 'High';
  if (lower.includes('moderate') || lower.includes('medium')) return 'Moderate';
  if (lower.includes('low')) return 'Low';
  if (lower.includes('very low') || lower.includes('empty') || lower.includes('quiet')) return 'Very Low';

  // Return original if no match (will be handled by caller)
  return raw;
}

/**
 * Get numeric index for crowd level (0 = Very Low, 5 = Extreme).
 *
 * @param {string} level - Crowd level string
 * @returns {number} Index (0-5), or 3 (Moderate) as default
 */
export function getCrowdLevelIndex(level) {
  const normalized = normalizeCrowdLevel(level);
  const idx = CROWD_LEVELS.indexOf(normalized);
  return idx >= 0 ? idx : 3; // Default to Moderate
}

/**
 * Price range normalization mappings.
 */
const PRICE_RANGE_MAPPINGS = {
  // Standard values
  'free': { primary: 'free' },
  'budget': { primary: 'budget' },
  'low': { primary: 'budget' },
  'moderate': { primary: 'moderate' },
  'medium': { primary: 'moderate' },
  'expensive': { primary: 'expensive' },
  'high': { primary: 'expensive' },
  'luxury': { primary: 'luxury' },
  'very expensive': { primary: 'luxury' },
  'premium': { primary: 'luxury' },

  // Euro symbol variants
  '€': { primary: 'budget' },
  '€€': { primary: 'moderate' },
  '€€€': { primary: 'expensive' },
  '€€€€': { primary: 'luxury' },
};

/**
 * Normalize price range to standard enum.
 *
 * @param {string} raw - Raw price range string
 * @returns {Object} Normalized price with primary, optional secondary, and notes
 */
export function normalizePriceRange(raw) {
  if (!raw) return { primary: null };

  const lower = raw.toLowerCase().trim();

  // Direct mapping
  if (PRICE_RANGE_MAPPINGS[lower]) {
    return PRICE_RANGE_MAPPINGS[lower];
  }

  // Handle compound prices like "Free (park) / Moderate (zoo)"
  if (lower.includes('/') || lower.includes(',')) {
    const parts = lower.split(/[\/,]/).map(p => p.trim());
    const normalized = parts.map(p => {
      const match = Object.keys(PRICE_RANGE_MAPPINGS).find(k => p.includes(k));
      return match ? PRICE_RANGE_MAPPINGS[match].primary : null;
    }).filter(Boolean);

    if (normalized.length >= 2) {
      return {
        primary: normalized[0],
        secondary: normalized[1],
        note: raw,
      };
    }
  }

  // Handle "varies" or "variable"
  if (lower.includes('varies') || lower.includes('variable')) {
    return { primary: 'moderate', variablePricing: true, originalValue: raw };
  }

  // Handle "closed" or "N/A"
  if (lower.includes('closed') || lower === 'n/a') {
    return { primary: null, status: 'temporarily_closed' };
  }

  // Extract first recognized level
  const levels = ['free', 'budget', 'low', 'moderate', 'expensive', 'high', 'luxury', 'premium'];
  const found = levels.find(l => lower.includes(l));

  if (found) {
    const mapped = PRICE_RANGE_MAPPINGS[found]?.primary || found;
    return { primary: mapped, originalValue: raw };
  }

  // Fallback
  return { primary: 'moderate', originalValue: raw };
}

/**
 * Normalize temperature to comfort score (0-100).
 *
 * @param {number} temp - Temperature in Celsius
 * @param {Object} idealRange - { min, max } in Celsius
 * @returns {number} Comfort score 0-100
 */
export function normalizeTemperatureComfort(temp, idealRange = { min: 15, max: 25 }) {
  if (temp >= idealRange.min && temp <= idealRange.max) {
    return 100;
  }

  const deviation = temp < idealRange.min
    ? idealRange.min - temp
    : temp - idealRange.max;

  // Lose 5 points per degree outside ideal range, floor at 20
  return Math.max(20, 100 - (deviation * 5));
}

/**
 * Normalize traveler type to canonical form.
 *
 * @param {string} raw - Raw traveler type
 * @returns {string} Canonical traveler type
 */
export function normalizeTravelerType(raw) {
  if (!raw) return 'everyone';

  const lower = raw.toLowerCase().trim();

  const mappings = {
    'couple': 'couples',
    'couples': 'couples',
    'romantic': 'couples',
    'family': 'families',
    'families': 'families',
    'solo': 'solo',
    'solo traveler': 'solo',
    'solo traveller': 'solo',
    'budget': 'budget',
    'budget traveler': 'budget',
    'backpacker': 'budget',
    'luxury': 'luxury',
    'premium': 'luxury',
    'culture': 'culture',
    'cultural': 'culture',
    'foodie': 'foodie',
    'food lover': 'foodie',
    'culinary': 'foodie',
    'adventure': 'adventure',
    'adventurer': 'adventure',
    'everyone': 'everyone',
    'general': 'everyone',
  };

  return mappings[lower] || 'everyone';
}
