/**
 * Chunk optimization utilities for better code splitting
 * These utilities help with prefetching and preloading critical components
 */

/**
 * Preload a component chunk when the user is likely to need it
 * @param {Function} componentImporter - The lazy import function
 * @param {number} delay - Delay in milliseconds before preloading
 */
export const preloadComponent = (componentImporter, delay = 0) => {
  if (typeof window === 'undefined') return;
  
  setTimeout(() => {
    componentImporter().catch(() => {
      // Silently catch preload errors - component will load when actually needed
    });
  }, delay);
};

/**
 * Preload map components when user hovers over map-related UI
 */
export const preloadMapComponents = () => {
  if (typeof window === 'undefined') return;
  
  // Preload heavy map components
  Promise.all([
    import('@/components/city-guides/CityMapWithMapbox'),
    import('@/components/map/MapComponent')
  ]).catch(() => {
    // Silently handle preload failures
  });
};

/**
 * Preload city guide components when user navigates to a city page
 */
export const preloadCityGuideComponents = () => {
  if (typeof window === 'undefined') return;
  
  Promise.all([
    import('@/components/city-guides/AttractionsList'),
    import('@/components/city-guides/NeighborhoodsList'),
    import('@/components/city-guides/MonthlyGuideSection')
  ]).catch(() => {
    // Silently handle preload failures
  });
};

/**
 * Setup intersection observer to preload components when they're likely to be needed
 * @param {string} selector - CSS selector for elements to observe
 * @param {Function} preloadFunction - Function to call when element comes into view
 */
export const setupIntersectionPreload = (selector, preloadFunction) => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          preloadFunction();
          observer.unobserve(entry.target);
        }
      });
    },
    { 
      rootMargin: '100px' // Start loading 100px before element is visible
    }
  );
  
  // Observe elements when DOM is ready
  const observeElements = () => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => observer.observe(el));
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeElements);
  } else {
    observeElements();
  }
  
  return observer;
};

/**
 * Preload components based on user interaction patterns
 */
export const setupSmartPreloading = () => {
  if (typeof window === 'undefined') return;
  
  // Preload map components when user hovers over map-related buttons
  const mapTriggers = document.querySelectorAll('[data-preload="map"]');
  mapTriggers.forEach((trigger) => {
    trigger.addEventListener('mouseenter', preloadMapComponents, { once: true });
  });
  
  // Preload city guide components when user hovers over city links
  const cityTriggers = document.querySelectorAll('[data-preload="city-guide"]');
  cityTriggers.forEach((trigger) => {
    trigger.addEventListener('mouseenter', preloadCityGuideComponents, { once: true });
  });
};