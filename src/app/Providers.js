'use client';

import { SessionProvider } from 'next-auth/react';
import { TravelDataProvider } from '../context/TravelDataProvider';
import { MapDataProvider } from '../context/MapDataContext';
import { CurrencyProvider } from '../components/common/CurrencySelector';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <TravelDataProvider>
          <MapDataProvider>
            {children}
          </MapDataProvider>
        </TravelDataProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}

