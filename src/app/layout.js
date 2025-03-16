'use client';

import './globals.css';
import { TravelDataProvider } from '../context/TravelDataProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <TravelDataProvider>
          {children}
        </TravelDataProvider>
      </body>
    </html>
  );
}