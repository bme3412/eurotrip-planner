import { useEffect, useState } from 'react';
import { fetchCityDataUrl, getCityPaths } from '@/lib/city-data';
import { DEFAULT_FOOD_DATA } from '../lib/constants';

/**
 * Lazy-load per-city food-guide.json (intro, sections, highlights).
 * Defaults render immediately; JSON swaps in once fetched.
 */
export function useFoodGuideData(cityKey, country) {
  const [foodData, setFoodData] = useState(DEFAULT_FOOD_DATA);

  useEffect(() => {
    if (!cityKey) return undefined;
    let cancelled = false;
    const { foodGuide } = getCityPaths(country, cityKey);
    fetchCityDataUrl(foodGuide, { cache: 'force-cache' })
      .then((json) => {
        if (cancelled || !json) return;
        setFoodData({
          intro: json.intro || DEFAULT_FOOD_DATA.intro,
          sections:
            Array.isArray(json.sections) && json.sections.length
              ? json.sections
              : DEFAULT_FOOD_DATA.sections,
          highlights: Array.isArray(json.highlights) ? json.highlights : [],
        });
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [cityKey, country]);

  return foodData;
}
