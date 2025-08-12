'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { MapLoader, LazyComponentErrorBoundary } from '@/components/common/LazyComponents';
import MapboxCss from '@/components/map/MapboxCss';

// Ensure the heavy map component loads only on the client and only when invoked
const CityMapDynamic = dynamic(() => import('./CityMapWithMapbox'), { ssr: false });

/**
 * Lazy loader specifically for CityMapWithMapbox component
 * This component handles the heavy Mapbox library loading with proper error boundaries
 */
export default function LazyMapWithMapbox(props) {
  return (
    <LazyComponentErrorBoundary componentName="Mapbox Interactive Map">
      <Suspense fallback={<MapLoader />}>
        <MapboxCss />
        <CityMapDynamic {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  );
}