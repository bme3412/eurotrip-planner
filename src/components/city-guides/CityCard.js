'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { regionColors } from './cityData';

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

const CityCard = ({ city }) => {
  const getRegionColorClass = (regionName) => {
    // Default color if regionColors is undefined or doesn't have this region
    if (!regionColors || !regionColors[regionName]) {
      return 'bg-blue-100 text-blue-800';
    }
    
    // Get hex color and map to Tailwind classes
    const hexColor = regionColors[regionName];
    
    switch(hexColor) {
      case '#F59E0B': return 'bg-amber-100 text-amber-800';
      case '#10B981': return 'bg-emerald-100 text-emerald-800';
      case '#3B82F6': return 'bg-blue-100 text-blue-800';
      case '#8B5CF6': return 'bg-violet-100 text-violet-800';
      case '#6366F1': return 'bg-indigo-100 text-indigo-800';
      case '#EC4899': return 'bg-pink-100 text-pink-800';
      case '#0EA5E9': return 'bg-sky-100 text-sky-800';
      case '#F97316': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };
  
  // Get flag emoji for the city's country
  const getFlagEmoji = (country) => {
    return countryToFlag[country] || '';
  };
  
  // Default thumbnail path if not provided
  const thumbnailPath = city.thumbnail || '/images/cities/default-city.jpg';
  
  return (
    <div className="relative group">
      <Link href={`/city-guides/${city.id}`} className="block">
        <div className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg">
          {/* Card image container */}
          <div className="relative h-44 overflow-hidden">
            {/* Use next/image for optimized loading */}
            <Image
              src={thumbnailPath}
              alt={`Thumbnail image for ${city.name}`}
              fill
              style={{ objectFit: 'cover' }}
              className="transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
            
            {/* Gradient overlay - placed inside or alongside Image depending on styling needs */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
            
            {/* Content absolutely positioned over the image */}
            <div className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-white/90 rounded-full text-gray-800 z-20">
              {getFlagEmoji(city.country)} {city.country}
            </div>
            
            <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-full ${getRegionColorClass(city.region)} z-20`}>
              {city.region}
            </div>
            
            <h3 className="absolute bottom-3 left-3 text-white font-bold text-xl drop-shadow-sm z-20">
              {city.name}
            </h3>
          </div>
          
          {/* Card body */}
          <div className="p-4">
            <p className="text-gray-600 text-sm line-clamp-3">
              {city.description || "Explore this charming European destination."}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CityCard;