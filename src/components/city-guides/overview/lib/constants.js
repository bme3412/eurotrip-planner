/**
 * Shared constants for the CityOverview family.
 *
 * Pure data, no React, no imports.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const RATING_COLORS = {
  5: '#10b981',
  4: '#34d399',
  3: '#fbbf24',
  2: '#fb923c',
  1: '#ef4444',
};

export const RATING_LABELS = {
  5: 'Excellent',
  4: 'Good',
  3: 'Average',
  2: 'Below Avg',
  1: 'Avoid',
};

export const TRAVELER_LABELS = {
  all: 'Everyone',
  families: 'Families',
  couples: 'Couples',
  solo: 'Solo travelers',
  budget: 'Budget travelers',
  luxury: 'Luxury travelers',
};

export const TRAVELER_OPTIONS = ['all', 'families', 'couples', 'solo', 'budget', 'luxury'];

export const TRAVELER_PILL_LABELS = {
  all: '🌍 Everyone',
  families: '👨‍👩‍👧 Families',
  couples: '💑 Couples',
  solo: '🎒 Solo',
  budget: '💰 Budget',
  luxury: '✨ Luxury',
};
