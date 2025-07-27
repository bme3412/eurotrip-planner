'use client';

import './globals.css';
import { TravelDataProvider } from '../context/TravelDataProvider';
import { MapDataProvider } from '../context/MapDataContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <TravelDataProvider>
          <MapDataProvider>
            {children}
          </MapDataProvider>
        </TravelDataProvider>
      </body>
    </html>
  );
}