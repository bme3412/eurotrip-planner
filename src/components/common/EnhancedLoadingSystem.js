'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced loading components with consistent styling and animations
 */

// Base skeleton component
export const Skeleton = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '', 
  animated = true 
}) => (
  <div 
    className={`${width} ${height} bg-gray-200 rounded ${
      animated ? 'animate-pulse' : ''
    } ${className}`}
  />
);

// Card skeleton for grid layouts
export const CardSkeleton = ({ count = 1, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Skeleton height="h-48" className="rounded-none" />
        <div className="p-4 space-y-3">
          <Skeleton height="h-6" width="w-3/4" />
          <Skeleton height="h-4" width="w-full" />
          <Skeleton height="h-4" width="w-2/3" />
          <div className="flex justify-between items-center">
            <Skeleton height="h-4" width="w-1/4" />
            <Skeleton height="h-8" width="w-1/3" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// List skeleton for list layouts
export const ListSkeleton = ({ count = 3, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-start space-x-4">
          <Skeleton width="w-24" height="h-24" />
          <div className="flex-1 space-y-2">
            <Skeleton height="h-6" width="w-1/2" />
            <Skeleton height="h-4" width="w-full" />
            <Skeleton height="h-4" width="w-3/4" />
            <div className="flex justify-between items-center">
              <Skeleton height="h-4" width="w-1/4" />
              <Skeleton height="h-8" width="w-1/5" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Enhanced loading spinner
export const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'blue', 
  text = null,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    green: 'border-green-600',
    red: 'border-red-600'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div 
          className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 ${colorClasses[color]} mx-auto`}
        />
        {text && (
          <p className="mt-2 text-gray-600 text-sm">{text}</p>
        )}
      </div>
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay = ({ 
  text = 'Loading...', 
  show = true,
  backdrop = true 
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center ${
          backdrop ? 'bg-black bg-opacity-50' : ''
        }`}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-4"
        >
          <LoadingSpinner size="large" text={text} />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Progressive loading component
export const ProgressiveLoader = ({ 
  steps, 
  currentStep, 
  className = '' 
}) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
    <div className="text-center">
      <LoadingSpinner size="large" />
      <div className="mt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {steps[currentStep]?.title || 'Loading...'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {steps[currentStep]?.description || 'Please wait...'}
        </p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
    </div>
  </div>
);

// Error boundary component
export const ErrorDisplay = ({ 
  error, 
  retry, 
  title = 'Something went wrong',
  showDetails = false,
  className = '' 
}) => (
  <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
    <div className="text-red-600 text-4xl mb-4">⚠️</div>
    <h3 className="text-lg font-medium text-red-900 mb-2">{title}</h3>
    <p className="text-red-700 mb-4">
      {error?.message || 'An unexpected error occurred. Please try again.'}
    </p>
    
    {showDetails && error?.stack && (
      <details className="mb-4 text-left">
        <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
          Show technical details
        </summary>
        <pre className="mt-2 text-xs text-red-800 bg-red-100 p-2 rounded overflow-auto">
          {error.stack}
        </pre>
      </details>
    )}
    
    {retry && (
      <button
        onClick={retry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
      >
        Try Again
      </button>
    )}
  </div>
);

// Empty state component
export const EmptyState = ({ 
  icon = '📭', 
  title = 'No data found',
  description = 'There are no items to display.',
  action = null,
  className = '' 
}) => (
  <div className={`text-center py-12 ${className}`}>
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
    {action}
  </div>
);

// Async wrapper component that handles loading states
export const AsyncWrapper = ({ 
  isLoading, 
  error, 
  data, 
  onRetry,
  loadingComponent: LoadingComponent = LoadingSpinner,
  errorComponent: ErrorComponent = ErrorDisplay,
  emptyComponent: EmptyComponent = EmptyState,
  children,
  emptyWhen = (data) => !data || (Array.isArray(data) && data.length === 0)
}) => {
  if (isLoading) {
    return <LoadingComponent />;
  }

  if (error) {
    return <ErrorComponent error={error} retry={onRetry} />;
  }

  if (emptyWhen(data)) {
    return <EmptyComponent />;
  }

  return children;
};

// Hook for managing loading states
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [error, setError] = React.useState(null);

  const startLoading = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingError = React.useCallback((error) => {
    setIsLoading(false);
    setError(error);
  }, []);

  const reset = React.useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const withLoading = React.useCallback(async (asyncFn) => {
    startLoading();
    try {
      const result = await asyncFn();
      stopLoading();
      return result;
    } catch (err) {
      setLoadingError(err);
      throw err;
    }
  }, [startLoading, stopLoading, setLoadingError]);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError: setLoadingError,
    reset,
    withLoading
  };
};