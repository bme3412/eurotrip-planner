'use client';

import { SessionProvider } from 'next-auth/react';
import { TravelDataProvider } from '../context/TravelDataProvider';
import { MapDataProvider } from '../context/MapDataContext';
import { CurrencyProvider } from '../components/common/CurrencySelector';
import { AuthProvider } from '../contexts/AuthContext';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <CurrencyProvider>
          <TravelDataProvider>
            <MapDataProvider>
              {children}
            </MapDataProvider>
          </TravelDataProvider>
        </CurrencyProvider>
      </AuthProvider>
    </SessionProvider>
  );
}

