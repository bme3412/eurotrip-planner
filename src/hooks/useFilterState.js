'use client';

import { useReducer, useMemo } from 'react';

// Filter state reducer for complex filter logic
const filterReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_CATEGORY_FILTER':
      return { ...state, categoryFilter: action.payload };
    case 'SET_DATE_FILTER':
      return { 
        ...state, 
        dateFilter: { 
          ...state.dateFilter, 
          ...action.payload 
        } 
      };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'TOGGLE_EXPANSION':
      return {
        ...state,
        expandedItems: {
          ...state.expandedItems,
          [action.payload]: !state.expandedItems[action.payload]
        }
      };
    case 'RESET_FILTERS':
      return {
        ...state,
        searchTerm: '',
        categoryFilter: 'all',
        dateFilter: { type: 'none', selectedDate: '', month: 'all' }
      };
    case 'BULK_UPDATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

/**
 * Custom hook for managing complex filter state
 * Consolidates common filtering patterns used across components
 */
export const useFilterState = (initialState = {}) => {
  const defaultState = {
    searchTerm: '',
    categoryFilter: 'all',
    dateFilter: {
      type: 'none', // 'none', 'exact', 'range', 'month'
      selectedDate: '',
      startDate: '',
      endDate: '',
      month: 'all'
    },
    viewMode: 'grid', // 'grid' or 'list'
    sortBy: 'name',
    expandedItems: {},
    ...initialState
  };

  const [filterState, dispatch] = useReducer(filterReducer, defaultState);

  // Memoized filter actions
  const filterActions = useMemo(() => ({
    setSearchTerm: (term) => dispatch({ type: 'SET_SEARCH_TERM', payload: term }),
    setCategoryFilter: (category) => dispatch({ type: 'SET_CATEGORY_FILTER', payload: category }),
    setDateFilter: (dateConfig) => dispatch({ type: 'SET_DATE_FILTER', payload: dateConfig }),
    setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
    toggleExpansion: (itemId) => dispatch({ type: 'TOGGLE_EXPANSION', payload: itemId }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
    bulkUpdate: (updates) => dispatch({ type: 'BULK_UPDATE', payload: updates })
  }), []);

  // Memoized filter utilities
  const filterUtils = useMemo(() => ({
    // Check if any filters are active
    hasActiveFilters: () => {
      return filterState.searchTerm !== '' || 
             filterState.categoryFilter !== 'all' || 
             filterState.dateFilter.type !== 'none' ||
             filterState.dateFilter.month !== 'all';
    },
    
    // Get filter summary for display
    getFilterSummary: () => {
      const active = [];
      if (filterState.searchTerm) active.push(`Search: "${filterState.searchTerm}"`);
      if (filterState.categoryFilter !== 'all') active.push(`Category: ${filterState.categoryFilter}`);
      if (filterState.dateFilter.month !== 'all') active.push(`Month: ${filterState.dateFilter.month}`);
      return active;
    }
  }), [filterState]);

  return {
    filterState,
    filterActions,
    filterUtils
  };
};

/**
 * Hook specifically for date filtering logic
 */
export const useDateFilter = () => {
  const months = useMemo(() => [
    { value: 'all', label: 'All Year', icon: '📅' },
    { value: 'january', label: 'January', icon: '❄️' },
    { value: 'february', label: 'February', icon: '❄️' },
    { value: 'march', label: 'March', icon: '🌸' },
    { value: 'april', label: 'April', icon: '🌸' },
    { value: 'may', label: 'May', icon: '🌺' },
    { value: 'june', label: 'June', icon: '☀️' },
    { value: 'july', label: 'July', icon: '☀️' },
    { value: 'august', label: 'August', icon: '☀️' },
    { value: 'september', label: 'September', icon: '🍂' },
    { value: 'october', label: 'October', icon: '🍂' },
    { value: 'november', label: 'November', icon: '🍁' },
    { value: 'december', label: 'December', icon: '❄️' }
  ], []);

  const getMonthFromDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return monthNames[date.getMonth()];
  };

  const isDateInRange = (dateString, start, end) => {
    if (!dateString || !start || !end) return false;
    const date = new Date(dateString);
    const startDate = new Date(start);
    const endDate = new Date(end);
    return date >= startDate && date <= endDate;
  };

  const isDateInMonth = (dateString, month) => {
    if (month === 'all') return true;
    return getMonthFromDate(dateString) === month;
  };

  return {
    months,
    getMonthFromDate,
    isDateInRange,
    isDateInMonth
  };
};