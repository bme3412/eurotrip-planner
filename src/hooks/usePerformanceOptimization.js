'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';

/**
 * Performance optimization hooks for React components
 */

// Hook for debouncing values (useful for search inputs, filters)
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttling function calls (useful for scroll/resize handlers)
export const useThrottle = (callback, delay) => {
  const throttledRef = useRef(false);
  const timeoutRef = useRef(null);

  const throttledCallback = useCallback((...args) => {
    if (!throttledRef.current) {
      callback(...args);
      throttledRef.current = true;
      
      timeoutRef.current = setTimeout(() => {
        throttledRef.current = false;
      }, delay);
    }
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

// Hook for memoizing expensive calculations
export const useExpensiveCalculation = (calculateFn, deps, options = {}) => {
  const { 
    cacheSize = 10,
    enableCache = true,
    enableLogging = false 
  } = options;
  
  const cacheRef = useRef(new Map());
  const calculationCountRef = useRef(0);

  const memoizedResult = useMemo(() => {
    const cacheKey = JSON.stringify(deps);
    
    // Check cache first
    if (enableCache && cacheRef.current.has(cacheKey)) {
      if (enableLogging) {
        console.log('Cache hit for:', cacheKey);
      }
      return cacheRef.current.get(cacheKey);
    }

    // Calculate new result
    calculationCountRef.current++;
    if (enableLogging) {
      console.log(`Expensive calculation #${calculationCountRef.current} for:`, cacheKey);
    }
    
    const result = calculateFn();

    // Cache the result
    if (enableCache) {
      // Limit cache size
      if (cacheRef.current.size >= cacheSize) {
        const firstKey = cacheRef.current.keys().next().value;
        cacheRef.current.delete(firstKey);
      }
      cacheRef.current.set(cacheKey, result);
    }

    return result;
  }, [calculateFn, cacheSize, enableCache, enableLogging, deps]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheStats = useCallback(() => ({
    cacheSize: cacheRef.current.size,
    totalCalculations: calculationCountRef.current,
    cacheHitRatio: calculationCountRef.current > 0 
      ? (calculationCountRef.current - cacheRef.current.size) / calculationCountRef.current 
      : 0
  }), []);

  return {
    result: memoizedResult,
    clearCache,
    getCacheStats
  };
};

// Hook for virtual scrolling large lists
export const useVirtualList = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    onScroll,
    totalHeight: visibleItems.totalHeight
  };
};

// Hook for intersection observer (lazy loading, infinite scroll)
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setEntry(entry);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return {
    elementRef,
    isIntersecting,
    entry
  };
};

// Hook for managing component rendering performance
export const useRenderOptimization = (componentName) => {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const renderTimesRef = useRef([]);

  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    renderTimesRef.current.push(timeSinceLastRender);
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift();
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render #${renderCountRef.current}, time since last: ${timeSinceLastRender}ms`);
    }
  });

  const getStats = useCallback(() => {
    const avgRenderTime = renderTimesRef.current.length > 0 
      ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
      : 0;
    
    return {
      renderCount: renderCountRef.current,
      averageTimeBetweenRenders: avgRenderTime,
      recentRenderTimes: [...renderTimesRef.current]
    };
  }, []);

  return { getStats };
};

// Hook for batching state updates
export const useBatchedUpdates = (initialState) => {
  const [state, setState] = useState(initialState);
  const batchedUpdatesRef = useRef({});
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updates) => {
    // Merge with existing batched updates
    batchedUpdatesRef.current = { ...batchedUpdatesRef.current, ...updates };

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to apply all batched updates
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...batchedUpdatesRef.current }));
      batchedUpdatesRef.current = {};
    }, 16); // ~60fps
  }, []);

  const immediateUpdate = useCallback((updates) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Apply both batched and immediate updates
    setState(prev => ({ 
      ...prev, 
      ...batchedUpdatesRef.current, 
      ...updates 
    }));
    batchedUpdatesRef.current = {};
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    batchUpdate,
    immediateUpdate,
    setState
  };
};

// Hook for preventing unnecessary re-renders with deep comparison
export const useDeepMemo = (value) => {
  const ref = useRef();
  
  if (!ref.current || JSON.stringify(ref.current) !== JSON.stringify(value)) {
    ref.current = value;
  }
  
  return ref.current;
};

// Hook for managing expensive operations with Web Workers
export const useWebWorker = (workerScript) => {
  const workerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(workerScript);
      
      workerRef.current.onmessage = (e) => {
        setIsLoading(false);
        if (e.data.error) {
          setError(e.data.error);
        }
      };

      workerRef.current.onerror = (error) => {
        setIsLoading(false);
        setError(error);
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [workerScript]);

  const postMessage = useCallback((data) => {
    if (workerRef.current) {
      setIsLoading(true);
      setError(null);
      workerRef.current.postMessage(data);
    }
  }, []);

  return {
    postMessage,
    isLoading,
    error,
    isSupported: typeof Worker !== 'undefined'
  };
};

// Hook for component lazy loading with preloading
export const useLazyComponent = (importFn, preloadCondition = null) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const preloadedRef = useRef(false);

  const loadComponent = useCallback(async () => {
    if (Component || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const loadedModule = await importFn();
      setComponent(() => loadedModule.default || loadedModule);
      preloadedRef.current = true;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [importFn, Component, loading]);

  // Preload if condition is met
  useEffect(() => {
    if (preloadCondition && !preloadedRef.current && !loading) {
      loadComponent();
    }
  }, [preloadCondition, loadComponent, loading]);

  return {
    Component,
    loading,
    error,
    loadComponent
  };
};