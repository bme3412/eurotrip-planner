import { useMemo } from 'react';
import { useCitySection } from '@/hooks/useCitySection';
import { DEFAULT_FAQS } from '../lib/defaults';

/**
 * Lazy-load FAQs from start-here.json (was previously bundled).
 * Defaults render immediately; JSON swaps in once fetched.
 *
 * Phase A: now delegates to `useCitySection`. The `country` argument is
 * accepted for backwards compatibility but is no longer used — country is
 * resolved internally from the city slug.
 */
export function useStartHereData(cityKey, _country) {
  const transform = useMemo(
    () => (json) =>
      Array.isArray(json?.faqs) && json.faqs.length ? json.faqs : DEFAULT_FAQS,
    []
  );
  const { data } = useCitySection(cityKey, 'prose.startHere', {
    defaultValue: DEFAULT_FAQS,
    transform,
  });
  return data;
}
