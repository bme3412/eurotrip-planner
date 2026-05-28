import { useMemo } from 'react';
import { SEARCH_SUGGESTION_LIMIT } from '../lib/filterConstants';

/**
 * Produce a prioritised list of city suggestions for a search term.
 * Priority order:
 *   1. Cities whose name starts with the term
 *   2. Cities whose name contains the term (but doesn't start with it)
 *   3. Cities whose country starts with the term (and name doesn't include it)
 *
 * Capped at SEARCH_SUGGESTION_LIMIT entries.
 */
export function useSearchSuggestions(searchTerm, cities) {
  return useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const term = searchTerm.toLowerCase();

    const startsWithName = cities.filter((city) =>
      city.name.toLowerCase().startsWith(term)
    );

    const containsInName = cities.filter(
      (city) =>
        !city.name.toLowerCase().startsWith(term) &&
        city.name.toLowerCase().includes(term)
    );

    const startsWithCountry = cities.filter(
      (city) =>
        !city.name.toLowerCase().includes(term) &&
        city.country &&
        city.country.toLowerCase().startsWith(term)
    );

    return [...startsWithName, ...containsInName, ...startsWithCountry].slice(
      0,
      SEARCH_SUGGESTION_LIMIT
    );
  }, [searchTerm, cities]);
}
