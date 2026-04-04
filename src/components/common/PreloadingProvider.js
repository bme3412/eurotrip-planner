'use client';

import React, { useEffect, createContext, useContext } from 'react';
import { preloadMapComponents, preloadCityGuideComponents, setupSmartPreloading } from '@/utils/chunkOptimization';

const PreloadingContext = createContext({});

/**
 * Provider that handles intelligent preloading of components
 * This helps improve perceived performance by loading components before they're needed
 */
export function PreloadingProvider({ children }) {
  useEffect(() => {
    // Setup smart preloading on mount
    setupSmartPreloading();
    
    // Preload critical components after a short delay
    setTimeout(() => {
      // Only preload if user seems to be actively browsing
      if (document.hasFocus()) {
        preloadCityGuideComponents();
      }
    }, 2000);
    
    // Preload map components on user interaction
    const handleUserInteraction = () => {
      preloadMapComponents();
      // Remove listeners after first interaction
      document.removeEventListener('mousemove', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
    
    document.addEventListener('mousemove', handleUserInteraction, { once: true });
    document.addEventListener('scroll', handleUserInteraction, { once: true });
    document.addEventListener('click', handleUserInteraction, { once: true });
    
    return () => {
      document.removeEventListener('mousemove', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);
  
  const contextValue = {
    preloadMapComponents,
    preloadCityGuideComponents
  };
  
  return (
    <PreloadingContext.Provider value={contextValue}>
      {children}
    </PreloadingContext.Provider>
  );
}

/**
 * Hook to access preloading functions
 */
export function usePreloading() {
  return useContext(PreloadingContext);
}

/**
 * HOC to add preloading triggers to components
 */
export function withPreloading(WrappedComponent, preloadType) {
  return function PreloadingWrapper(props) {
    const handleMouseEnter = () => {
      if (preloadType === 'map') {
        preloadMapComponents();
      } else if (preloadType === 'city-guide') {
        preloadCityGuideComponents();
      }
    };
    
    return (
      <div onMouseEnter={handleMouseEnter}>
        <WrappedComponent {...props} />
      </div>
    );
  };
}