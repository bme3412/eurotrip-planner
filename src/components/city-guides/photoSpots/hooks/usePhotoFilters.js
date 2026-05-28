import { useMemo } from 'react';

/**
 * Filter the photo-spots array by a filter id.
 * - 'all'    → no filter
 * - 'iconic' → only spots with `iconic: true`
 * - 'hidden' → only spots with `iconic: false`
 */
export function usePhotoFilters(spots, filter) {
  return useMemo(() => {
    if (!Array.isArray(spots)) return [];
    if (filter === 'iconic') return spots.filter((s) => s.iconic);
    if (filter === 'hidden') return spots.filter((s) => !s.iconic);
    return spots;
  }, [spots, filter]);
}
