'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const TravelDataContext = createContext(null);

/**
 * Provider component that manages travel data state
 */
export const TravelDataProvider = ({ initialData = {}, children }) => {
  // Data states with defaults
  const [videos, setVideos] = useState(initialData.videos || []);
  const [travelParams, setTravelParams] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPlanningStarted, setIsPlanningStarted] = useState(false);
  
  // Common data
  const [popularCities, setPopularCities] = useState([]);
  const [countries, setCountries] = useState([]);
  
  // Extract locations and countries from videos on initial load
  useEffect(() => {
    if (videos.length > 0) {
      // Extract unique cities
      const extractedCities = [...new Set(videos.map(video => video.location))];
      setPopularCities(extractedCities);
      
      // Extract unique countries
      const extractedCountries = [...new Set(videos.map(video => video.country))];
      setCountries(extractedCountries);
    } else {
      // Fallback data if no videos are provided
      setPopularCities([
        'Paris', 'Barcelona', 'Rome', 'Amsterdam', 'Berlin',
        'Prague', 'Vienna', 'Athens', 'Lisbon', 'Madrid',
        'London', 'Dublin', 'Copenhagen', 'Stockholm', 'Budapest'
      ]);
      
      setCountries([
        'France', 'Spain', 'Italy', 'Netherlands', 'Germany',
        'Czech Republic', 'Austria', 'Greece', 'Portugal', 'Switzerland',
        'Belgium', 'Croatia', 'Denmark', 'Hungary', 'Ireland',
        'United Kingdom', 'Sweden', 'Norway', 'Finland', 'Poland'
      ]);
    }
  }, [videos]);
  
  // Handle search function
  const handleSearch = async (searchParams) => {
    setIsSearching(true);
    setTravelParams(searchParams);
    
    try {
      // Simulate API call or data processing
      // In a real application, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Filter videos based on search parameters
      let filteredResults = [...videos];
      
      // Filter by starting city if provided
      if (searchParams.startCity) {
        filteredResults = filteredResults.filter(video => 
          video.location === searchParams.startCity || 
          video.location.includes(searchParams.startCity)
        );
      }
      
      // Filter by countries if provided
      if (searchParams.countries && searchParams.countries.length > 0) {
        const additionalVideos = videos.filter(video => 
          searchParams.countries.includes(video.country)
        );
        
        // Combine and deduplicate results
        filteredResults = [...new Set([...filteredResults, ...additionalVideos])];
      }
      
      // Filter by content type based on info preferences
      if (searchParams.infoPreferences) {
        const { cityGuides, dayTrips, itineraries } = searchParams.infoPreferences;
        const contentTypes = [];
        
        if (cityGuides) contentTypes.push('city-guide');
        if (dayTrips) contentTypes.push('day-trip');
        if (itineraries) contentTypes.push('itinerary');
        
        if (contentTypes.length > 0) {
          filteredResults = filteredResults.filter(video => 
            video.category && contentTypes.some(type => video.category.includes(type))
          );
        }
      }
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error during search:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Function to start planning
  const startPlanning = () => {
    setIsPlanningStarted(true);
  };
  
  // Context value
  const value = {
    // Data
    videos,
    popularCities,
    countries,
    searchResults,
    travelParams,
    isSearching,
    isPlanningStarted,
    
    // Methods
    setVideos,
    handleSearch,
    startPlanning
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