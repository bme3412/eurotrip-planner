import { useMemo } from 'react';
import { useCitySection } from '@/hooks/useCitySection';
import { DEFAULT_FOOD_DATA } from '../lib/constants';

/**
 * Lazy-load per-city food-guide.json (intro, sections, highlights).
 * Defaults render immediately; JSON swaps in once fetched.
 *
 * Phase A: delegates to `useCitySection`. The `country` argument is accepted
 * for backwards compatibility but is no longer used.
 */
export function useFoodGuideData(cityKey, _country) {
  const transform = useMemo(
    () => (json) => ({
      intro: json?.intro || DEFAULT_FOOD_DATA.intro,
      sections:
        Array.isArray(json?.sections) && json.sections.length
          ? json.sections
          : DEFAULT_FOOD_DATA.sections,
      highlights: Array.isArray(json?.highlights) ? json.highlights : [],
    }),
    []
  );
  const { data } = useCitySection(cityKey, 'prose.foodGuide', {
    defaultValue: DEFAULT_FOOD_DATA,
    transform,
  });
  return data;
}
