'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Country code to flag emoji mapping
const countryToFlag = {
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Netherlands': '🇳🇱',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Austria': '🇦🇹',
  'Belgium': '🇧🇪',
  'Denmark': '🇩🇰',
  'Ireland': '🇮🇪',
  'Portugal': '🇵🇹',
  'Greece': '🇬🇷',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Finland': '🇫🇮',
  'Switzerland': '🇨🇭',
  'Czech Republic': '🇨🇿',
  'Hungary': '🇭🇺',
  'Poland': '🇵🇱',
  'Croatia': '🇭🇷',
  'Estonia': '🇪🇪',
  'Latvia': '🇱🇻',
  'Lithuania': '🇱🇹',
  'Slovenia': '🇸🇮',
  'Slovakia': '🇸🇰'
};

// Region color mapping with improved colors
const regionColors = {
  "Atlantic Europe": "#0EA5E9", // sky
  "Mediterranean": "#F97316", // orange
  "Central Europe": "#10B981", // emerald
  "Imperial Cities": "#8B5CF6", // violet
  "Alpine": "#3B82F6", // blue
  "Celtic & Nordic": "#6366F1", // indigo
  "Nordic": "#6366F1", // indigo
  "Arctic": "#EC4899", // pink
  "Atlantic Islands": "#F59E0B", // amber
  "Other": "#6B7280", // gray
};

const CityCard = ({ city }) => {
  const getRegionColorClass = (regionName) => {
    // Get hex color and map to Tailwind classes
    const hexColor = regionColors[regionName] || regionColors["Other"];
    
    switch(hexColor) {
      case '#F59E0B': return 'bg-amber-100 text-amber-800 border-amber-200';
      case '#10B981': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '#3B82F6': return 'bg-blue-100 text-blue-800 border-blue-200';
      case '#8B5CF6': return 'bg-violet-100 text-violet-800 border-violet-200';
      case '#6366F1': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '#EC4899': return 'bg-pink-100 text-pink-800 border-pink-200';
      case '#0EA5E9': return 'bg-sky-100 text-sky-800 border-sky-200';
      case '#F97316': return 'bg-orange-100 text-orange-800 border-orange-200';
      case '#6B7280': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  // Get flag emoji for the city's country
  const getFlagEmoji = (country) => {
    return countryToFlag[country] || '🏳️';
  };
  
  // Use the thumbnail path from our API or fallback to placeholder
  const thumbnailPath = city.thumbnail || '/images/city-placeholder.svg';
  
  return (
    <div className="group relative">
      <Link href={`/city-guides/${city.id}`} className="block">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 hover:border-blue-200 hover:-translate-y-1">
          {/* Card image container */}
          <div className="relative h-48 overflow-hidden">
            {/* Use next/image for optimized loading */}
            <Image
              src={thumbnailPath}
              alt={`${city.name}, ${city.country} - European city guide`}
              fill
              style={{ objectFit: 'cover' }}
              className="transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              onError={(e) => {
                // Fallback to placeholder on error
                e.target.src = '/images/city-placeholder.svg';
              }}
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10"></div>
            
            {/* Country flag badge */}
            <div className="absolute top-3 left-3 px-3 py-1.5 text-xs font-medium bg-white/95 backdrop-blur-sm rounded-full text-gray-800 z-20 shadow-sm">
              <span className="mr-1">{getFlagEmoji(city.country)}</span>
              {city.country}
            </div>
            
            {/* Region badge */}
            <div className={`absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded-full border ${getRegionColorClass(city.region)} z-20 shadow-sm`}>
              {city.region || 'Europe'}
            </div>
            
            {/* City name */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
              <h3 className="text-white font-bold text-xl drop-shadow-lg">
                {city.name}
              </h3>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-15"></div>
          </div>
          
          {/* Card body */}
          <div className="p-5">
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
              {city.description || "Explore this charming European destination with our comprehensive guide."}
            </p>
            
            {/* Action indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-blue-600 text-sm font-medium">
                <span>Explore Guide</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              {/* Quick stats if available */}
              {city.attractions && (
                <div className="text-xs text-gray-500">
                  {city.attractions.length} attractions
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CityCard;