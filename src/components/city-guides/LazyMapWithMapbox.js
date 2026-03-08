'use client';

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapLoader, LazyComponentErrorBoundary } from '@/components/common/LazyComponents';

// Dynamically import both CSS and map component - only loads when this component mounts
const CityMapDynamic = dynamic(() => import('./CityMapWithMapbox'), { ssr: false });
const MapboxCssDynamic = dynamic(() => import('@/components/map/MapboxCss'), { ssr: false });

/**
 * Lazy loader specifically for CityMapWithMapbox component
 * This component handles the heavy Mapbox library loading with proper error boundaries
 */
export default function LazyMapWithMapbox(props) {
  return (
    <LazyComponentErrorBoundary componentName="Mapbox Interactive Map">
      <Suspense fallback={<MapLoader />}>
        <MapboxCssDynamic />
        <CityMapDynamic {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  );
}