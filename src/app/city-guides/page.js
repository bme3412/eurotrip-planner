"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RegionFilter from '../../components/city-guides/RegionFilter';
import CountryFilter from '../../components/city-guides/CountryFilter';
import CityCard from '../../components/city-guides/CityCard';
import { getCitiesData, cityCountries } from '../../components/city-guides/cityData';

const CityGuidesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState(['All']);
  const [error, setError] = useState(null);
  const [activeFilterType, setActiveFilterType] = useState('geographic');
  
  useEffect(() => {
    try {
      setLoading(true);
      setError(null);
      
      // Get cities data
      const cityData = getCitiesData();
      setCities(cityData);
      
      // Use the cityCountries array (which is already computed as an array)
      setCountries(['All', ...cityCountries.sort()]);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading cities:', err);
      setError('Failed to load city data');
      setLoading(false);
    }
  }, []);
  
  // Filter cities based on search term, region, and country
  const filteredCities = cities.filter(city => {
    // Apply text search filter
    const matchesSearch =
      searchTerm === '' ||
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (city.country && city.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (city.description && city.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Apply country filter
    const matchesCountry = selectedCountry === 'All' || city.country === selectedCountry;
    
    // Apply region/theme filter based on filter type
    let matchesRegionOrTheme = true;
    
    if (selectedRegion !== 'All') {
      if (activeFilterType === 'geographic') {
        matchesRegionOrTheme = city.region === selectedRegion;
      } else if (activeFilterType === 'tourism') {
        matchesRegionOrTheme = city.tourismCategories && city.tourismCategories.includes(selectedRegion);
      }
    }
    
    return matchesSearch && matchesCountry && matchesRegionOrTheme;
  });
  
  // Handlers for filters
  const handleRegionChange = (region, filterType) => {
    setSelectedRegion(region);
    if (filterType) {
      setActiveFilterType(filterType);
    }
  };
  
  const handleCountryChange = (country) => setSelectedCountry(country);
  
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('All');
    setSelectedCountry('All');
  };
  
  // Get the appropriate filter label based on active filter type
  const getFilterLabel = () => {
    if (activeFilterType === 'geographic') return 'Region';
    if (activeFilterType === 'tourism') return 'Style';
    return 'Filter';
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative text-white overflow-hidden h-64">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/80 to-indigo-800/80 z-10"></div>
        <div className="absolute inset-0 w-full h-full bg-blue-600">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/images/europe-map-bg.jpg)' }}
          ></div>
        </div>
        <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Explore European Cities</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl">
            Discover detailed guides for the most popular destinations across Europe,
            with insider tips, interactive maps, and local recommendations.
          </p>
          {/* Search bar */}
          <div className="mt-4 max-w-lg">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search for a city or country..." 
                className="w-full py-2 px-4 pr-10 rounded-lg bg-white/90 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-3 top-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Active Filters */}
        <div className="mb-4">
          {(selectedRegion !== 'All' || selectedCountry !== 'All' || searchTerm !== '') && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-600">Active filters:</span>
              {selectedRegion !== 'All' && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                  {getFilterLabel()}: {selectedRegion}
                  <button 
                    className="ml-1 text-blue-500 hover:text-blue-700"
                    onClick={() => setSelectedRegion('All')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              )}
              {selectedCountry !== 'All' && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                  Country: {selectedCountry}
                  <button 
                    className="ml-1 text-green-500 hover:text-green-700"
                    onClick={() => setSelectedCountry('All')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              )}
              {searchTerm !== '' && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center">
                  Search: "{searchTerm}"
                  <button 
                    className="ml-1 text-purple-500 hover:text-purple-700"
                    onClick={() => setSearchTerm('')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              )}
              <button
                className="text-gray-500 hover:text-gray-700 text-xs underline ml-2"
                onClick={clearFilters}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start gap-4">
          <RegionFilter 
            selectedRegion={selectedRegion}
            handleRegionChange={handleRegionChange}
            hoveredRegion={hoveredRegion}
            setHoveredRegion={setHoveredRegion}
          />
          <CountryFilter 
            selectedCountry={selectedCountry}
            handleCountryChange={handleCountryChange}
            countries={countries}
          />
        </div>
        
        {/* City cards grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">City Guides</h2>
          <div className="text-sm text-gray-500">
            {loading ? 'Loading...' : `Showing ${filteredCities.length} of ${cities.length} cities`}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-600">No cities found matching your criteria</p>
            <button
              className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
              onClick={clearFilters}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCities.map((city) => (
              <CityCard key={city.id} city={city} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CityGuidesPage;