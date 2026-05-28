/**
 * Pick a single emoji icon that visually represents a city.
 *
 * Falls back to ✨ when no match. Currently Paris-heavy because the
 * product is Paris-first; new cities can be added here over time, or
 * eventually moved into per-city JSON (see DATA_IMPROVEMENT_PLAN).
 */
export const getCityIcon = (cityName) => {
  const lower = (cityName || '').toLowerCase();
  if (lower.includes('paris')) return '✨';
  if (lower.includes('rome')) return '🏛️';
  if (lower.includes('barcelona')) return '🏰';
  if (lower.includes('amsterdam')) return '🚲';
  if (lower.includes('berlin')) return '🕊️';
  if (lower.includes('venice')) return '🛶';
  if (lower.includes('lisbon')) return '🌅';
  if (lower.includes('pamplona')) return '🐂';
  if (lower.includes('reykjavik')) return '🌌';
  return '✨';
};
