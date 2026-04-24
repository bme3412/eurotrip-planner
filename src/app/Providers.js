'use client';

import { TravelDataProvider } from '@/contexts/TravelDataProvider';
import { MapDataProvider } from '@/contexts/MapDataContext';
import { CurrencyProvider } from '@/components/common/CurrencySelector';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <TravelDataProvider>
          <MapDataProvider>
            {children}
          </MapDataProvider>
        </TravelDataProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

