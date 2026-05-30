/**
 * V4 Scoring Utilities
 *
 * Consolidated utilities for the simplified 6-factor scoring system.
 */

import config from '../config/scoringConfig.json' with { type: 'json' };

// ============ Scale Converters ============

export function clamp(value, min = 0, max = 10) {
  if (value === null || value === undefined) return null;
  return Math.max(min, Math.min(max, value));
}

export function from100To10(value) {
  if (value === null || value === undefined) return null;
  return Math.round((value / 100) * 10 * 10) / 10;
}

export function from10To100(value) {
  if (value === null || value === undefined) return null;
  return Math.round(value * 10);
}

// ============ Date Parsers ============

export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    // Parse bare YYYY-MM-DD as LOCAL midnight. `new Date("2026-06-01")` is parsed
    // as UTC midnight, which rolls back to the previous day/month in any timezone
    // behind UTC (e.g. the Americas) — that shifted getMonth() by one for every
    // US-timezone user, corrupting weather/season/daylight lookups.
    const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(dateInput);
}

export function getMonthName(date) {
  const d = parseDate(date);
  if (!d) return null;
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  return monthNames[d.getMonth()];
}

export function getMonthIndex(date) {
  const d = parseDate(date);
  return d ? d.getMonth() : null;
}

// ============ Journey Time Parsers ============

export function parseJourneyTimeMinutes(timeStr) {
  if (!timeStr || timeStr === 'N/A') return null;
  const str = timeStr.toLowerCase().trim();

  const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = str.match(/(\d+)\s*m(?:in)?/);

  let totalMinutes = 0;
  if (hoursMatch) totalMinutes += parseFloat(hoursMatch[1]) * 60;
  if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);

  if (totalMinutes === 0) {
    const verboseHours = str.match(/(\d+)\s*hours?/);
    const verboseMinutes = str.match(/(\d+)\s*minutes?/);
    if (verboseHours) totalMinutes += parseInt(verboseHours[1], 10) * 60;
    if (verboseMinutes) totalMinutes += parseInt(verboseMinutes[1], 10);
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

// ============ Crowd Level Normalizers ============

const CROWD_ALIASES = {
  'very low': 'very low', 'low': 'low', 'moderate': 'moderate',
  'high': 'high', 'very high': 'very high', 'extreme': 'extreme',
  'medium': 'moderate', 'medium-high': 'high', 'busy': 'high',
  'crowded': 'very high', 'packed': 'extreme', 'quiet': 'very low',
  'sparse': 'low', 'manageable': 'moderate', 'peak season': 'very high',
  'shoulder season': 'moderate', 'off-season': 'low', 'off season': 'low'
};

export function normalizeCrowdLevel(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();

  if (CROWD_ALIASES[lower]) return CROWD_ALIASES[lower];

  // Keyword inference
  if (lower.includes('extreme') || lower.includes('packed')) return 'extreme';
  if (lower.includes('very high')) return 'very high';
  if (lower.includes('high') || lower.includes('busy')) return 'high';
  if (lower.includes('moderate') || lower.includes('medium')) return 'moderate';
  if (lower.includes('low')) return 'low';
  if (lower.includes('very low') || lower.includes('quiet')) return 'very low';

  return 'moderate';
}

// ============ Price Normalizers ============

export function normalizePriceLevel(raw) {
  if (!raw) return null;

  // Handle object with primary property
  if (typeof raw === 'object' && raw.primary) {
    return raw.primary;
  }

  const lower = String(raw).toLowerCase().trim();

  const mappings = {
    'budget': 'budget', 'low': 'budget', 'cheap': 'budget',
    'moderate': 'moderate', 'medium': 'moderate', 'average': 'moderate',
    'expensive': 'expensive', 'high': 'expensive', 'pricey': 'expensive',
    'luxury': 'luxury', 'very expensive': 'luxury', 'premium': 'luxury'
  };

  if (mappings[lower]) return mappings[lower];

  // Euro symbol detection
  const euroCount = (lower.match(/€/g) || []).length;
  if (euroCount === 1) return 'budget';
  if (euroCount === 2) return 'moderate';
  if (euroCount === 3) return 'expensive';
  if (euroCount >= 4) return 'luxury';

  return 'moderate';
}

// ============ Category Inference ============

// Maps an attraction type/category keyword to a normalized tourism category.
const CATEGORY_KEYWORDS = [
  [['museum', 'gallery'], 'Museums'],
  [['cathedral', 'church', 'basilica', 'monastery', 'temple', 'synagogue', 'mosque'], 'Religious Heritage'],
  [['castle', 'fortress', 'palace', 'citadel'], 'Historical'],
  [['ruin', 'archaeolog', 'roman', 'ancient', 'unesco', 'monument', 'old town', 'historic'], 'Historical'],
  [['beach', 'coast', 'seaside', 'bay', 'lido', 'promenade'], 'Beach & Coastal'],
  [['park', 'garden', 'mountain', 'lake', 'forest', 'nature', 'hike', 'trail', 'falls', 'fjord'], 'Nature & Outdoors'],
  [['opera', 'theater', 'theatre', 'concert', 'philharmon'], 'Arts & Culture'],
  [['market', 'food', 'wine', 'culinary', 'brewery', 'vineyard'], 'Food & Drink'],
  [['bridge', 'tower', 'square', 'architecture'], 'Architecture'],
];

/**
 * Infer tourism categories from a city's attractions when the data file does not
 * provide `tourismCategories` (true for 100% of current city data). Returns a
 * de-duplicated, frequency-ordered list of normalized category strings.
 *
 * @param {Object} cityData
 * @returns {string[]}
 */
export function inferCategories(cityData) {
  if (Array.isArray(cityData?.tourismCategories) && cityData.tourismCategories.length) {
    return cityData.tourismCategories;
  }

  let sites = cityData?.attractions?.sites || cityData?.attractions || [];
  if (!Array.isArray(sites)) sites = sites.sites || [];
  if (!sites.length) return [];

  const counts = new Map();
  for (const site of sites) {
    const text = `${site?.name || ''} ${site?.type || ''} ${site?.category || ''} ${site?.description || ''}`.toLowerCase();
    for (const [keywords, label] of CATEGORY_KEYWORDS) {
      if (keywords.some((kw) => text.includes(kw))) {
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
}

// ============ Country Flag ============

export function getCountryFlag(country) {
  const code = config.countryFlags[country];
  if (!code) return '';

  // Convert country code to flag emoji
  const codePoints = code.split('').map(char =>
    127397 + char.charCodeAt(0)
  );
  return String.fromCodePoint(...codePoints);
}
