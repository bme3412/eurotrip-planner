'use client';

import { useState } from 'react';
import { cityGradient } from './shared';

/**
 * Real Google Place photo for an itinerary activity, resolved by name + coords
 * via /api/place-photo. Always renders a city-tinted gradient underneath, so a
 * missing key / no result / slow load degrades gracefully instead of breaking.
 */
export default function ActivityImage({ q, placeId, lat, lng, citySlug, w = 600, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false);

  // Prefer an exact place id (saved activities carry google_place_id) — it's a
  // direct, accurate photo. Otherwise resolve by name + coords.
  let src;
  if (placeId) {
    src = `/api/google-photos?placeId=${encodeURIComponent(placeId)}&w=${w}`;
  } else {
    const params = new URLSearchParams({ q: q || '', w: String(w) });
    if (typeof lat === 'number') params.set('lat', String(lat));
    if (typeof lng === 'number') params.set('lng', String(lng));
    src = `/api/place-photo?${params.toString()}`;
  }
  const hasSource = Boolean(placeId || q);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: cityGradient(citySlug) }}>
      {hasSource && !failed && (
        // Plain img: the endpoint 302-redirects to Google's CDN (not Next-optimizable).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
