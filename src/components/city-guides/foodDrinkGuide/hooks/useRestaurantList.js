import { useMemo } from 'react';
import { PRICE_FILTERS } from '../lib/constants';

/**
 * Flatten the city's `culinaryGuide.restaurants` and `culinaryGuide.bars_and_cafes`
 * into a single list, tagging each entry with its source category id.
 */
export function useFlattenedRestaurants(culinaryGuide) {
  return useMemo(() => {
    if (!culinaryGuide) return [];
    const restaurants = [];

    if (culinaryGuide.restaurants) {
      Object.entries(culinaryGuide.restaurants).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach((item) => restaurants.push({ ...item, _category: category }));
        }
      });
    }

    if (culinaryGuide.bars_and_cafes) {
      Object.entries(culinaryGuide.bars_and_cafes).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach((item) => restaurants.push({ ...item, _category: category }));
        }
      });
    }

    return restaurants;
  }, [culinaryGuide]);
}

/**
 * Filter the flattened restaurant list by category id and price-filter id.
 * Currency-aware: matches against the configured `€`/`£` price symbols.
 */
export function useFilteredRestaurants(allRestaurants, categoryFilter, priceFilter) {
  return useMemo(() => {
    return allRestaurants.filter((r) => {
      if (categoryFilter !== 'all' && r._category !== categoryFilter) return false;
      if (priceFilter !== 'all') {
        const priceConfig = PRICE_FILTERS.find((p) => p.id === priceFilter);
        if (priceConfig?.match && !priceConfig.match.includes(r.price_range)) {
          return false;
        }
      }
      return true;
    });
  }, [allRestaurants, categoryFilter, priceFilter]);
}
