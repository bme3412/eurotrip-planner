import React from 'react';
import { regionDescriptions, regionColors } from './cityData';

const RegionFilter = ({ selectedRegion, handleRegionChange, hoveredRegion, setHoveredRegion }) => {
  // Create a default "All Regions" option
  const allRegionsOption = {
    id: 'All',
    name: 'All Regions',
    color: 'bg-gray-500',
    description: 'View all European regions',
  };
  
  // Get the regions from the regionDescriptions or create a backup list
  let regions = [allRegionsOption];
  
  // Check if regionDescriptions exists and add them
  if (regionDescriptions && typeof regionDescriptions === 'object') {
    Object.keys(regionDescriptions).forEach(regionId => {
      regions.push({
        id: regionId,
        name: regionId, 
        color: getRegionColorClass(regionId),
        description: regionDescriptions[regionId],
      });
    });
  } else {
    // Fallback list of regions if regionDescriptions is not available
    const fallbackRegions = [
      'Mediterranean', 'Alpine', 'Atlantic Europe', 'Imperial Cities',
      'Celtic & Nordic', 'Central Europe', 'Arctic', 'Atlantic Islands'
    ];
    
    fallbackRegions.forEach(region => {
      regions.push({
        id: region,
        name: region,
        color: 'bg-blue-500', // Default color
        description: `Region: ${region}`,
      });
    });
  }
  
  // Convert hex colors to Tailwind classes
  function getRegionColorClass(regionId) {
    // Default color if regionColors is undefined or doesn't have this region
    if (!regionColors || !regionColors[regionId]) {
      return 'bg-blue-500';
    }
    
    // Get hex color
    const hexColor = regionColors[regionId];
    
    // Simple mapping of common colors to Tailwind classes
    switch(hexColor) {
      case '#F59E0B': return 'bg-amber-500';
      case '#10B981': return 'bg-emerald-500';
      case '#3B82F6': return 'bg-blue-500';
      case '#8B5CF6': return 'bg-violet-500';
      case '#6366F1': return 'bg-indigo-500';
      case '#EC4899': return 'bg-pink-500';
      case '#0EA5E9': return 'bg-sky-500';
      case '#F97316': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  }
  
  console.log('Available regions:', regions); // Debug log
  
  return (
    <div className="mb-6 sm:mb-0">
      <h3 className="font-medium text-gray-700 mb-2">Filter by Region</h3>
      <div className="flex flex-wrap gap-2">
        {regions.map((region) => (
          <div
            key={region.id}
            className="relative"
            onMouseEnter={() => setHoveredRegion(region.id)}
            onMouseLeave={() => setHoveredRegion(null)}
          >
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${selectedRegion === region.id
                  ? `${region.color} text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => handleRegionChange(region.id)}
            >
              {region.name}
            </button>
            
            {/* Tooltip */}
            {hoveredRegion === region.id && region.id !== 'All' && (
              <div className="absolute z-10 w-64 px-3 py-2 mt-1 text-sm font-normal bg-white border rounded-md shadow-lg">
                <p className="font-medium">{region.name}</p>
                <p className="text-gray-600 text-xs">{region.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegionFilter;