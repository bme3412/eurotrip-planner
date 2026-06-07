/**
 * Marker color/size helpers. Pure functions — no DOM, no React, unit-testable.
 *
 * Color now encodes PRICE only (a clear 4-tier scale); "open now" was a
 * confusing 5th color state and lives in the popup instead. Pin SIZE encodes
 * cultural significance, so iconic landmarks visibly dominate.
 */

/**
 * Is the attraction's listed best_time matching the current city hour?
 * `cityHour` is 0–23 in the city's timezone. Returns true if best_time is
 * missing (assume always-open).
 */
export function isOpenNow(attraction, when) {
  if (!attraction || !attraction.best_time) return true;
  const currentHour =
    typeof when === 'number'
      ? when
      : when instanceof Date
        ? when.getHours()
        : new Date().getHours();
  const bestTime = String(attraction.best_time).toLowerCase();

  if (bestTime.includes('morning') && currentHour >= 6 && currentHour < 12) return true;
  if (bestTime.includes('afternoon') && currentHour >= 12 && currentHour < 18) return true;
  if (bestTime.includes('evening') && currentHour >= 18) return true;
  if (bestTime.includes('sunset') && currentHour >= 17 && currentHour < 20) return true;

  return false;
}

/**
 * Marker color by price tier:
 *   Free → green, Budget → sky, Moderate → amber, Expensive → red, else gray.
 */
export function getPriorityColor(attraction) {
  const p = String(attraction?.price_range || '').toLowerCase();
  if (p === 'free') return '#10B981';
  if (p === 'budget') return '#0EA5E9';
  if (p === 'moderate') return '#F59E0B';
  if (p === 'expensive') return '#EF4444';
  return '#6B7280';
}

/**
 * Marker scale by cultural_significance (1–5). Iconic landmarks (5) render
 * ~35% larger; minor sights shrink so the map reads at a glance.
 */
export function getMarkerScale(attraction) {
  const sig = Number(attraction?.ratings?.cultural_significance ?? 3);
  if (sig >= 5) return 1.35;
  if (sig >= 4) return 1.15;
  if (sig <= 1) return 0.78;
  if (sig <= 2) return 0.9;
  return 1.0;
}

/**
 * Numeric priority score (cultural_significance + free bonus + open-now bonus).
 * Exported for ranking work; not consumed by the orchestrator.
 */
export function getPriorityLevel(attraction, when) {
  if (!attraction) return 0;
  const cultural = Number(attraction.ratings?.cultural_significance ?? 3);
  const isFree = String(attraction.price_range || '').toLowerCase() === 'free';
  let score = cultural;
  if (isFree) score += 1;
  if (isOpenNow(attraction, when)) score += 1;
  return score;
}
