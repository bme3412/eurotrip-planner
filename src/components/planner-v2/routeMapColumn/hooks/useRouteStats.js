import { useMemo } from 'react';
import { haversine } from '../lib/cityResolution.js';

/**
 * Aggregate distance + suggested transport mode for the route. Returns null
 * when there's nothing to summarise (single stop or zero-length legs).
 */
export default function useRouteStats(routePoints) {
  return useMemo(() => {
    if (routePoints.length < 2) return null;

    let totalKm = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      const from = routePoints[i];
      const to = routePoints[i + 1];
      totalKm += haversine(from.lat, from.lng, to.lat, to.lng);
    }

    if (totalKm === 0) return null;
    return {
      distance: `${Math.round(totalKm)} km`,
      mode: totalKm > 800 ? 'Flight or mixed rail' : 'Rail-friendly',
    };
  }, [routePoints]);
}
