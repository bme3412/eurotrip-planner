"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import RegionFilter from '../../components/city-guides/RegionFilter';
import CountryFilter from '../../components/city-guides/CountryFilter';
import CityCard from '../../components/city-guides/CityCard';
import { getCitiesData, cityCountries } from '../../components/city-guides/cityData';
import { regionThemes } from '../../components/city-guides/regionData';

const INITIAL_LOAD = 12;
const LOAD_INCREMENT = 8;
const SCROLL_OFFSET = 250;

const CityGuidesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allAvailableCountries, setAllAvailableCountries] = useState([]);
  const [error, setError] = useState(null);
  const [activeFilterType, setActiveFilterType] = useState('geographic');

  const [itemsToShow, setItemsToShow] = useState(INITIAL_LOAD);
  const [displayedCities, setDisplayedCities] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  
  useEffect(() => {
    try {
      setLoading(true);
      setError(null);
      
      const cityData = getCitiesData();
      setCities(cityData);
      
      const availableCountries = [...new Set(cityData.map(c => c.country).filter(Boolean))].sort();
      setAllAvailableCountries(availableCountries);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading cities:', err);
      setError('Failed to load city data');
      setLoading(false);
    }
  }, []);
  
  const filteredCities = useMemo(() => {
    return cities.filter(city => {
      const matchesSearch =
        searchTerm === '' ||
        city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (city.country && city.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (city.description && city.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(city.country);
      
      let matchesRegionOrTheme = true;
      
      if (selectedRegion !== 'All') {
        if (activeFilterType === 'geographic') {
          const theme = regionThemes.find(t => t.id === selectedRegion);
          const countriesInRegion = theme ? theme.countries || [] : [];
          matchesRegionOrTheme = theme ? countriesInRegion.includes(city.country) : false;
        } else if (activeFilterType === 'region') {
          matchesRegionOrTheme = city.region === selectedRegion;
        } else if (activeFilterType === 'travel') {
          matchesRegionOrTheme = city.tourismCategories && city.tourismCategories.includes(selectedRegion);
        }
      }
      
      return matchesSearch && matchesCountry && matchesRegionOrTheme;
    });
  }, [cities, searchTerm, selectedCountries, selectedRegion, activeFilterType]);

  useEffect(() => {
    setItemsToShow(INITIAL_LOAD);
    const initialSlice = filteredCities.slice(0, INITIAL_LOAD);
    setDisplayedCities(initialSlice);
    setHasMore(filteredCities.length > INITIAL_LOAD);
  }, [filteredCities]);

  const loadMoreCities = useCallback(() => {
    if (!hasMore) return;

    const newItemsToShow = itemsToShow + LOAD_INCREMENT;
    const newDisplayedCities = filteredCities.slice(0, newItemsToShow);
    setDisplayedCities(newDisplayedCities);
    setItemsToShow(newItemsToShow);
    setHasMore(filteredCities.length > newItemsToShow);
  }, [itemsToShow, filteredCities, hasMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - SCROLL_OFFSET && hasMore && !loading) {
        loadMoreCities();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);

  }, [hasMore, loading, loadMoreCities]);
  
  const handleRegionChange = (region, filterType) => {
    setSelectedRegion(region);
    if (filterType) {
      setActiveFilterType(filterType);
    }
  };
  
  const handleCountryChange = (country) => {
    setSelectedCountries(prevSelectedCountries => {
      if (prevSelectedCountries.includes(country)) {
        return prevSelectedCountries.filter(c => c !== country);
      } else {
        return [...prevSelectedCountries, country];
      }
    });
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('All');
    setSelectedCountries([]);
  };
  
  const getFilterLabel = () => {
    if (activeFilterType === 'geographic') return 'Region';
    if (activeFilterType === 'tourism') return 'Style';
    return 'Filter';
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="mb-4">
          {(selectedRegion !== 'All' || selectedCountries.length > 0 || searchTerm !== '') && (
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
              {selectedCountries.length > 0 && (
                selectedCountries.map(country => (
                  <span key={country} className="bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                    Country: {country}
                    <button 
                      className="ml-1 text-green-500 hover:text-green-700"
                      onClick={() => handleCountryChange(country)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
              {searchTerm !== '' && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center">
                  Search: &quot;{searchTerm}&quot;
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
        
        <div className="mb-8 flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
          <div className="flex-1">
            <RegionFilter 
              selectedRegion={selectedRegion}
              handleRegionChange={handleRegionChange}
            />
          </div>

          <div className="w-full md:w-auto">
            <CountryFilter 
              selectedCountries={selectedCountries}
              handleCountryChange={handleCountryChange}
              countries={allAvailableCountries}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">City Guides</h2>
          <div className="text-sm text-gray-500">
            {loading ? 'Loading...' : `Showing ${displayedCities.length} of ${filteredCities.length} cities`}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedCities.map((city) => (
                <div key={city.id} className="transition-opacity ease-in-out duration-500">
                  <CityCard city={city} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CityGuidesPage;