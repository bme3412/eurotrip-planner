import { useEffect, useState } from 'react';
import { fetchCityDataUrl, getCityPaths } from '@/lib/city-data';
import { DEFAULT_FAQS } from '../lib/defaults';

/**
 * Lazy-load FAQs from start-here.json (was previously bundled).
 * Defaults render immediately; JSON swaps in once fetched.
 */
export function useStartHereData(cityKey, country) {
  const [faqs, setFaqs] = useState(DEFAULT_FAQS);

  useEffect(() => {
    if (!cityKey) return undefined;
    let cancelled = false;
    const { startHere } = getCityPaths(country, cityKey);
    fetchCityDataUrl(startHere, { cache: 'force-cache' })
      .then((json) => {
        if (cancelled || !json) return;
        if (Array.isArray(json.faqs) && json.faqs.length) setFaqs(json.faqs);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [cityKey, country]);

  return faqs;
}
