import { useMemo } from 'react';
import { useCitySection } from '@/hooks/useCitySection';
import { DEFAULT_FAQS } from '../lib/defaults';

/**
 * Lazy-load the start-here prose: the orientation `narrative` (arrival, getting
 * around, money, etc.) plus the `faqs`. Defaults render immediately; the JSON
 * swaps in once fetched.
 *
 * Returns `{ narrative, faqs }`. Phase A: delegates to `useCitySection`. The
 * `country` argument is accepted for backwards compatibility but is no longer
 * used — country is resolved internally from the city slug.
 */
const EMPTY_START_HERE = { narrative: {}, faqs: DEFAULT_FAQS };

export function useStartHereData(cityKey, _country) {
  const transform = useMemo(
    () => (json) => ({
      narrative: (json && typeof json.narrative === 'object' && json.narrative) || {},
      faqs: Array.isArray(json?.faqs) && json.faqs.length ? json.faqs : DEFAULT_FAQS,
    }),
    []
  );
  const { data } = useCitySection(cityKey, 'prose.startHere', {
    defaultValue: EMPTY_START_HERE,
    transform,
  });
  return data;
}
