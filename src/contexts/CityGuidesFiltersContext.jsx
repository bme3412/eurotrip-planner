'use client';

import React, { createContext, useContext, useMemo, useReducer, useCallback } from 'react';
import {
  ACTION,
  createInitialState,
  filtersReducer,
  hasActiveFilters,
} from '@/lib/filters/cityGuidesFilters';

const CityGuidesFiltersContext = createContext(null);

/**
 * Page-scoped provider for `/city-guides` filter state.
 *
 * Owns search/region/country/filterType/tripDates via a pure reducer.
 * URL ↔ tripDates sync is the caller's responsibility (the page wires
 * `initialTripDates` and dispatches `setTripDates` when the URL changes).
 *
 * Returns memoised action callbacks so children only re-render when the
 * underlying state actually changes.
 */
export function CityGuidesFiltersProvider({ initialTripDates = null, children }) {
  const [state, dispatch] = useReducer(
    filtersReducer,
    { tripDates: initialTripDates },
    createInitialState,
  );

  const setSearchTerm = useCallback((value) => {
    dispatch({ type: ACTION.SET_SEARCH_TERM, value });
  }, []);

  const setRegion = useCallback((region, filterType) => {
    dispatch({ type: ACTION.SET_REGION, region, filterType });
  }, []);

  const toggleCountry = useCallback((country) => {
    if (country === 'clear-all') {
      dispatch({ type: ACTION.CLEAR_COUNTRIES });
      return;
    }
    dispatch({ type: ACTION.TOGGLE_COUNTRY, country });
  }, []);

  const setFilterType = useCallback((value) => {
    dispatch({ type: ACTION.SET_FILTER_TYPE, value });
  }, []);

  const setTripDates = useCallback((value) => {
    dispatch({ type: ACTION.SET_TRIP_DATES, value });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: ACTION.CLEAR_FILTERS });
  }, []);

  const value = useMemo(
    () => ({
      state,
      hasActiveFilters: hasActiveFilters(state),
      setSearchTerm,
      setRegion,
      toggleCountry,
      setFilterType,
      setTripDates,
      clearFilters,
    }),
    [state, setSearchTerm, setRegion, toggleCountry, setFilterType, setTripDates, clearFilters],
  );

  return (
    <CityGuidesFiltersContext.Provider value={value}>
      {children}
    </CityGuidesFiltersContext.Provider>
  );
}

export function useCityGuidesFilters() {
  const ctx = useContext(CityGuidesFiltersContext);
  if (!ctx) {
    throw new Error(
      'useCityGuidesFilters must be used inside <CityGuidesFiltersProvider>',
    );
  }
  return ctx;
}
