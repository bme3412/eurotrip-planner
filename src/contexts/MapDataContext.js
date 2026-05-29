'use client';

import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { getCacheStats, clearCache } from '@/lib/mapCache';
import performanceMonitor from '@/lib/performance';

const ACTIONS = {
  SET_CITY_RATINGS: 'SET_CITY_RATINGS',
  SET_CALENDAR_DATA: 'SET_CALENDAR_DATA',
  SET_CITY_DETAILS: 'SET_CITY_DETAILS',
  SET_FILTERS: 'SET_FILTERS',
  SET_LOADING_STATE: 'SET_LOADING_STATE',
  CLEAR_CACHE: 'CLEAR_CACHE',
  UPDATE_PERFORMANCE: 'UPDATE_PERFORMANCE'
};

const initialState = {
  cityRatings: {},
  calendarData: {},
  cityDetails: {},
  currentFilters: {
    countries: ['All'],
    searchTerm: '',
    startDate: null,
    endDate: null,
    useFlexibleDates: false,
    selectedMonths: [],
    minRating: 0
  },
  loadingStates: {
    ratings: false,
    calendar: false,
    details: false
  },
  performance: {
    cacheHitRate: 0,
    averageResponseTime: 0,
    totalOperations: 0,
    lastUpdate: null
  },
  uiState: {
    activeTab: 'overview',
    showFilters: true,
    showRankedList: false
  }
};

function mapDataReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CITY_RATINGS:
      return {
        ...state,
        cityRatings: {
          ...state.cityRatings,
          ...action.payload
        }
      };

    case ACTIONS.SET_CALENDAR_DATA:
      return {
        ...state,
        calendarData: {
          ...state.calendarData,
          [action.payload.key]: action.payload.data
        }
      };

    case ACTIONS.SET_CITY_DETAILS:
      return {
        ...state,
        cityDetails: {
          ...state.cityDetails,
          [action.payload.cityName]: action.payload.data
        }
      };

    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        currentFilters: {
          ...state.currentFilters,
          ...action.payload
        }
      };

    case ACTIONS.SET_LOADING_STATE:
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [action.payload.type]: action.payload.loading
        }
      };

    case ACTIONS.UPDATE_PERFORMANCE:
      return {
        ...state,
        performance: action.payload
      };

    case ACTIONS.CLEAR_CACHE:
      clearCache(action.payload?.pattern);
      return {
        ...state,
        cityRatings: {},
        calendarData: {},
        cityDetails: {}
      };

    default:
      return state;
  }
}

const MapDataContext = createContext();

// Track subscribers to defer side-effects until a map actually mounts
let subscriberCount = 0;

