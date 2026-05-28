'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizePlaceName } from '../lib/display';

/**
 * Lazy-load Google Places enrichment for a city and merge it into any list
 * of attraction-like objects by name match.
 *
 * Returns:
 *   • applyGoogleData(items) — merges Google fields onto each item by name
 *   • googleLoading           — true while the enrichment fetch is in flight
 *   • enrichedTick            — number that bumps when data arrives; consumers
 *                               should include it in their useMemo deps so a
 *                               re-render picks up the new Google data
 */
export function useGoogleEnrichment(cityName) {
  const googleMapRef = useRef(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [enrichedTick, setEnrichedTick] = useState(0);

  useEffect(() => {
    if (!cityName) return undefined;
    let cancelled = false;
    setGoogleLoading(true);
    fetch(`/api/cities/${encodeURIComponent(cityName.toLowerCase())}?enrich=true`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.attractions?.sites?.length) return;
        const nextMap = new Map();
        data.attractions.sites
          .filter((s) => s.googlePlaceId)
          .forEach((site) => {
            if (site.name) nextMap.set(site.name, site);
            const normalized = normalizePlaceName(site.name);
            if (normalized) nextMap.set(normalized, site);
          });
        googleMapRef.current = nextMap;
        setEnrichedTick((n) => n + 1);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGoogleLoading(false); });
    return () => { cancelled = true; };
  }, [cityName]);

  const applyGoogleData = useCallback((items) => {
    const gMap = googleMapRef.current;
    if (!gMap || !items?.length) return items;
    return items.map((a) => {
      const g = gMap.get(a.name) || gMap.get(normalizePlaceName(a.name));
      if (!g) return a;
      return {
        ...a,
        googlePlaceId: a.googlePlaceId || g.googlePlaceId,
        googlePlaceName: a.googlePlaceName || g.googlePlaceName,
        googleRating: a.googleRating ?? g.googleRating,
        googleReviewCount: a.googleReviewCount ?? g.googleReviewCount,
        googlePhotos: a.googlePhotos?.length ? a.googlePhotos : g.googlePhotos,
        currentlyOpen: a.currentlyOpen ?? g.currentlyOpen,
        googleOpeningHours: a.googleOpeningHours || g.googleOpeningHours,
        googleUrl: a.googleUrl || g.googleUrl,
        googleWebsite: a.googleWebsite || g.googleWebsite,
        googleEditorialSummary: a.googleEditorialSummary || g.googleEditorialSummary,
        googleLocation: a.googleLocation || g.googleLocation,
      };
    });
  }, []);

  return { applyGoogleData, googleLoading, enrichedTick };
}
