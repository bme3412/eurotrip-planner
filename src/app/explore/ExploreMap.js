"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const LazyMapComponentWrapper = dynamic(
  () => import("@/components/map/LazyMapComponent"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Interactive Map...</p>
        </div>
      </div>
    ),
  }
);

export default function ExploreMap({ destinations }) {
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 50,
    zoom: 3.5,
    pitch: 0,
    bearing: 0,
  });

  const handleMarkerClick = (city) => {
    console.log("Clicked city:", city.title);
  };

  return (
    <LazyMapComponentWrapper
      viewState={viewState}
      onViewStateChange={setViewState}
      destinations={destinations}
      onMarkerClick={handleMarkerClick}
    />
  );
}
