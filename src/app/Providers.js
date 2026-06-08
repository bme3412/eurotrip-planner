'use client';

import { TravelDataProvider } from '@/contexts/TravelDataProvider';
import { MapDataProvider } from '@/contexts/MapDataContext';
import { CurrencyProvider } from '@/components/common/CurrencySelector';
import { AuthProvider } from '@/contexts/AuthContext';
import PendingSaveCommitter from '@/components/auth/PendingSaveCommitter';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <PendingSaveCommitter />
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

