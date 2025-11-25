"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import city data from cityData.js
import { getCitiesData } from '@/components/city-guides/cityData';

// Import the lazy map component with proper Suspense boundaries using Next.js dynamic
const LazyMapComponentWrapper = dynamic(
  () => import('@/components/map/LazyMapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Interactive Map...</p>
        </div>
      </div>
    )
  }
);

export default function ExplorePage() {
  const router = useRouter();

  // Initial map viewport settings centered on Europe
  const [viewState, setViewState] = useState({
    longitude: 10, // Centered longitude for Europe
    latitude: 50,  // Centered latitude for Europe
    zoom: 3.5,     // Zoom level to show most of Europe
    pitch: 0,
    bearing: 0
  });

  // Combine all destination data
  const allDestinations = useMemo(() => {
    // Get all cities from the comprehensive cityData.js
    const citiesData = getCitiesData();
    
    // Map the city data to the format expected by the MapComponent
    const formattedCities = citiesData.map(city => ({
      title: city.name,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      description: city.description
    }));
    
    return formattedCities;
  }, []);

  // Function to handle marker click
  const handleMarkerClick = (city) => {
    console.log("Clicked city:", city.title);
    // Optional: Navigate to city guide or show popup
    // const citySlug = city.title.toLowerCase().replace(/\s+/g, '-');
    // router.push(`/city-guides/${citySlug}`);
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Main content with map taking full height */}
      <main className="flex-grow relative">
        <LazyMapComponentWrapper 
          viewState={viewState}
          onViewStateChange={setViewState}
          destinations={allDestinations}
          onMarkerClick={handleMarkerClick}
        />
        
        {/* Floating navigation links */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Link 
            href="/city-guides" 
            className="bg-white px-4 py-2 rounded-full shadow-md text-blue-600 font-medium hover:bg-blue-50 transition-colors"
          >
            City Guides
          </Link>
          <Link 
            href="/planning" 
            className="bg-white px-4 py-2 rounded-full shadow-md text-blue-600 font-medium hover:bg-blue-50 transition-colors"
          >
            Start Planning
          </Link>
        </div>
      </main>
    </div>
  );
}