'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CityCard from './CityCard';
import CityCardSkeleton from './CityCardSkeleton';
import LazySection from '../common/LazySection';

// 12 most popular European cities with pre-computed blur placeholders
const POPULAR_CITIES = [
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    description: 'The City of Light, famous for the Eiffel Tower, world-class museums, and romantic boulevards.',
    // Warm-toned blur for Paris (beige/gold tones)
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmRmMmU5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZDRiODk2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    description: 'Historic capital blending royal heritage with cutting-edge culture, from Big Ben to Borough Market.',
    // Cool gray/blue tones for London
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjYzlkNmRmIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjOGI5ZGFkIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    description: "Gaudí's masterpieces, Mediterranean beaches, and legendary tapas in Catalonia's vibrant capital.",
    // Warm orange/terracotta for Barcelona
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZlNGNjIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZTg5YjZkIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    description: 'The Eternal City where ancient ruins, Renaissance art, and Italian dolce vita converge.',
    // Warm sepia tones for Rome
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjVlNmQzIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzRhMDdlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    description: 'Picturesque canals, world-renowned museums, and a famously free-spirited atmosphere.',
    // Blue/green water tones for Amsterdam
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZDFlZGVkIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjN2NhYWIxIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'prague',
    name: 'Prague',
    country: 'Czech Republic',
    description: "Fairytale spires, medieval charm, and one of Europe's best-preserved historic centers.",
    // Red/terracotta rooftop tones for Prague
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjBkYmQwIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzc4YTdhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    description: 'Sun-drenched hills, historic trams, and a thriving food scene on the Atlantic coast.',
    // Warm yellow/pastel tones for Lisbon
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmNWUxIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmNkOWI2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'vienna',
    name: 'Vienna',
    country: 'Austria',
    description: 'Imperial palaces, legendary coffee houses, and the birthplace of classical music.',
    // Elegant cream/white tones for Vienna
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjhmNmYwIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZDlkM2M1Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Spain',
    description: 'Spain’s lively capital — the Prado, grand plazas, and tapas crawls that run past midnight.',
    // Warm red/terracotta tones for Madrid
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjllM2RhIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzk3YTVlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'florence',
    name: 'Florence',
    country: 'Italy',
    description: 'Cradle of the Renaissance — Brunelleschi’s dome, Uffizi masterpieces, and Tuscan cuisine.',
    // Terracotta duomo tones for Florence
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjllOWQ5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjY2Y4ZjYyIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Germany',
    description: 'Layered history, world-class galleries, and a nightlife scene like nowhere else in Europe.',
    // Cool gray/green tones for Berlin
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZTNlOGU2Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjOWFhOGE0Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
  {
    id: 'venice',
    name: 'Venice',
    country: 'Italy',
    description: 'A floating city of canals, gondolas, and Byzantine splendor unlike anywhere on earth.',
    // Aqua canal tones for Venice
    blurDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZGZmMGVlIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjN2ZiM2I4Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+',
  },
];

/**
 * PopularCitiesSection - Lazy loaded popular cities with staggered animations
 *
 * Features:
 * - Section-level lazy loading via IntersectionObserver
 * - Individual card lazy loading
 * - Blur placeholders (LQIP) for each city
 * - Staggered fade-in animations
 * - Skeleton loading state
 */
const PopularCitiesSection = ({ cities = [] }) => {
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [sectionVisible, setSectionVisible] = useState(false);
  const batchTimeoutsRef = useRef([]);

  // Merge API city data with our curated popular cities
  const mergedCities = POPULAR_CITIES.map((popularCity) => {
    const loadedCity = cities.find((c) => c.id === popularCity.id);
    return loadedCity
      ? { ...loadedCity, description: popularCity.description, blurDataUrl: popularCity.blurDataUrl }
      : popularCity;
  });

  // Staggered loading: reveal cards one row (4 cards) at a time when section becomes visible
  const handleSectionVisible = useCallback(() => {
    setSectionVisible(true);

    const revealThrough = (count) =>
      setVisibleCards(new Set(Array.from({ length: count }, (_, i) => i)));

    // First row immediately, each following row 150ms later
    revealThrough(4);
    for (let count = 8; count <= POPULAR_CITIES.length; count += 4) {
      const batchCount = count;
      batchTimeoutsRef.current.push(
        setTimeout(() => revealThrough(batchCount), ((batchCount - 4) / 4) * 150)
      );
    }
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = batchTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Skeleton for the section before it's visible
  const sectionSkeleton = (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: POPULAR_CITIES.length }).map((_, i) => (
          <CityCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  return (
    <LazySection
      skeleton={sectionSkeleton}
      rootMargin="300px"
      onVisible={handleSectionVisible}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🌟</span>
        <h2 className="text-lg font-semibold text-gray-900">Popular Cities</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mergedCities.map((city, index) => (
          <div
            key={city.id}
            className={`transition-all duration-500 ${
              visibleCards.has(index)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
            style={{
              transitionDelay: visibleCards.has(index) ? `${(index % 4) * 75}ms` : '0ms',
            }}
          >
            <CityCard
              city={city}
              priority={index < 4}
              blurDataUrl={city.blurDataUrl}
            />
          </div>
        ))}
      </div>
    </LazySection>
  );
};

export default PopularCitiesSection;
