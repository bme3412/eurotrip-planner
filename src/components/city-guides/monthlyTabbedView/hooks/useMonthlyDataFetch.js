import { useEffect, useRef, useState } from 'react';

/**
 * Lazy-fetches per-city monthly data:
 *
 *   - `taglines` are pulled once from `monthly-taglines.json` on mount.
 *   - `extraMonths[<MonthName>]` is filled on demand when the currently
 *     selected month is missing or incomplete in the prop-provided
 *     `monthlyData` (the city index often only has summaries, not full bodies).
 *
 * Returns `{ taglines, extraMonths }`. The orchestrator decides how to merge
 * `extraMonths` over `monthlyData` for the active month.
 */
export default function useMonthlyDataFetch({ cityName, countryName, monthName, monthlyData }) {
  const [taglines, setTaglines] = useState(null);
  const [extraMonths, setExtraMonths] = useState({});
  const fetchedMonthsRef = useRef(new Set());
  const inflightMonthsRef = useRef(new Set());

  // Taglines — load once per city.
  useEffect(() => {
    let isMounted = true;
    async function loadTaglines() {
      if (!cityName || !countryName) return;
      const citySlug = cityName.toLowerCase();
      try {
        const res = await fetch(`/data/${countryName}/${citySlug}/monthly/monthly-taglines.json`, { cache: 'force-cache' });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setTaglines(json);
        }
      } catch (_) {
        // silently ignore
      }
    }
    loadTaglines();
    return () => {
      isMounted = false;
    };
  }, [cityName, countryName]);

  // Per-month fallback fetch — only fires when the active month is missing or
  // incomplete in `monthlyData`.
  useEffect(() => {
    if (!monthName || !cityName || !countryName) return;
    const candidateContainer =
      monthlyData?.[monthName] ||
      monthlyData?.[monthName.toLowerCase()] ||
      extraMonths?.[monthName] ||
      extraMonths?.[monthName.toLowerCase()];
    const candidateJson = candidateContainer?.[monthName] || candidateContainer?.[monthName.toLowerCase()] || candidateContainer;

    const isCompleteMonth = (() => {
      if (!candidateJson || typeof candidateJson !== 'object' || Array.isArray(candidateJson)) return false;
      const fh = candidateJson.first_half || {};
      const sh = candidateJson.second_half || {};
      const hasReasons = Array.isArray(candidateJson.reasons_to_visit) || Array.isArray(candidateJson.reasons_to_reconsider);
      const hasEvents =
        Array.isArray(fh.events_holidays) ||
        Array.isArray(sh.events_holidays) ||
        Array.isArray(fh.events) ||
        Array.isArray(sh.events);
      const hasWeather = !!(fh.weather || sh.weather);
      return hasReasons || hasEvents || hasWeather;
    })();
    const shouldFetch = !candidateJson || !isCompleteMonth;
    if (!shouldFetch) return;

    let cancelled = false;
    const citySlug = String(cityName).toLowerCase();
    const cityCap = String(cityName).charAt(0).toUpperCase() + String(cityName).slice(1);
    const countrySlug = String(countryName).toLowerCase();
    const countryCap = String(countryName).charAt(0).toUpperCase() + String(countryName).slice(1);
    const cacheKey = `${countrySlug}|${citySlug}|${monthName.toLowerCase()}`;

    const inflightSet = inflightMonthsRef.current;
    if (fetchedMonthsRef.current.has(cacheKey) || inflightSet.has(cacheKey)) return;
    inflightSet.add(cacheKey);
    const candidates = [
      `/data/${countryName}/${citySlug}/monthly/${monthName.toLowerCase()}.json`,
      `/data/${countryName}/${cityCap}/monthly/${monthName.toLowerCase()}.json`,
      `/data/${countryCap}/${citySlug}/monthly/${monthName.toLowerCase()}.json`,
      `/data/${countryCap}/${cityCap}/monthly/${monthName.toLowerCase()}.json`,
      `/data/${countrySlug}/${citySlug}/monthly/${monthName.toLowerCase()}.json`,
      `/data/${countrySlug}/${cityCap}/monthly/${monthName.toLowerCase()}.json`,
    ];
    (async () => {
      try {
        for (const url of candidates) {
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) continue;
          const json = await res.json();
          const extractedKey = Object.keys(json)[0];
          const payload = extractedKey ? json[extractedKey] : json;
          if (!cancelled && payload && typeof payload === 'object') {
            setExtraMonths((prev) => ({ ...prev, [extractedKey || monthName]: payload }));
            fetchedMonthsRef.current.add(cacheKey);
            break;
          }
        }
      } catch (_) {
        // ignore
      } finally {
        inflightSet.delete(cacheKey);
      }
    })();

    return () => {
      cancelled = true;
      inflightSet.delete(cacheKey);
    };
  }, [monthName, cityName, countryName, monthlyData, extraMonths]);

  return { taglines, extraMonths };
}
