'use client';

import { useEffect, useState } from 'react';
import { fetchCityDataUrl } from '@/lib/city-data';
import { computeAggregateFactors } from '../lib/scoring';
import { normalizePlaceName } from '../lib/display';

const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Load the "things to do / experiences" payload from a city URL and
 * normalise each item into the shape AttractionsList consumes.
 *
 * Also cross-references `/data/google-place-ids.json` to attach a Google
 * Place ID to each item when one is known.
 *
 * Returns `{ experiences, isLoading }`. `experiences === null` until the
 * first load attempt completes.
 */
export function useExperienceData({ experiencesUrl, cityName, limit = Infinity }) {
  const [experiences, setExperiences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    async function load() {
      if (!experiencesUrl) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const [json, placeIdsData] = await Promise.all([
          fetchCityDataUrl(experiencesUrl, { cache: 'no-store' }),
          fetch('/data/google-place-ids.json', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : {}))
            .catch(() => ({})),
        ]);

        const cats = json?.categories || {};
        const citySlug = cityName?.toLowerCase() || '';
        const experiencePlaceIds = placeIdsData[`${citySlug}-experiences`] || {};
        const cityPlaceIds = placeIdsData[citySlug] || {};
        const out = [];

        Object.keys(cats).forEach((key) => {
          const arr = Array.isArray(cats[key]) ? cats[key] : [];
          arr.forEach((item, idx) => {
            const total = item?.scores?.total_score ?? 0;
            const { total_score, ...factors } = item?.scores || {};
            const factorScores = factors;
            const themes = Array.isArray(item?.themes)
              ? item.themes.filter(Boolean).map((t) => String(t).toLowerCase())
              : [];

            // Look up Google Place ID from googlePlaceKey
            let googlePlaceId = null;
            if (item?.googlePlaceKey) {
              const placeData = experiencePlaceIds[item.googlePlaceKey] || cityPlaceIds[item.googlePlaceKey];
              googlePlaceId = placeData?.placeId || null;
            }
            if (!googlePlaceId && item?.name) {
              const exactPlaceData = cityPlaceIds[item.name];
              if (exactPlaceData?.placeId) {
                googlePlaceId = exactPlaceData.placeId;
              } else {
                const normalizedName = normalizePlaceName(item.name);
                const normalizedMatch = Object.entries(cityPlaceIds)
                  .find(([name]) => normalizePlaceName(name) === normalizedName);
                googlePlaceId = normalizedMatch?.[1]?.placeId || null;
              }
            }

            out.push({
              id: `${slugify(item?.name)}-${idx}`,
              name: item?.name,
              description: item?.description,
              image: item?.image || item?.image_url || item?.photo || item?.photo_url || null,
              type: (item?.themes && item.themes[0]) || 'activity',
              category: key,
              themes,
              latitude: item?.lat,
              longitude: item?.lon,
              website: item?.booking_url || null,
              price_range: item?.pricing_tier || null,
              tips: item?.tips || null,
              best_time: item?.best_time || null,
              estimated_cost_eur: item?.estimated_cost_eur || null,
              pricing_tier: item?.pricing_tier || null,
              arrondissement: item?.arrondissement || null,
              duration_minutes: item?.duration_minutes || null,
              googlePlaceKey: item?.googlePlaceKey || null,
              googlePlaceId,
              ratings: {
                cultural_significance: item?.scores?.cultural_historical_significance || null,
                suggested_duration_hours: item?.duration_minutes ? item.duration_minutes / 60 : null,
                cost_estimate: item?.estimated_cost_eur || null,
              },
              compositeScore: typeof total === 'number' ? Number(total) : 0,
              factorScores,
              scores: item?.scores || null,
              aggregates: computeAggregateFactors(factorScores),
            });
          });
        });

        out.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
        const top = out.slice(0, limit);
        if (!cancelled) {
          setExperiences(top);
          setIsLoading(false);
        }
      } catch (_) {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [experiencesUrl, limit, cityName]);

  return { experiences, isLoading };
}
