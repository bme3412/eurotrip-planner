'use client';

import React, { Suspense } from 'react';
import { LazyMapComponent, MapLoader, LazyComponentErrorBoundary } from '@/components/common/LazyComponents';

/**
 * Lazy loader for the main MapComponent used on the explore page
 * This handles the heavy main map with all its features
 */
export default function LazyMapComponentWrapper(props) {
  return (
    <LazyComponentErrorBoundary componentName="Main Interactive Map">
      <Suspense fallback={<MapLoader />}>
        <LazyMapComponent {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  );
}