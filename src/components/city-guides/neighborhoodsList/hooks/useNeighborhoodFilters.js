import { useCallback, useMemo } from 'react';

// Match a neighborhood against a persona by intersecting its `appeal.best_for`
// strings with the persona's keyword list (case-insensitive substring match).
function matchesPersona(neighborhood, persona) {
  if (!persona) return true;
  const bestFor = (neighborhood.appeal?.best_for || []).map((s) => s.toLowerCase());
  return persona.keywords.some((keyword) => bestFor.some((bf) => bf.includes(keyword.toLowerCase())));
}

/**
 * Derive the visible neighborhood list from search + persona filters.
 *
 * Input shape: `neighborhoods` may be an array OR an object with a
 * `.neighborhoods` array (the latter is the raw JSON shape). We normalise +
 * de-dupe by name before filtering.
 *
 * Returns `{ uniqueNeighborhoods, filteredNeighborhoods }` so callers can use
 * the de-duped list for things like editor's-picks lookup.
 */
export default function useNeighborhoodFilters({ neighborhoods, searchTerm, selectedPersona }) {
  const neighborhoodsWithIds = useMemo(() => {
    const list = Array.isArray(neighborhoods) ? neighborhoods : (neighborhoods?.neighborhoods || []);
    return list.map((neighborhood, index) => ({
      ...neighborhood,
      id: neighborhood.id || `neighborhood-${index}`,
    }));
  }, [neighborhoods]);

  const uniqueNeighborhoods = useMemo(() => {
    const seen = new Set();
    return neighborhoodsWithIds.filter((n) => {
      if (seen.has(n.name)) return false;
      seen.add(n.name);
      return true;
    });
  }, [neighborhoodsWithIds]);

  const matches = useCallback(matchesPersona, []);

  const filteredNeighborhoods = useMemo(() => {
    return uniqueNeighborhoods.filter((neighborhood) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const nameMatch = neighborhood.name.toLowerCase().includes(q);
        const characterMatch = (neighborhood.character || '').toLowerCase().includes(q);
        if (!nameMatch && !characterMatch) return false;
      }

      if (selectedPersona && !matches(neighborhood, selectedPersona)) {
        return false;
      }

      return true;
    });
  }, [uniqueNeighborhoods, searchTerm, selectedPersona, matches]);

  return { uniqueNeighborhoods, filteredNeighborhoods };
}
