'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for handling async data loading with proper state management
 * Includes loading states, error handling, and request cancellation
 */
export const useAsyncData = (asyncFn, deps = [], options = {}) => {
  const [data, setData] = useState(options.initialData || null);
  const [isLoading, setIsLoading] = useState(!options.initialData);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  const {
    onSuccess,
    onError,
    cacheKey,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
    retryCount = 0,
    retryDelay = 1000
  } = options;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (...args) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache if cacheKey is provided
    if (cacheKey) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < cacheTimeout) {
            setData(cachedData);
            setIsLoading(false);
            setError(null);
            return cachedData;
          }
        }
      } catch (cacheError) {
        console.warn('Failed to read from cache:', cacheError);
      }
    }

    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let attempt = 0;
    let lastError = null;

    while (attempt <= retryCount) {
      try {
        const result = await asyncFn(...args, { signal: abortController.signal });
        
        if (!mountedRef.current) return null;

        setData(result);
        setIsLoading(false);
        setError(null);
        setLastFetch(Date.now());

        // Cache the result
        if (cacheKey) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              data: result,
              timestamp: Date.now()
            }));
          } catch (cacheError) {
            console.warn('Failed to cache data:', cacheError);
          }
        }

        if (onSuccess) onSuccess(result);
        return result;

      } catch (err) {
        lastError = err;
        
        if (err.name === 'AbortError') {
          // Request was cancelled, don't retry
          break;
        }

        attempt++;
        
        if (attempt <= retryCount) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    // All attempts failed
    if (mountedRef.current) {
      setIsLoading(false);
      setError(lastError);
      if (onError) onError(lastError);
    }

    return null;
  }, [asyncFn, cacheKey, cacheTimeout, retryCount, retryDelay, onSuccess, onError]);

  // Auto-execute on dependency changes
  useEffect(() => {
    if (asyncFn) {
      execute();
    }
  }, deps);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  const clearCache = useCallback(() => {
    if (cacheKey) {
      sessionStorage.removeItem(cacheKey);
    }
  }, [cacheKey]);

  return {
    data,
    isLoading,
    error,
    execute,
    refetch,
    clearCache,
    lastFetch
  };
};

/**
 * Hook specifically for fetching JSON data from URLs
 */
export const useFetchJSON = (url, options = {}) => {
  const fetchFn = useCallback(async (signal) => {
    if (!url) throw new Error('URL is required');
    
    const response = await fetch(url, { 
      signal,
      ...options.fetchOptions 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }, [url, options.fetchOptions]);

  return useAsyncData(
    fetchFn,
    [url],
    {
      cacheKey: url ? `fetch_${url}` : null,
      ...options
    }
  );
};

/**
 * Hook for managing multiple async operations
 */
export const useAsyncOperations = () => {
  const [operations, setOperations] = useState({});

  const addOperation = useCallback((key, promise) => {
    setOperations(prev => ({
      ...prev,
      [key]: { status: 'loading', data: null, error: null }
    }));

    promise
      .then(data => {
        setOperations(prev => ({
          ...prev,
          [key]: { status: 'success', data, error: null }
        }));
      })
      .catch(error => {
        setOperations(prev => ({
          ...prev,
          [key]: { status: 'error', data: null, error }
        }));
      });
  }, []);

  const getOperation = useCallback((key) => {
    return operations[key] || { status: 'idle', data: null, error: null };
  }, [operations]);

  const isAnyLoading = useCallback(() => {
    return Object.values(operations).some(op => op.status === 'loading');
  }, [operations]);

  const clearOperation = useCallback((key) => {
    setOperations(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAll = useCallback(() => {
    setOperations({});
  }, []);

  return {
    operations,
    addOperation,
    getOperation,
    isAnyLoading,
    clearOperation,
    clearAll
  };
};