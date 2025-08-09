'use client';

import { TravelDataProvider } from '../context/TravelDataProvider';
import { MapDataProvider } from '../context/MapDataContext';

export default function Providers({ children }) {
  return (
    <TravelDataProvider>
      <MapDataProvider>
        {children}
      </MapDataProvider>
    </TravelDataProvider>
  );
}

