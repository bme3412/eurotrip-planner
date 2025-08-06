'use client';

import React, { Suspense } from 'react';
import { LazyCityMapWithMapbox, MapLoader, LazyComponentErrorBoundary } from '@/components/common/LazyComponents';

/**
 * Lazy loader specifically for CityMapWithMapbox component
 * This component handles the heavy Mapbox library loading with proper error boundaries
 */
export default function LazyMapWithMapbox(props) {
  return (
    <LazyComponentErrorBoundary componentName="Mapbox Interactive Map">
      <Suspense fallback={<MapLoader />}>
        <LazyCityMapWithMapbox {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  );
}