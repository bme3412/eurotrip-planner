'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, MapPin, Star, ChevronRight, Navigation } from 'lucide-react';
import { usePhotoSpotImage } from '../hooks/usePhotoSpotImage';

/** Mapbox static mini-map centred on the spot, with a single blue pin. */
function staticMapUrl({ lat, lng }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/` +
    `pin-s+1e63e9(${lng},${lat})/${lng},${lat},14.5/600x240@2x` +
    `?access_token=${token}`
  );
}

export default function SpotDetailModal({ spot, onClose, cityName }) {
  // Hook must run unconditionally; it no-ops when spot is null.
  const { url, attribution } = usePhotoSpotImage(spot || null, cityName);

  if (!spot) return null;

  const lat = spot.coordinates?.lat;
  const lng = spot.coordinates?.lng;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapUrl = hasCoords ? staticMapUrl({ lat, lng }) : null;
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        [spot.name, cityName].filter(Boolean).join(', '),
      )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — Google Places photo with gradient fallback */}
        <div className="relative h-48 bg-gradient-to-br from-violet-200 via-purple-100 to-pink-200 flex items-center justify-center">
          {url ? (
            <Image
              src={url}
              alt={spot.name}
              fill
              sizes="512px"
              className="object-cover"
            />
          ) : (
            <Camera className="w-16 h-16 text-violet-400" />
          )}
          {url && attribution && (
            <span className="absolute bottom-1.5 right-2 text-[9px] text-white/80 drop-shadow-sm">
              © {attribution}
            </span>
          )}
          {spot.iconic && (
            <span className="absolute top-4 left-4 px-3 py-1 bg-amber-400 text-amber-900 text-sm font-bold rounded-full flex items-center gap-1">
              <Star className="w-4 h-4 fill-current" /> Iconic Spot
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 rotate-45" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-12rem)]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{spot.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{spot.neighborhood}</span>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed">{spot.description}</p>

          {/* Location */}
          <div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl overflow-hidden ring-1 ring-gray-200 hover:ring-blue-300 transition-shadow hover:shadow-md"
              aria-label={`Get directions to ${spot.name}`}
            >
              {mapUrl ? (
                <div className="relative h-40">
                  <Image
                    src={mapUrl}
                    alt={`Map of ${spot.name}`}
                    fill
                    sizes="512px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm group-hover:bg-blue-50 transition-colors">
                    <Navigation className="w-3.5 h-3.5" /> Open in Google Maps
                  </span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-blue-700 bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <Navigation className="w-4 h-4" /> Open in Google Maps
                </span>
              )}
            </a>
            {hasCoords && (
              <p className="mt-2 text-xs text-gray-400">
                {lat.toFixed(4)}, {lng.toFixed(4)} · {spot.neighborhood}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
