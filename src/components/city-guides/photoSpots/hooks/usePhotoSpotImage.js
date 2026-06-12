'use client';

import { useEffect, useState } from 'react';

// Module-level cache: each spot is fetched once per session no matter how
// many components (card + modal) ask for it. Holds the promise so concurrent
// mounts share one request.
const photoCache = new Map();

function fetchSpotPhoto(spot, cityName) {
  const key = `${cityName}|${spot.name}`;
  if (photoCache.has(key)) return photoCache.get(key);

  const params = new URLSearchParams({ name: spot.name, w: '800' });
  if (cityName) params.set('city', cityName);
  if (Number.isFinite(spot.coordinates?.lat)) params.set('lat', String(spot.coordinates.lat));
  if (Number.isFinite(spot.coordinates?.lng)) params.set('lng', String(spot.coordinates.lng));

  const promise = fetch(`/api/places/photo-spot?${params.toString()}`)
    .then((res) => (res.ok ? res.json() : { url: null }))
    .catch(() => ({ url: null }));

  photoCache.set(key, promise);
  return promise;
}

/**
 * Resolve a Google Places photo for a photo spot.
 * Returns { url, attribution } — url null while loading or when unavailable
 * (callers keep their placeholder in both cases).
 */
export function usePhotoSpotImage(spot, cityName) {
  const [photo, setPhoto] = useState({ url: null, attribution: null });

  useEffect(() => {
    // Reset so a reused mount (e.g. the modal switching spots) never shows
    // the previous spot's photo while the new one resolves.
    setPhoto({ url: null, attribution: null });
    if (!spot?.name) return undefined;
    let cancelled = false;
    fetchSpotPhoto(spot, cityName).then((result) => {
      if (!cancelled && result?.url) {
        setPhoto({ url: result.url, attribution: result.attribution || null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [spot, cityName]);

  return photo;
}
