'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Renders a Google Place photo via server proxy to keep API key private.
 * Falls back to a placeholder or existing thumbnail on error.
 */
export default function GooglePlacePhoto({
  photoName,
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
  const [src, setSrc] = useState(
    `/api/google-photos?name=${encodeURIComponent(photoName)}&w=${maxWidth}${maxHeight ? `&h=${maxHeight}` : ''}`
  );
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
