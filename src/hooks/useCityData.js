// src/hooks/useCityData.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching city data
 */
export function useCityData(cityId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCityData = useCallback(async (id) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/cities/${id}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch city data');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cityId) {
      fetchCityData(cityId);
    }
  }, [cityId, fetchCityData]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchCityData(cityId)
  };
}

/**
 * Hook for fetching all cities with filtering
 */
export function useCities(options = {}) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCities = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      
      if (params.search) searchParams.set('search', params.search);
      if (params.country) searchParams.set('country', params.country);
      if (params.limit) searchParams.set('limit', params.limit.toString());
      
      const response = await fetch(`/api/cities?${searchParams}`);
      const result = await response.json();
      
      if (result.success) {
        setCities(result.data);
      } else {
        setError(result.error || 'Failed to fetch cities');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCities(options);
  }, [fetchCities, options.search, options.country, options.limit]);

  return {
    cities,
    loading,
    error,
    refetch: fetchCities
  };
}

/**
 * Hook for searching cities with debouncing
 */
export function useSearchCities(query, delay = 300) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/cities?search=${encodeURIComponent(query)}&limit=10`);
        const result = await response.json();
        
        if (result.success) {
          setResults(result.data);
        } else {
          setError(result.error || 'Search failed');
        }
      } catch (err) {
        setError(err.message || 'Search error');
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, delay]);

  return {
    results,
    loading,
    error
  };
}