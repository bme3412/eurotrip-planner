'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, MapPin, Star, Eye } from 'lucide-react';
import { getBestTimeIcon } from '../lib/icons';
import { usePhotoSpotImage } from '../hooks/usePhotoSpotImage';

export default function PhotoCard({ spot, cityName, onClick }) {
  const TimeIcon = getBestTimeIcon(spot.bestTime);
  const { url, attribution } = usePhotoSpotImage(spot, cityName);

  return (
    <div
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Photo (Google Places) with gradient placeholder fallback */}
      <div className="relative aspect-[3/2] bg-gradient-to-br from-violet-100 via-purple-50 to-pink-100 flex items-center justify-center">
        {url ? (
          <Image
            src={url}
            alt={spot.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <Camera className="w-10 h-10 text-violet-300" />
        )}
        {url && attribution && (
          <span className="absolute bottom-1.5 right-2 text-[9px] text-white/80 drop-shadow-sm">
            © {attribution}
          </span>
        )}
        {spot.iconic && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" /> Iconic
          </span>
        )}
        <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-1">{spot.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{spot.description}</p>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-gray-600">
            <MapPin className="w-3 h-3" /> {spot.neighborhood}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full text-amber-700">
            <TimeIcon className="w-3 h-3" /> {spot.bestTime}
          </span>
        </div>
      </div>
    </div>
  );
}
