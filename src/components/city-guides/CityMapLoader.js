'use client';

import React, { Suspense } from 'react';
import { LazyMapSection, MapLoader, LazyComponentErrorBoundary } from '@/components/common/LazyComponents';

// Enhanced lazy map loader with proper Suspense and error boundaries
export default function CityMapLoader(props) {
  return (
    <LazyComponentErrorBoundary componentName="Interactive Map">
      <Suspense fallback={<MapLoader />}>
        <LazyMapSection {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  );
} 