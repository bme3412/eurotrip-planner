'use client';

import React, { createContext, useContext, useState } from 'react';

const TravelDataContext = createContext(null);

/**
 * Lightweight provider component that manages travel app state.
 * Heavy data fetching is handled by API routes and custom hooks.
 */
export const TravelDataProvider = ({ children }) => {
  const [travelParams, setTravelParams] = useState({});
  const [selectedCities, setSelectedCities] = useState([]);
  const [isPlanningStarted, setIsPlanningStarted] = useState(false);

  const startPlanning = () => {
    setIsPlanningStarted(true);
  };

  const addCityToTrip = (city) => {
    setSelectedCities((prev) => [...prev, city]);
  };

  const removeCityFromTrip = (cityId) => {
    setSelectedCities((prev) => prev.filter((city) => city.id !== cityId));
  };

  const clearTrip = () => {
    setSelectedCities([]);
    setTravelParams({});
    setIsPlanningStarted(false);
  };

  const value = {
    travelParams,
    selectedCities,
    isPlanningStarted,
    setTravelParams,
    startPlanning,
    addCityToTrip,
    removeCityFromTrip,
    clearTrip
  };

  return (
    <TravelDataContext.Provider value={value}>
      {children}
    </TravelDataContext.Provider>
  );
};

export const useTravelData = () => {
  const context = useContext(TravelDataContext);
  if (!context) {
    throw new Error('useTravelData must be used within a TravelDataProvider');
  }
  return context;
};
