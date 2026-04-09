'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl, isCDNEnabled } from '../../utils/cdnUtils';
import { getFlagForCountry } from '../../utils/countryFlags';

// Tiny 10x10 blurred placeholder SVG (generic gray gradient)
const DEFAULT_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZTVlN2ViIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZDFkNWRiIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+';

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

const CityCard = ({ city, priority = false, blurDataUrl = null, lazyRoot = null }) => {
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

  // Map country names to folder names (some folders use different naming)
  const getCountryFolder = (country) => {
    const folderMap = {
      'United Kingdom': 'UK',
      'Czech Republic': 'Czechia',
    };
    return folderMap[country] || country;
  };

  // Build a prioritized list of possible image sources
  const fallbacks = useMemo(() => {
    const id = city.id;
    const sources = [];
    const countryFolder = city.country ? getCountryFolder(city.country) : null;
    
    // 1. Custom thumbnail if specified
    if (city.thumbnail) sources.push(city.thumbnail);
    
    // 2. Local country-specific thumbnail (highest priority for local files)
    if (countryFolder) {
      sources.push(`/images/city-thumbnail/${countryFolder}/${id}-thumbnail.jpeg`);
      sources.push(`/images/city-thumbnail/${countryFolder}/${id}-thumbnail.jpg`);
    }
    
    // 3. Also try with original country name
    if (city.country && city.country !== countryFolder) {
      sources.push(`/images/city-thumbnail/${city.country}/${id}-thumbnail.jpeg`);
      sources.push(`/images/city-thumbnail/${city.country}/${id}-thumbnail.jpg`);
    }
    
    // 4. Local city page hero images (country-specific)
    if (countryFolder) {
      sources.push(`/images/city-page/${countryFolder}/${id}-hero.jpeg`);
    }
    
    // 5. Local city page images (root directory)
    sources.push(`/images/city-page/${id}.jpeg`);
    
    // 6. Local optimized JPEG
    sources.push(`/images/optimized/${id}.jpeg`);
    
    // 7. Legacy local thumbnail naming
    sources.push(`/images/${id}-thumbnail.jpeg`);
    
    // 8. Generic city thumbnail directory
    sources.push(`/images/city-thumbnail/${id}-thumbnail.jpeg`);
    
    // 9. CDN mapped city thumbnail (only if CDN is working)
    const cdnSource = getImageUrl(`/images/${id}.jpeg`);
    if (isCDNEnabled() && cdnSource) sources.push(cdnSource);
    
    // 10. Final placeholder
    sources.push('/images/city-placeholder.svg');
    
    return sources;
  }, [city]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images render immediately
  const cardRef = useRef(null);
  const currentSrc = fallbacks[Math.min(srcIndex, fallbacks.length - 1)];

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return; // Skip if priority or already in view

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        root: lazyRoot,
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView, lazyRoot]);

  const handleImgError = () => {
    setSrcIndex((prev) => (prev < fallbacks.length - 1 ? prev + 1 : prev));
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Determine blur placeholder to use
  const placeholderUrl = blurDataUrl || DEFAULT_BLUR_DATA_URL;

  return (
    <div className="group relative" ref={cardRef}>
      <Link href={`/city-guides/${city.id}`} className="block">
        <div className="card overflow-hidden transition duration-300 hover:-translate-y-0.5">
          {/* Card image container */}
          <div className="relative h-48 overflow-hidden bg-gray-100">
            {/* Skeleton shimmer - shown while image loads */}
            {!imageLoaded && (
              <div
                className="absolute inset-0 z-5"
                style={{
                  background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 20%, #f3f4f6 40%, #f3f4f6 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
            )}

            {/* Only render image when in viewport (or priority) */}
            {isInView && (
              <Image
                src={currentSrc}
                alt={`${city.name}, ${city.country} - European city guide`}
                fill
                style={{ objectFit: 'cover' }}
                className={`transition-all duration-500 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                {...(priority ? { priority: true } : { loading: 'lazy' })}
                placeholder="blur"
                blurDataURL={placeholderUrl}
                quality={85}
                onError={handleImgError}
                onLoad={handleImageLoad}
              />
            )}
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