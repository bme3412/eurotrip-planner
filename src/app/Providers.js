'use client';

import { SessionProvider } from 'next-auth/react';
import { TravelDataProvider } from '../context/TravelDataProvider';
import { MapDataProvider } from '../context/MapDataContext';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <TravelDataProvider>
        <MapDataProvider>
          {children}
        </MapDataProvider>
      </TravelDataProvider>
    </SessionProvider>
  );
}

