'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map component on the client side
// Using dynamic import with no SSR and no loading for reliable rendering
const CityMapWithMapbox = dynamic(
  () => import('./CityMapWithMapbox'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading interactive map...</p>
        </div>
      </div>
    )
  }
);

export default function MapSection({ attractions, categories, cityName, center, zoom }) {
  const [isClient, setIsClient] = useState(false);
  const [mapKey, setMapKey] = useState(1); // Key for forcing re-render if needed

  // Effect to ensure the component only renders on client
  useEffect(() => {
    setIsClient(true);
    
    // If map fails to render properly, we can force a re-render after a delay
    const timer = setTimeout(() => {
      setMapKey(prev => prev + 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Render a simplified legend below the map container
  const renderLegend = () => {
    if (!categories || categories.length === 0) return null;
    
    // Limit categories to prevent overcrowding
    const displayCategories = categories.slice(0, 6);
    
    return (
      <div className="mt-4 px-4 py-3 bg-white rounded-lg shadow-sm text-xs">
        <div className="font-medium mb-1">Map Legend:</div>
        <div className="flex flex-wrap gap-3">
          {displayCategories.map(cat => (
            <div key={cat.category} className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-1 bg-blue-500"></div>
              <span>{cat.category || 'Other'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800">{cityName} at a Glance</h3>
        <p className="text-sm text-gray-600">Interactive map of key attractions and landmarks</p>
      </div>
      
      <div className="h-[450px]">
        {isClient && (
          <CityMapWithMapbox 
            key={mapKey}
            attractions={attractions} 
            categories={categories}
            cityName={cityName}
            center={center}
            zoom={zoom}
          />
        )}
      </div>
      
      {/* Fallback legend outside the map for better visibility */}
      {renderLegend()}
    </div>
  );
}