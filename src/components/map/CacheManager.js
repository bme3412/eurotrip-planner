'use client';

import React, { useState, useEffect } from 'react';
import { getCacheStats, clearCache } from '@/lib/mapCache';

/**
 * Cache Manager Component
 * Provides cache statistics and management controls for debugging
 */
const CacheManager = ({ isVisible = false }) => {
  const [stats, setStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const updateStats = () => {
    const cacheStats = getCacheStats();
    setStats(cacheStats);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    if (isVisible) {
      updateStats();
      const interval = setInterval(updateStats, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const handleClearCache = (pattern = null) => {
    clearCache(pattern);
    updateStats();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Map Cache Manager</h3>
        <button
          onClick={() => setStats(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      {stats && (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Cache Size:</span>
            <span className="font-medium">
              {stats.size} / {stats.maxSize}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Usage:</span>
            <span className="font-medium">
              {Math.round((stats.size / stats.maxSize) * 100)}%
            </span>
          </div>

          {lastUpdate && (
            <div className="text-gray-500 text-xs">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          <div className="pt-2 space-y-1">
            <button
              onClick={() => handleClearCache()}
              className="w-full px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
            >
              Clear All Cache
            </button>
            
            <button
              onClick={() => handleClearCache('calendar')}
              className="w-full px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
            >
              Clear Calendar Cache
            </button>
            
            <button
              onClick={() => handleClearCache('rating')}
              className="w-full px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
            >
              Clear Rating Cache
            </button>
          </div>

          {stats.entries.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                Cache Entries ({stats.entries.length})
              </summary>
              <div className="mt-1 max-h-32 overflow-y-auto text-xs">
                {stats.entries.slice(0, 10).map((entry, index) => (
                  <div key={index} className="text-gray-500 truncate">
                    {entry}
                  </div>
                ))}
                {stats.entries.length > 10 && (
                  <div className="text-gray-400">
                    ... and {stats.entries.length - 10} more
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default CacheManager; 