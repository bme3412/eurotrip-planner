/**
 * Time/price-aware priority helpers used to colour markers.
 *
 * Pure functions — no DOM, no React. Safe to unit-test.
 */

/**
 * Is the attraction's listed best_time matching the current hour?
 * Returns true if best_time is missing (assume always-open).
 */
export function isOpenNow(attraction, now = new Date()) {
  if (!attraction || !attraction.best_time) return true;
  const currentHour = now.getHours();
  const bestTime = String(attraction.best_time).toLowerCase();

  if (bestTime.includes('morning') && currentHour >= 6 && currentHour < 12) return true;
  if (bestTime.includes('afternoon') && currentHour >= 12 && currentHour < 18) return true;
  if (bestTime.includes('evening') && currentHour >= 18) return true;
  if (bestTime.includes('sunset') && currentHour >= 17 && currentHour < 20) return true;

  return false;
}

/**
 * Priority colour for a marker, based on price_range + open-now.
 *
 *   Free + open now   → green   (#10B981)
 *   Free              → blue    (#3B82F6)
 *   Moderate + open   → yellow  (#F59E0B)
 *   Expensive         → red     (#EF4444)
 *   default           → gray    (#6B7280)
 */
export function getPriorityColor(attraction, now = new Date()) {
  if (!attraction) return '#6B7280';
  const open = isOpenNow(attraction, now);

  if (attraction.price_range === 'Free' && open) return '#10B981';
  if (attraction.price_range === 'Free') return '#3B82F6';
  if (attraction.price_range === 'Moderate' && open) return '#F59E0B';
  if (attraction.price_range === 'Expensive') return '#EF4444';
  return '#6B7280';
}

/**
 * Numeric priority score (cultural_significance + free bonus + open-now bonus).
 * Kept here for completeness; not currently consumed by the orchestrator,
 * but exported so future ranking work can pull it from a tested module.
 */
export function getPriorityLevel(attraction, now = new Date()) {
  if (!attraction) return 0;
  const cultural = Number(attraction.ratings?.cultural_significance ?? 3);
  const isFree = attraction.price_range === 'Free';
  let score = cultural;
  if (isFree) score += 1;
  if (isOpenNow(attraction, now)) score += 1;
  return score;
}
