'use client';

import React, { createContext, useContext, useState } from 'react';

// Create context
const TravelDataContext = createContext(null);

/**
 * Lightweight provider component that manages travel app state
 * Heavy data fetching is now handled by API routes and custom hooks
 */
export const TravelDataProvider = ({ children }) => {
  // Simplified state management - no heavy data processing
  const [travelParams, setTravelParams] = useState({});
  const [selectedCities, setSelectedCities] = useState([]);
  const [isPlanningStarted, setIsPlanningStarted] = useState(false);
  
  // Function to start planning
  const startPlanning = () => {
    setIsPlanningStarted(true);
  };
  
  // Function to add city to trip
  const addCityToTrip = (city) => {
    setSelectedCities(prev => [...prev, city]);
  };
  
  // Function to remove city from trip
  const removeCityFromTrip = (cityId) => {
    setSelectedCities(prev => prev.filter(city => city.id !== cityId));
  };
  
  // Function to clear trip
  const clearTrip = () => {
    setSelectedCities([]);
    setTravelParams({});
    setIsPlanningStarted(false);
  };
  
  // Context value
  const value = {
    // State
    travelParams,
    selectedCities,
    isPlanningStarted,
    
    // Methods
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

// Custom hook to use the travel data context
export const useTravelData = () => {
  const context = useContext(TravelDataContext);
  if (!context) {
    throw new Error('useTravelData must be used within a TravelDataProvider');
  }
  return context;
};