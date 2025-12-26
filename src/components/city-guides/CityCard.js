'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl, isCDNEnabled } from '../../utils/cdnUtils';
import { getFlagForCountry } from '../../utils/countryFlags';

// Flags are centralized in utils/countryFlags

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

const CityCard = ({ city, priority = false }) => {
  const getRegionColorClass = (regionName) => {
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
  
  const getFlagEmoji = (country) => getFlagForCountry(country);

  // Build a prioritized list of possible image sources
  const fallbacks = useMemo(() => {
    const id = city.id;
    const sources = [];
    
    // 1. Custom thumbnail if specified
    if (city.thumbnail) sources.push(city.thumbnail);
    
    // 2. Local country-specific thumbnail (highest priority for local files)
    if (city.country) {
      sources.push(`/images/city-thumbnail/${city.country}/${id}-thumbnail.jpeg`);
    }
    
    // 3. Local city page hero images (country-specific)
    if (city.country) {
      sources.push(`/images/city-page/${city.country}/${id}-hero.jpeg`);
    }
    
    // 4. Local city page images (root directory)
    sources.push(`/images/city-page/${id}.jpeg`);
    
    // 5. Local optimized JPEG
    sources.push(`/images/optimized/${id}.jpeg`);
    
    // 6. Legacy local thumbnail naming
    sources.push(`/images/${id}-thumbnail.jpeg`);
    
    // 7. Generic city thumbnail directory
    sources.push(`/images/city-thumbnail/${id}-thumbnail.jpeg`);
    
    // 8. CDN mapped city thumbnail (only if CDN is working)
    const cdnSource = getImageUrl(`/images/${id}.jpeg`);
    if (isCDNEnabled() && cdnSource) sources.push(cdnSource);
    
    // 9. Final placeholder
    sources.push('/images/city-placeholder.svg');
    
    return sources;
  }, [city]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const currentSrc = fallbacks[Math.min(srcIndex, fallbacks.length - 1)];

  const handleImgError = () => {
    setSrcIndex((prev) => (prev < fallbacks.length - 1 ? prev + 1 : prev));
  };
  
  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  
  return (
    <div className="group relative">
      <Link href={`/city-guides/${city.id}`} className="block">
        <div className="card overflow-hidden transition duration-300 hover:-translate-y-0.5">
          {/* Card image container */}
          <div className="relative h-48 overflow-hidden bg-gray-100">
            <Image
              src={currentSrc}
              alt={`${city.name}, ${city.country} - European city guide`}
              fill
              style={{ objectFit: 'cover' }}
              className="transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              {...(priority ? { priority: true } : { loading: 'lazy' })}
              quality={85}
              onError={handleImgError}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10"></div>
            <div className="absolute top-3 left-3 px-3 py-1.5 text-xs font-medium bg-white/95 backdrop-blur-sm rounded-full text-gray-800 z-20 shadow-sm">
              <span className="mr-1">{getFlagEmoji(city.country)}</span>
              {city.country}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
              <h3 className="text-white font-bold text-xl drop-shadow-lg">
                {city.name}
              </h3>
            </div>
            <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-15"></div>
          </div>
          
          <div className="p-5">
            <p className="text-zinc-600 text-sm leading-relaxed line-clamp-2 mb-3">
              {city.description || `Discover ${city.name}, ${city.country} — a must-visit destination with unique culture and attractions.`}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-600 text-sm font-medium">
                <span>Explore Guide</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
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