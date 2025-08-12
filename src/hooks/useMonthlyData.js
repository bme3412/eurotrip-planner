'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadMonthlyDataCached } from '@/utils/monthlyDataLoader';

/**
 * Custom hook for managing monthly data loading and caching
 * Consolidates monthly data logic used across multiple components
 */
export const useMonthlyData = (country, cityName, options = {}) => {
  const { initialData = null, autoLoad = true } = options;
  const [monthlyData, setMonthlyData] = useState(initialData || {});
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  const loadMonthlyData = useCallback(async () => {
    if (!country || !cityName) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await loadMonthlyDataCached(country, cityName);
      setMonthlyData(data);
      setIsLoading(false);
      return data;
    } catch (err) {
      console.error(`Error loading monthly data for ${cityName}:`, err);
      setError(err);
      setMonthlyData({});
      setIsLoading(false);
    }
  }, [country, cityName]);

  useEffect(() => {
    if (!autoLoad) return;
    if (country && cityName && !initialData) {
      loadMonthlyData();
    }
  }, [loadMonthlyData, country, cityName, autoLoad, initialData]);

  // Memoized derived data
  const processedData = useMemo(() => {
    if (!monthlyData || typeof monthlyData !== 'object') return {};

    // Process monthly data to standardize format
    const processed = {};
    Object.keys(monthlyData).forEach(month => {
      const monthData = monthlyData[month];
      if (monthData && typeof monthData === 'object') {
        processed[month] = {
          ...monthData,
          // Ensure consistent structure
          weather: monthData.weather || {},
          events: monthData.events || [],
          crowds: monthData.crowds || 'moderate',
          prices: monthData.prices || 'average'
        };
      }
    });

    return processed;
  }, [monthlyData]);

  // Utility functions
  const getMonthData = useCallback((month) => {
    const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    return processedData[monthKey] || null;
  }, [processedData]);

  const getSeasonalScore = useCallback((month, factors = {}) => {
    const monthData = getMonthData(month);
    if (!monthData) return 0;

    let score = 0;
    const { weatherWeight = 0.4, crowdsWeight = 0.3, pricesWeight = 0.3 } = factors;

    // Weather scoring
    const weather = monthData.weather;
    if (weather && weather.average_temperature) {
      const temp = weather.average_temperature;
      const avgTemp = (temp.high_celsius + temp.low_celsius) / 2;
      if (avgTemp >= 15 && avgTemp <= 25) score += 3 * weatherWeight;
      else if (avgTemp >= 10 && avgTemp <= 30) score += 2 * weatherWeight;
      else if (avgTemp >= 5 && avgTemp <= 35) score += 1 * weatherWeight;
    }

    // Crowds scoring (inverted - fewer crowds = better score)
    switch (monthData.crowds) {
      case 'low': score += 3 * crowdsWeight; break;
      case 'moderate': score += 2 * crowdsWeight; break;
      case 'high': score += 1 * crowdsWeight; break;
      default: score += 2 * crowdsWeight;
    }

    // Price scoring (inverted - lower prices = better score)
    switch (monthData.prices) {
      case 'low': score += 3 * pricesWeight; break;
      case 'average': score += 2 * pricesWeight; break;
      case 'high': score += 1 * pricesWeight; break;
      default: score += 2 * pricesWeight;
    }

    return Math.min(3, Math.max(0, score));
  }, [getMonthData]);

  return {
    monthlyData: processedData,
    isLoading,
    error,
    refetch: loadMonthlyData,
    getMonthData,
    getSeasonalScore,
    hasData: Object.keys(processedData).length > 0
  };
};