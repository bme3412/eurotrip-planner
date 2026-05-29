'use client';

import React, { useState } from 'react';
import { getPhotoData } from './lib/photoData';
import { usePhotoFilters } from './hooks/usePhotoFilters';
import PhotoFilterBar from './components/PhotoFilterBar';
import PhotoCard from './components/PhotoCard';
import SpotDetailModal from './components/SpotDetailModal';
import PhotoBreadcrumb from './components/PhotoBreadcrumb';

export default function PhotoSpots({ cityName }) {
  const photoData = getPhotoData(cityName);
  const displayName =
    cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'iconic' | 'hidden'

  const filteredSpots = usePhotoFilters(photoData.spots, filter);

  return (
    <div className="space-y-10">
      {/* Intro */}
      <div className="max-w-4xl">
        <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium">
          {photoData.intro}
        </p>
      </div>

      {/* Filter tabs */}
      <PhotoFilterBar filter={filter} onChange={setFilter} />

      {/* Spots Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSpots.map((spot, i) => (
          <PhotoCard key={i} spot={spot} onClick={() => setSelectedSpot(spot)} />
        ))}
      </div>

      {/* Spot Detail Modal */}
      <SpotDetailModal spot={selectedSpot} onClose={() => setSelectedSpot(null)} />

      {/* Footer */}
      <PhotoBreadcrumb cityName={cityName} displayName={displayName} />
    </div>
  );
}
