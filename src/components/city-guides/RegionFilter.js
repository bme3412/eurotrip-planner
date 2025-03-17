"use client";

import React, { useState, useEffect } from 'react';
import { 
  regionThemes, 
  tourismRegions,
  linguisticRegions
} from './regionData';

const RegionFilter = ({
  selectedRegion,
  handleRegionChange,
  hoveredRegion,
  setHoveredRegion,
}) => {
  const [activeFilterType, setActiveFilterType] = useState('geographic');
  
  // Define specific regions for each tab
  const mainGeographicRegions = [
    'Western Europe',
    'Central Europe',
    'Southern Europe',
    'Eastern Europe',
    'Northern Europe'
  ];

  const otherRegionsList = [
    'British Isles',
    'Mediterranean',
    'Alpine',
    'Atlantic Europe',
    'Imperial Cities',
    'Celtic & Nordic',
    'Atlantic Islands',
    'Arctic'
  ];

  // Default options for different filter types
  const allRegionsOption = {
    id: 'All',
    name: 'All',
    tailwind: 'bg-gray-500',
    description: 'View all European regions',
  };
  
  const allStylesOption = {
    id: 'All',
    name: 'All',
    tailwind: 'bg-gray-500',
    description: 'View all tourism styles',
  };

  // Get geographical regions from regionThemes
  const getGeographicRegions = () => {
    return regionThemes
      .filter(region => mainGeographicRegions.includes(region.id))
      .map(region => ({
        id: region.id,
        name: region.name,
        hex: region.hex,
        tailwind: region.tailwind,
        description: region.description,
        countries: region.countries || []
      }));
  };

  // Get other regions not in main geographical categories
  const getOtherRegions = () => {
    // Start with regionThemes data for other regions
    const otherThemeRegions = regionThemes
      .filter(region => otherRegionsList.includes(region.id))
      .map(region => ({
        id: region.id,
        name: region.name,
        hex: region.hex,
        tailwind: region.tailwind,
        description: region.description,
        countries: region.countries || []
      }));
    
    // Add missing regions from the otherRegionsList
    const remainingRegions = otherRegionsList
      .filter(regionId => !otherThemeRegions.some(r => r.id === regionId))
      .map(regionId => {
        // Try to find color and description
        const hex = getRegionHex(regionId);
        return {
          id: regionId,
          name: regionId,
          hex,
          tailwind: getTailwindClassFromHex(hex),
          description: `${regionId} region of Europe.`
        };
      });
    
    return [...otherThemeRegions, ...remainingRegions];
  };

  // Helper to get a hex color for a region ID
  const getRegionHex = (regionId) => {
    // Legacy colors from previous implementation
    const legacyColors = {
      'British Isles': '#2C7A7B',       // Teal
      'Mediterranean': '#F6AD55',       // Light Orange
      'Alpine': '#4FD1C5',              // Teal
      'Atlantic Europe': '#63B3ED',     // Light Blue
      'Imperial Cities': '#9F7AEA',     // Purple
      'Celtic & Nordic': '#667EEA',     // Indigo
      'Atlantic Islands': '#F687B3',    // Pink
      'Arctic': '#9AE6B4',              // Green
    };
    
    return legacyColors[regionId] || '#888888';
  };

  // Create filtered arrays for each tab
  const geographicRegions = [allRegionsOption, ...getGeographicRegions()];
  const regionSpecificArray = [allRegionsOption, ...getOtherRegions()];

  // Convert tourismRegions object to array format for Travel tab
  const travelRegionsArray = [
    allStylesOption,
    ...Object.entries(tourismRegions).map(([name, hex]) => ({
      id: name,
      name,
      hex,
      tailwind: getTailwindClassFromHex(hex),
      description: `Destinations focused on ${name.toLowerCase()}`,
    })),
  ];

  // Helper function to get a Tailwind class from hex
  function getTailwindClassFromHex(hex) {
    // A more comprehensive mapping approach
    const colorMap = {
      '#9932CC': 'bg-purple-600',    // Dark Orchid
      '#00BFFF': 'bg-blue-400',      // Deep Sky Blue
      '#FFFAFA': 'bg-gray-100',      // Snow
      '#8B4513': 'bg-yellow-800',    // Saddle Brown
      '#228B22': 'bg-green-600',     // Forest Green
      '#FF8C00': 'bg-orange-500',    // Dark Orange
      '#4682B4': 'bg-blue-600',      // Steel Blue
      '#DAA520': 'bg-yellow-600',    // Goldenrod
      '#2E8B57': 'bg-green-700',     // Sea Green
      '#3182CE': 'bg-blue-500',      // Blue
      '#38A169': 'bg-green-500',     // Green
      '#DD6B20': 'bg-orange-500',    // Orange
      '#E53E3E': 'bg-red-500',       // Red
      '#805AD5': 'bg-purple-500',    // Purple
      '#2C7A7B': 'bg-teal-500',      // Teal
      '#F6AD55': 'bg-orange-300',    // Light Orange (Mediterranean)
      '#4FD1C5': 'bg-teal-400',      // Teal (Alpine)
      '#63B3ED': 'bg-blue-300',      // Light Blue (Atlantic Europe)
      '#9F7AEA': 'bg-purple-400',    // Purple (Imperial Cities)
      '#667EEA': 'bg-indigo-400',    // Indigo (Celtic & Nordic)
      '#F687B3': 'bg-pink-400',      // Pink (Atlantic Islands)
      '#9AE6B4': 'bg-green-300',     // Green (Arctic)
    };
    
    return colorMap[hex] || 'bg-indigo-500'; // Default fallback
  }

  // Function to handle filter type change
  const handleFilterTypeChange = (filterType) => {
    setActiveFilterType(filterType);
    // Reset selection when changing filter types
    handleRegionChange('All', filterType);
  };

  // Function to get filter options based on active filter type
  const getActiveFilterOptions = () => {
    switch (activeFilterType) {
      case 'geographic':
        return geographicRegions;
      case 'region':
        return regionSpecificArray;
      case 'travel':
        return travelRegionsArray;
      default:
        return geographicRegions;
    }
  };

  // Function to handle region selection with filter type context
  const handleRegionClick = (regionId) => {
    console.log(`Clicked region: ${regionId} with filter type: ${activeFilterType}`);
    handleRegionChange(regionId, activeFilterType);
  };

  return (
    <div className="mb-6 sm:mb-0">
      <h3 className="font-medium text-gray-700 mb-2">Filter</h3>
      
      {/* Filter Type Tabs */}
      <div className="flex space-x-2 mb-3">
        <button
          onClick={() => handleFilterTypeChange('geographic')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeFilterType === 'geographic'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Geographic
        </button>
        <button
          onClick={() => handleFilterTypeChange('region')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeFilterType === 'region'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Region
        </button>
        <button
          onClick={() => handleFilterTypeChange('travel')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeFilterType === 'travel'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Travel
        </button>
      </div>
      
      {/* Filter Options - Custom layout based on filter type */}
      <div className={`${activeFilterType === 'region' ? 'pr-2 pb-2' : 'max-h-48 overflow-y-auto pr-2 pb-2'}`}>
        <div className={`${activeFilterType === 'region' ? 'flex items-center gap-2' : 'flex flex-wrap gap-2'}`}>
          {getActiveFilterOptions().map((region) => (
            <div
              key={region.id}
              className="relative"
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <button
                onClick={() => handleRegionClick(region.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedRegion === region.id
                    ? `${region.tailwind || 'bg-indigo-500'} text-white`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {region.name}
              </button>

              {/* Tooltip for regions other than "All" */}
              {hoveredRegion === region.id && region.id !== 'All' && (
                <div className="absolute z-10 w-64 px-3 py-2 mt-1 text-sm font-normal bg-white border rounded-md shadow-lg">
                  <p className="font-medium">{region.name}</p>
                  <p className="text-gray-600 text-xs">{region.description}</p>
                  
                  {/* Display countries for geographic regions */}
                  {(activeFilterType === 'geographic' || activeFilterType === 'region') && 
                   region.countries && region.countries.length > 0 && (
                    <div className="mt-1">
                      <p className="text-gray-500 text-xs">
                        Countries: {region.countries.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RegionFilter;