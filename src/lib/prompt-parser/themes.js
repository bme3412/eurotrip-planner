/**
 * Theme keyword mappings for prompt parsing.
 * Maps keywords to theme objects with emoji and label.
 */

const THEME_KEYWORDS = {
  // Food & Drink
  food: { key: 'food', emoji: '🍝', label: 'Food' },
  eat: { key: 'food', emoji: '🍝', label: 'Food' },
  dine: { key: 'food', emoji: '🍝', label: 'Food' },
  dining: { key: 'food', emoji: '🍝', label: 'Food' },
  cuisine: { key: 'food', emoji: '🍝', label: 'Food' },
  restaurant: { key: 'food', emoji: '🍝', label: 'Food' },
  restaurants: { key: 'food', emoji: '🍝', label: 'Food' },
  tapas: { key: 'food', emoji: '🍝', label: 'Food' },

  // Wine
  wine: { key: 'wine', emoji: '🍷', label: 'Wine' },
  winery: { key: 'wine', emoji: '🍷', label: 'Wine' },
  wineries: { key: 'wine', emoji: '🍷', label: 'Wine' },
  vineyard: { key: 'wine', emoji: '🍷', label: 'Wine' },
  vineyards: { key: 'wine', emoji: '🍷', label: 'Wine' },

  // History
  history: { key: 'history', emoji: '🏛', label: 'History' },
  historical: { key: 'history', emoji: '🏛', label: 'History' },
  historic: { key: 'history', emoji: '🏛', label: 'History' },
  ancient: { key: 'history', emoji: '🏛', label: 'History' },
  ruins: { key: 'history', emoji: '🏛', label: 'History' },
  roman: { key: 'history', emoji: '🏛', label: 'History' },
  medieval: { key: 'history', emoji: '🏛', label: 'History' },

  // Beach
  beach: { key: 'beach', emoji: '🏖', label: 'Beach' },
  beaches: { key: 'beach', emoji: '🏖', label: 'Beach' },
  coast: { key: 'beach', emoji: '🏖', label: 'Beach' },
  coastal: { key: 'beach', emoji: '🏖', label: 'Beach' },
  seaside: { key: 'beach', emoji: '🏖', label: 'Beach' },

  // Train/Rail
  train: { key: 'train', emoji: '🚆', label: 'Train' },
  trains: { key: 'train', emoji: '🚆', label: 'Train' },
  rail: { key: 'train', emoji: '🚆', label: 'Train' },
  railway: { key: 'train', emoji: '🚆', label: 'Train' },
  interrail: { key: 'train', emoji: '🚆', label: 'Train' },
  eurail: { key: 'train', emoji: '🚆', label: 'Train' },

  // Family
  family: { key: 'family', emoji: '👪', label: 'Family' },
  families: { key: 'family', emoji: '👪', label: 'Family' },
  kids: { key: 'family', emoji: '👪', label: 'Family' },
  children: { key: 'family', emoji: '👪', label: 'Family' },
  child: { key: 'family', emoji: '👪', label: 'Family' },

  // Art & Museums
  art: { key: 'art', emoji: '🎨', label: 'Art' },
  arts: { key: 'art', emoji: '🎨', label: 'Art' },
  museum: { key: 'art', emoji: '🎨', label: 'Art' },
  museums: { key: 'art', emoji: '🎨', label: 'Art' },
  gallery: { key: 'art', emoji: '🎨', label: 'Art' },
  galleries: { key: 'art', emoji: '🎨', label: 'Art' },

  // Ski/Snow
  ski: { key: 'ski', emoji: '⛷', label: 'Ski' },
  skiing: { key: 'ski', emoji: '⛷', label: 'Ski' },
  snow: { key: 'ski', emoji: '⛷', label: 'Ski' },
  snowboard: { key: 'ski', emoji: '⛷', label: 'Ski' },
  snowboarding: { key: 'ski', emoji: '⛷', label: 'Ski' },
  alps: { key: 'ski', emoji: '⛷', label: 'Ski' },

  // Nightlife
  nightlife: { key: 'nightlife', emoji: '🌃', label: 'Nightlife' },
  clubs: { key: 'nightlife', emoji: '🌃', label: 'Nightlife' },
  club: { key: 'nightlife', emoji: '🌃', label: 'Nightlife' },
  clubbing: { key: 'nightlife', emoji: '🌃', label: 'Nightlife' },
  bars: { key: 'nightlife', emoji: '🌃', label: 'Nightlife' },
  partying: { key: 'nightlife', emoji: '🌃', label: 'Nightlife' },
  party: { key: 'nightlife', emoji: '🌃', label: 'Nightlife' },

  // Romance
  romantic: { key: 'romance', emoji: '💕', label: 'Romance' },
  romance: { key: 'romance', emoji: '💕', label: 'Romance' },
  honeymoon: { key: 'romance', emoji: '💕', label: 'Romance' },
  couples: { key: 'romance', emoji: '💕', label: 'Romance' },
  couple: { key: 'romance', emoji: '💕', label: 'Romance' },

  // Adventure
  adventure: { key: 'adventure', emoji: '🧗', label: 'Adventure' },
  hiking: { key: 'adventure', emoji: '🧗', label: 'Adventure' },
  hike: { key: 'adventure', emoji: '🧗', label: 'Adventure' },
  outdoor: { key: 'adventure', emoji: '🧗', label: 'Adventure' },
  outdoors: { key: 'adventure', emoji: '🧗', label: 'Adventure' },
};

/**
 * Get all unique theme keys for building the matcher.
 */
export function getThemeKeywords() {
  return Object.keys(THEME_KEYWORDS);
}

/**
 * Look up a theme by keyword.
 * @param {string} keyword - The keyword to look up (lowercase)
 * @returns {Object|null} - Theme object or null
 */
export function getTheme(keyword) {
  return THEME_KEYWORDS[keyword.toLowerCase()] || null;
}

export default THEME_KEYWORDS;
