'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Renders a Google Place photo via server proxy to keep API key private.
 * Falls back to a placeholder or existing thumbnail on error.
 *
 * Can be used with either:
 * - photoName: full photo resource path (e.g., "places/ChIJ.../photos/AUac...")
 * - placeId: Google Place ID (will auto-resolve to first photo)
 */
export default function GooglePlacePhoto({
  photoName,
  placeId,
  maxWidth = 800,
  maxHeight,
  alt = '',
  fill = false,
  width,
  height,
  className = '',
  fallback = null,
  sizes,
}) {
  // Build URL based on whether we have photoName or placeId
  const buildPhotoUrl = () => {
    const params = new URLSearchParams();
    params.set('w', String(maxWidth));
    if (maxHeight) params.set('h', String(maxHeight));

    if (photoName) {
      params.set('name', photoName);
    } else if (placeId) {
      params.set('placeId', placeId);
    }
    return `/api/google-photos?${params.toString()}`;
  };

  const [src, setSrc] = useState(buildPhotoUrl());
  const [failed, setFailed] = useState(false);

  if (failed) {
    return fallback || (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-300 text-3xl ${className}`}>
        📍
      </div>
    );
  }

  const imgProps = fill
    ? { fill: true, sizes: sizes || '(min-width: 768px) 320px, 100vw' }
    : { width: width || maxWidth, height: height || maxHeight || maxWidth };

  return (
    <Image
      src={src}
      alt={alt}
      {...imgProps}
      className={className}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
