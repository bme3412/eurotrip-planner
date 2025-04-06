"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';

// Import city data from cityData.js
import { getCitiesData } from '@/components/city-guides/cityData';

// Dynamically import the Map component with no SSR
const Map = dynamic(() => import('@/components/map/MapComponent'), { 
  ssr: false,
  loading: () => <p>Loading map...</p>
});

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
        <Map 
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