/**
 * Pure state machine for the `/city-guides` page filters.
 *
 * Owns the filter shape (search term, region, countries, filter type,
 * trip dates) plus the reducer + small selectors derived from that state.
 *
 * No React, no router, no DOM — safe to unit-test.
 *
 * URL syncing lives in the page (it needs `router`), and the page passes
 * URL-derived initial trip dates into the provider via `createInitialState`.
 */

export const ALL_REGIONS = 'All Regions';
export const ALL_EXPERIENCES = 'All Experiences';

export const FILTER_TYPES = Object.freeze({
  EURO_REGION: 'euro-region',
  TRAVEL_EXPERIENCE: 'travel-experience',
});

export const ACTION = Object.freeze({
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_REGION: 'SET_REGION',
  TOGGLE_COUNTRY: 'TOGGLE_COUNTRY',
  CLEAR_COUNTRIES: 'CLEAR_COUNTRIES',
  SET_FILTER_TYPE: 'SET_FILTER_TYPE',
  SET_TRIP_DATES: 'SET_TRIP_DATES',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
});

/**
 * Build an initial state object. `tripDates` may come from URL params.
 */
export function createInitialState({ tripDates = null } = {}) {
  return {
    searchTerm: '',
    selectedRegion: ALL_REGIONS,
    selectedCountries: [],
    activeFilterType: FILTER_TYPES.EURO_REGION,
    tripDates,
  };
}

export function filtersReducer(state, action) {
  switch (action.type) {
    case ACTION.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.value ?? '' };

    case ACTION.SET_REGION:
      // Region selection may also imply a filter-type switch (e.g. clicking
      // "Beach Destinations" under the Travel Experiences chip set).
      return {
        ...state,
        selectedRegion: action.region,
        ...(action.filterType ? { activeFilterType: action.filterType } : {}),
      };

    case ACTION.TOGGLE_COUNTRY: {
      const country = action.country;
      const next = state.selectedCountries.includes(country)
        ? state.selectedCountries.filter((c) => c !== country)
        : [...state.selectedCountries, country];
      return { ...state, selectedCountries: next };
    }

    case ACTION.CLEAR_COUNTRIES:
      return { ...state, selectedCountries: [] };

    case ACTION.SET_FILTER_TYPE:
      return { ...state, activeFilterType: action.value };

    case ACTION.SET_TRIP_DATES:
      return { ...state, tripDates: action.value };

    case ACTION.CLEAR_FILTERS:
      // Preserve `tripDates` because dates are sourced from the URL and
      // clearing them here would silently desync the URL with state.
      return {
        ...createInitialState({ tripDates: state.tripDates }),
      };

    default:
      return state;
  }
}

// ---------- selectors ----------

/**
 * Has the user narrowed the city list in any way (search, region, country)?
 * Trip-date selection alone is NOT counted as "active" because it doesn't
 * affect the filter predicate today — it's a downstream signal.
 */
export function hasActiveFilters(state) {
  if (!state) return false;
  const { selectedRegion, selectedCountries, searchTerm } = state;
  const regionActive =
    selectedRegion !== ALL_REGIONS && selectedRegion !== ALL_EXPERIENCES;
  return Boolean(regionActive || selectedCountries.length > 0 || searchTerm);
}