export function MapDataProvider({ children }) {
  const [state, dispatch] = useReducer(mapDataReducer, initialState);
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  // Side-effects only run when a consumer (map) is using the context
  const subscribe = React.useCallback(() => {
    subscriberCount++;
    if (subscriberCount === 1) {
      setIsSubscribed(true);
    }
    return () => {
      subscriberCount--;
      if (subscriberCount === 0) {
        setIsSubscribed(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSubscribed) return;

    const updatePerformance = () => {
      const summary = performanceMonitor.getPerformanceSummary();
      dispatch({
        type: ACTIONS.UPDATE_PERFORMANCE,
        payload: {
          ...summary,
          lastUpdate: new Date()
        }
      });
    };

    updatePerformance();
    const interval = setInterval(updatePerformance, 5000);

    return () => clearInterval(interval);
  }, [isSubscribed]);

  useEffect(() => {
    if (!isSubscribed) return;

    const persistState = () => {
      try {
        const dataToPersist = {
          cityRatings: state.cityRatings,
          calendarData: state.calendarData,
          cityDetails: state.cityDetails,
          currentFilters: state.currentFilters,
          uiState: state.uiState
        };
        localStorage.setItem('mapDataState', JSON.stringify(dataToPersist));
      } catch (error) {
        console.warn('Failed to persist map data state:', error);
      }
    };

    const timeoutId = setTimeout(persistState, 1000);
    return () => clearTimeout(timeoutId);
  }, [isSubscribed, state.cityRatings, state.calendarData, state.cityDetails, state.currentFilters, state.uiState]);

  useEffect(() => {
    if (!isSubscribed) return;

    try {
      const persisted = localStorage.getItem('mapDataState');
      if (persisted) {
        const data = JSON.parse(persisted);

        if (data.cityRatings) {
          dispatch({ type: ACTIONS.SET_CITY_RATINGS, payload: data.cityRatings });
        }
        if (data.calendarData) {
          Object.entries(data.calendarData).forEach(([key, value]) => {
            dispatch({
              type: ACTIONS.SET_CALENDAR_DATA,
              payload: { key, data: value }
            });
          });
        }
        if (data.cityDetails) {
          Object.entries(data.cityDetails).forEach(([cityName, data]) => {
            dispatch({
              type: ACTIONS.SET_CITY_DETAILS,
              payload: { cityName, data }
            });
          });
        }
        if (data.currentFilters) {
          dispatch({ type: ACTIONS.SET_FILTERS, payload: data.currentFilters });
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted map data state:', error);
    }
  }, [isSubscribed]);

  // Actions must have stable identity across state changes. Consumers
  // (e.g. MapComponent's rating-fetch effect) put `actions` and
  // `actions.setLoadingState` in their dep arrays; if those identities
  // changed every time the reducer ran, the effect would re-dispatch,
  // re-render, and loop forever.
  const actions = useMemo(() => ({
    setCityRatings: (ratings) =>
      dispatch({ type: ACTIONS.SET_CITY_RATINGS, payload: ratings }),

    setCalendarData: (key, data) =>
      dispatch({ type: ACTIONS.SET_CALENDAR_DATA, payload: { key, data } }),

    setCityDetails: (cityName, data) =>
      dispatch({ type: ACTIONS.SET_CITY_DETAILS, payload: { cityName, data } }),

    setFilters: (filters) =>
      dispatch({ type: ACTIONS.SET_FILTERS, payload: filters }),

    setLoadingState: (type, loading) =>
      dispatch({ type: ACTIONS.SET_LOADING_STATE, payload: { type, loading } }),

    clearCache: (pattern) =>
      dispatch({ type: ACTIONS.CLEAR_CACHE, payload: { pattern } }),

    updatePerformance: (performance) =>
      dispatch({ type: ACTIONS.UPDATE_PERFORMANCE, payload: performance })
  }), []);

  const value = useMemo(() => ({
    state,
    dispatch,
    subscribe,
    actions,
  }), [state, subscribe, actions]);

  return (
    <MapDataContext.Provider value={value}>
      {children}
    </MapDataContext.Provider>
  );
}

export function useMapData() {
  const context = useContext(MapDataContext);
  if (!context) {
    throw new Error('useMapData must be used within a MapDataProvider');
  }

  // Auto-subscribe so side-effects (localStorage, perf monitoring) only run when consumed.
  // Depend on the stable `subscribe` function — not the whole `context` — otherwise every
  // state update rebuilds `value`, which would tear down and re-attach this subscription on
  // every render and bounce `subscriberCount` between 0 and N, retriggering the perf/persist
  // effects in an infinite loop.
  const { subscribe } = context;
  useEffect(() => {
    return subscribe();
  }, [subscribe]);

  return context;
}

export function useCityRatings() {
  const { state } = useMapData();
  return state.cityRatings;
}

export function useCalendarData() {
  const { state } = useMapData();
  return state.calendarData;
}

export function useCityDetails() {
  const { state } = useMapData();
  return state.cityDetails;
}

export function useCurrentFilters() {
  const { state, actions } = useMapData();
  return [state.currentFilters, actions.setFilters];
}

export function useLoadingStates() {
  const { state, actions } = useMapData();
  return [state.loadingStates, actions.setLoadingState];
}

export function usePerformance() {
  const { state } = useMapData();
  return state.performance;
}
