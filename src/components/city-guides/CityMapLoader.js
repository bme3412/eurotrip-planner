'use client';

import MapSection from './MapSection';

// This component simply passes props through to MapSection
// Its sole purpose is to act as a client component boundary
export default function CityMapLoader(props) {
  return <MapSection {...props} />;
} 