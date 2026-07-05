'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

// Tiny blur placeholder - gray gradient
const BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBQYSIRMxQVH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMRIf/aAAwDAQACEQMRAD8AqbZ3Dd2d5cW9zfyywyLyjDMSB9/K0qpSlVmGYxCLbQWBP//Z';

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
  priority = false,
  onReady,
}) {
  // Baked photoName tokens can go stale (Google rotates them); when one fails
  // and we also have a placeId, retry via the placeId lookup before giving up.
  const [photoNameFailed, setPhotoNameFailed] = useState(false);
  const [failed, setFailed] = useState(false);

  // Derive the URL synchronously — routing it through state would leave a
  // render where the old errored <img> is re-committed and re-fires onError,
  // killing the retry before its request starts.
  const src = useMemo(() => {
    const params = new URLSearchParams();
    params.set('w', String(maxWidth));
    if (maxHeight) params.set('h', String(maxHeight));

    if (photoName && !photoNameFailed) {
      params.set('name', photoName);
    } else if (placeId) {
      params.set('placeId', placeId);
    }
    return `/api/google-photos?${params.toString()}`;
  }, [photoName, photoNameFailed, placeId, maxWidth, maxHeight]);

  useEffect(() => {
    setPhotoNameFailed(false);
    setFailed(false);
  }, [photoName, placeId]);

  if (failed) {
    return fallback || (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-300 text-3xl ${className}`} title="Google photo unavailable">
        📍
      </div>
    );
  }

  const imgProps = fill
    ? { fill: true, sizes: sizes || '(min-width: 768px) 320px, 100vw' }
    : { width: width || maxWidth, height: height || maxHeight || maxWidth };

  return (
    <Image
      key={src} // remount on src change — updating an errored img in place re-fires onError before the new fetch starts
      src={src}
      alt={alt}
      {...imgProps}
      className={className}
      onLoad={() => { if (onReady) onReady(); }}
      onError={() => {
        if (photoName && !photoNameFailed && placeId) {
          setPhotoNameFailed(true); // retry via placeId
        } else {
          setFailed(true);
        }
      }}
      unoptimized // Required: API returns redirect to external URL
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
    />
  );
}
