'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map component on the client side
// Using dynamic import with no SSR for reliable rendering
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

export default function MapSection({ 
  attractions = [], 
  categories = [], 
  cityName = "City", 
  center = [0, 0], 
  zoom = 12,
  title,
  subtitle,
  height = 500 
}) {
  const [isClient, setIsClient] = useState(false);
  
  // Effect to ensure the component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Process default values for title and subtitle
  const mapTitle = title || `${cityName} at a Glance`;
  const mapSubtitle = subtitle || `Interactive map of key attractions and landmarks`;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800">{mapTitle}</h3>
        <p className="text-sm text-gray-600">{mapSubtitle}</p>
      </div>
      
      <div style={{ height: `${height}px` }}>
        {isClient && (
          <CityMapWithMapbox 
            attractions={attractions} 
            categories={categories}
            cityName={cityName}
            center={center}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
}