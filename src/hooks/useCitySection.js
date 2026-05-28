'use client';

import { useEffect, useState } from 'react';
import { getCitySection } from '@/lib/city-data';

/**
 * Lazy-load a single section of a city's data with default fallback.
 *
 * Replaces the per-section hooks (useStartHereData, useFoodGuideData,
 * useSeasonalProseData, useMonthlyData). Components stop passing `country`
 * — the loader resolves it from the city slug.
 *
 * @param {string} citySlug — canonical city slug (e.g. "paris")
 * @param {string} section  — Section key (e.g. "prose.startHere", "monthly")
 * @param {object} [options]
 * @param {*}     [options.defaultValue] — value returned until/unless fetch resolves
 * @param {(json: any) => any} [options.transform] — shape the fetched JSON
 * @param {string} [options.month] — required when section === 'monthlyMonth'
 *
 * @returns {{ data: any, loading: boolean, error: Error | null }}
 */
export function useCitySection(citySlug, section, options = {}) {
  const { defaultValue = null, transform, month } = options;
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(Boolean(citySlug));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!citySlug) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCitySection(citySlug, section, { month })
      .then((json) => {
        if (cancelled) return;
        if (json == null) {
          // Keep default value on missing data — loader returns null for 404s.
          setLoading(false);
          return;
        }
        const next = typeof transform === 'function' ? transform(json) : json;
        setData(next);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [citySlug, section, month, transform]);

  return { data, loading, error };
}
