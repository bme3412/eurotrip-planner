'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Plane } from 'lucide-react';
import { TransportOptionList } from '../../TransportOptionCard';

// Dynamically import the map component to avoid SSR issues.
// Keep this inside the panel so the chunk only loads when this panel renders.
const AirportRouteMap = dynamic(() => import('../../AirportRouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-72 sm:h-80 md:h-96 bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading map...</span>
      </div>
    </div>
  ),
});

function ProseSummary({ airportCode }) {
  if (airportCode === 'CDG') {
    return (
      <>
        <strong className="text-gray-900">RER B</strong> is fastest (€12, 35–50 min to Gare du Nord).{' '}
        <strong className="text-gray-900">Roissybus</strong> goes to Opéra (€16, 60–75 min).{' '}
        <strong className="text-gray-900">Taxis</strong> are flat-rate: €55 Right Bank, €62 Left Bank.{' '}
        <strong className="text-gray-900">Uber/Bolt</strong> run €50–80.
      </>
    );
  }
  if (airportCode === 'ORY') {
    return (
      <>
        <strong className="text-gray-900">Orlybus</strong> to Denfert-Rochereau is simplest (€12, 30–40 min).{' '}
        <strong className="text-gray-900">Orlyval + RER B</strong> connects to central Paris (€14, 35–45 min).{' '}
        <strong className="text-gray-900">Tram T7</strong> is cheapest but slow (€2, 40–50 min).{' '}
        <strong className="text-gray-900">Taxis</strong> are flat-rate: €35 Left Bank, €41 Right Bank.
      </>
    );
  }
  return <>Multiple transport options connect the airport to the city center.</>;
}

export default function AirportRoutePanel({
  displayName,
  gettingInData,
  selectedAirport,
  selectedAirportData,
  selectedRouteId,
  onSelectAirport,
  onSelectRoute,
}) {
  return (
    <article className="lg:max-w-none">
      <div className="mb-10">
        {/* Header with airport tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Plane className="h-5 w-5 text-sky-500" />
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Getting to {displayName}
            </h2>
          </div>

          {gettingInData?.airports?.length > 1 && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              {gettingInData.airports.map((airport) => (
                <button
                  key={airport.code}
                  onClick={() => onSelectAirport(airport.code)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    selectedAirport === airport.code
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {airport.code}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Prose summary */}
        {selectedAirportData && (
          <p className="text-gray-600 leading-relaxed mb-5">
            <ProseSummary airportCode={selectedAirportData.code} />
          </p>
        )}

        {/* Transport options */}
        {selectedAirportData?.routes && (
          <div className="mb-6">
            <TransportOptionList
              routes={selectedAirportData.routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={onSelectRoute}
              layout="row"
              compact
            />
          </div>
        )}

        {/* Map */}
        {gettingInData && (
          <AirportRouteMap
            data={gettingInData}
            selectedRouteId={selectedRouteId}
            onSelectRoute={onSelectRoute}
            selectedAirport={selectedAirport}
            onSelectAirport={onSelectAirport}
            className="h-72 sm:h-80 md:h-96 aspect-[4/3] md:aspect-auto"
          />
        )}
      </div>
    </article>
  );
}
