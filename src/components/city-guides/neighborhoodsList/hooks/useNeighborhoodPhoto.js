'use client';

import { useEffect, useState } from 'react';

// Module-level cache: each neighborhood is fetched once per session no matter
// how many components ask for it. Holds the promise so concurrent mounts share
// one request. Mirrors photoSpots/hooks/usePhotoSpotImage.
const photoCache = new Map();

/**
 * Query Google Places by the neighborhood name itself (the API route appends
 * the city, so the search resolves to e.g. "Le Marais, Paris"). This favours
 * district/street-level imagery over a single headline monument.
 */
function photoQuery(neighborhood) {
  return neighborhood?.name || '';
}

function fetchNeighborhoodPhoto(neighborhood, cityName) {
  const query = photoQuery(neighborhood);
  if (!query) return Promise.resolve({ url: null });

  const key = `${cityName}|${query}`;
  if (photoCache.has(key)) return photoCache.get(key);

  const params = new URLSearchParams({ name: query, w: '800' });
  if (cityName) params.set('city', cityName);

  const promise = fetch(`/api/places/photo-spot?${params.toString()}`)
    .then((res) => (res.ok ? res.json() : { url: null }))
    .catch(() => ({ url: null }));

  photoCache.set(key, promise);
  return promise;
}

/**
 * Resolve a Google Places photo for a neighborhood.
 * Returns { url, attribution } — url null while loading or unavailable (callers
 * keep their gradient placeholder in both cases).
 */
export function useNeighborhoodPhoto(neighborhood, cityName) {
  const [photo, setPhoto] = useState({ url: null, attribution: null });

  useEffect(() => {
    setPhoto({ url: null, attribution: null });
    if (!neighborhood?.name) return undefined;
    let cancelled = false;
    fetchNeighborhoodPhoto(neighborhood, cityName).then((result) => {
      if (!cancelled && result?.url) {
        setPhoto({ url: result.url, attribution: result.attribution || null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [neighborhood, cityName]);

  return photo;
}
