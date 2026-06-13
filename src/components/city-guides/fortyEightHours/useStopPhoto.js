'use client';

import { useEffect, useState } from 'react';

// Module-level cache shared across stops so each place is fetched once per
// session. Mirrors the photoSpots / neighborhoods photo hooks.
const photoCache = new Map();

function fetchStopPhoto(placeName, cityName) {
  if (!placeName) return Promise.resolve({ url: null });
  const key = `${cityName}|${placeName}`;
  if (photoCache.has(key)) return photoCache.get(key);

  const params = new URLSearchParams({ name: placeName, w: '800' });
  if (cityName) params.set('city', cityName);

  const promise = fetch(`/api/places/photo-spot?${params.toString()}`)
    .then((res) => (res.ok ? res.json() : { url: null }))
    .catch(() => ({ url: null }));

  photoCache.set(key, promise);
  return promise;
}

/** Resolve a Google Places photo for an itinerary stop by its place name. */
export function useStopPhoto(placeName, cityName) {
  const [photo, setPhoto] = useState({ url: null, attribution: null });

  useEffect(() => {
    setPhoto({ url: null, attribution: null });
    if (!placeName) return undefined;
    let cancelled = false;
    fetchStopPhoto(placeName, cityName).then((result) => {
      if (!cancelled && result?.url) {
        setPhoto({ url: result.url, attribution: result.attribution || null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [placeName, cityName]);

  return photo;
}
