'use client';

import React from 'react';
import AirportRoutePanel from './components/AirportRoutePanel';
import FaqAccordion from './components/FaqAccordion';
import StartHereFooter from './components/StartHereFooter';
import { useStartHereData } from './hooks/useStartHereData';
import { useGettingInData } from './hooks/useGettingInData';

export default function StartHere({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const displayName =
    cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

  const faqs = useStartHereData(cityKey, cityData?.country);
  const {
    gettingInData,
    selectedAirport,
    selectedAirportData,
    selectedRouteId,
    handleSelectAirport,
    handleSelectRoute,
  } = useGettingInData(cityKey, cityData?.country);

  return (
    <div className="space-y-8">
      <AirportRoutePanel
        displayName={displayName}
        gettingInData={gettingInData}
        selectedAirport={selectedAirport}
        selectedAirportData={selectedAirportData}
        selectedRouteId={selectedRouteId}
        onSelectAirport={handleSelectAirport}
        onSelectRoute={handleSelectRoute}
      />

      <FaqAccordion faqs={faqs} />

      <StartHereFooter />
    </div>
  );
}
