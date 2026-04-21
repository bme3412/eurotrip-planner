/**
 * Prompt parser for extracting travel intent from natural language.
 * Extracts cities, duration, budget, month, and themes from user input.
 */

import { getTheme, getThemeKeywords } from './themes';

// Month names for matching
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const MONTH_ABBREVS = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April',
  may: 'May', jun: 'June', jul: 'July', aug: 'August',
  sep: 'September', oct: 'October', nov: 'November', dec: 'December'
};

// Season mappings
const SEASONS = {
  spring: ['March', 'April', 'May'],
  summer: ['June', 'July', 'August'],
  autumn: ['September', 'October', 'November'],
  fall: ['September', 'October', 'November'],
  winter: ['December', 'January', 'February'],
  christmas: ['December'],
  'new year': ['December', 'January'],
  easter: ['March', 'April'],
};

/**
 * Build a trie for efficient multi-pattern matching.
 * @param {string[]} patterns - Array of patterns to match
 * @returns {Object} - Trie root node
 */
function buildTrie(patterns) {
  const root = { children: {}, patterns: [] };

  for (const pattern of patterns) {
    let node = root;
    const lower = pattern.toLowerCase();

    for (const char of lower) {
      if (!node.children[char]) {
        node.children[char] = { children: {}, patterns: [] };
      }
      node = node.children[char];
    }
    node.patterns.push(pattern);
  }

  return root;
}

/**
 * Match patterns in text using trie.
 * Returns matches with their positions.
 * @param {string} text - Input text
 * @param {Object} trie - Trie root
 * @returns {Array} - Array of { pattern, start, end }
 */
function matchTrie(text, trie) {
  const matches = [];
  const lower = text.toLowerCase();

  for (let i = 0; i < lower.length; i++) {
    // Check for word boundary at start
    if (i > 0 && /\w/.test(lower[i - 1])) continue;

    let node = trie;
    let j = i;

    while (j < lower.length && node.children[lower[j]]) {
      node = node.children[lower[j]];
      j++;

      // Check if we found a pattern and it ends at a word boundary
      if (node.patterns.length > 0) {
        const isWordEnd = j >= lower.length || !/\w/.test(lower[j]);
        if (isWordEnd) {
          for (const pattern of node.patterns) {
            matches.push({ pattern, start: i, end: j });
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Build city lookup structures.
 * @param {Array} cities - Array of city objects with id, name, country, lat, lon
 * @returns {Object} - { trie, cityMap }
 */
function buildCityMatcher(cities) {
  const cityMap = new Map();
  const patterns = [];

  for (const city of cities) {
    const name = city.name.toLowerCase();
    patterns.push(city.name);
    cityMap.set(name, city);

    // Also add without diacritics for common searches
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized !== name) {
      patterns.push(city.name);
      cityMap.set(normalized, city);
    }
  }

  return {
    trie: buildTrie(patterns),
    cityMap
  };
}

// Cache for city matcher
let cachedMatcher = null;
let cachedCities = null;

/**
 * Parse a natural language prompt to extract travel intent.
 *
 * @param {string} text - User input text
 * @param {Object} options - Options
 * @param {Array} options.cities - Array of city objects with { id, name, country, latitude, longitude }
 * @returns {Object} - Parsed result
 */
export function parsePrompt(text, { cities = [] } = {}) {
  // Build or reuse city matcher
  if (!cachedMatcher || cachedCities !== cities) {
    cachedMatcher = buildCityMatcher(cities);
    cachedCities = cities;
  }

  const result = {
    cities: [],
    duration: null,
    budget: null,
    month: null,
    season: null,
    themes: []
  };

  if (!text || typeof text !== 'string') {
    return result;
  }

  const lower = text.toLowerCase();

  // Extract cities
  const cityMatches = matchTrie(text, cachedMatcher.trie);
  const seenCityIds = new Set();

  for (const match of cityMatches) {
    const city = cachedMatcher.cityMap.get(match.pattern.toLowerCase());
    if (city && !seenCityIds.has(city.id)) {
      seenCityIds.add(city.id);
      result.cities.push({
        id: city.id,
        name: city.name,
        country: city.country,
        lat: city.latitude,
        lon: city.longitude,
        start: match.start,
        end: match.end
      });
    }
  }

  // Sort cities by their appearance order in text
  result.cities.sort((a, b) => a.start - b.start);

  // Extract duration: "5 days", "2 weeks", "10 nights"
  const durationMatch = lower.match(/(\d+)\s*(day|night|week)s?/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    result.duration = { value, unit };
  }

  // Extract budget: "€500", "$1000", "1.5k", "budget of 2000 euros"
  const budgetPatterns = [
    /[€£$]\s*(\d+(?:[.,]\d+)?)\s*k?/i,
    /(\d+(?:[.,]\d+)?)\s*k?\s*(?:euro|eur|€|dollar|usd|\$|pound|gbp|£)/i,
    /budget\s*(?:of|:)?\s*[€£$]?\s*(\d+(?:[.,]\d+)?)\s*k?/i
  ];

  for (const pattern of budgetPatterns) {
    const match = lower.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(',', '.'));
      // Handle "k" suffix
      if (lower.includes(match[0]) && match[0].toLowerCase().includes('k')) {
        amount *= 1000;
      }
      // Determine currency
      let currency = 'EUR'; // default
      if (match[0].includes('$') || lower.includes('dollar') || lower.includes('usd')) {
        currency = 'USD';
      } else if (match[0].includes('£') || lower.includes('pound') || lower.includes('gbp')) {
        currency = 'GBP';
      }
      result.budget = { amount, currency };
      break;
    }
  }

  // Extract month
  for (const month of MONTHS) {
    if (lower.includes(month)) {
      result.month = month.charAt(0).toUpperCase() + month.slice(1);
      break;
    }
  }

  // Check abbreviations if no full month found
  if (!result.month) {
    for (const [abbrev, fullMonth] of Object.entries(MONTH_ABBREVS)) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'i');
      if (regex.test(lower)) {
        result.month = fullMonth;
        break;
      }
    }
  }

  // Extract season
  for (const [season, months] of Object.entries(SEASONS)) {
    if (lower.includes(season)) {
      result.season = {
        name: season.charAt(0).toUpperCase() + season.slice(1),
        months
      };
      // If no specific month, use first month of season
      if (!result.month) {
        result.month = months[0];
      }
      break;
    }
  }

  // Extract themes
  const themeKeywords = getThemeKeywords();
  const seenThemes = new Set();

  for (const keyword of themeKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lower)) {
      const theme = getTheme(keyword);
      if (theme && !seenThemes.has(theme.key)) {
        seenThemes.add(theme.key);
        result.themes.push(theme);
      }
    }
  }

  return result;
}

/**
 * Build URL query params from parsed result.
 * @param {string} rawText - Original user input
 * @param {Object} parsed - Parsed result from parsePrompt
 * @returns {string} - URL query string
 */
export function buildPlanUrl(rawText, parsed) {
  const params = new URLSearchParams();

  params.set('q', rawText);

  if (parsed.cities.length > 0) {
    params.set('cities', parsed.cities.map(c => c.id).join(','));
  }

  if (parsed.month) {
    params.set('month', parsed.month.toLowerCase());
  }

  if (parsed.duration) {
    params.set('days', String(
      parsed.duration.unit === 'week'
        ? parsed.duration.value * 7
        : parsed.duration.value
    ));
  }

  if (parsed.budget) {
    params.set('budget', String(parsed.budget.amount));
  }

  return `/plan?${params.toString()}`;
}

export default parsePrompt;
