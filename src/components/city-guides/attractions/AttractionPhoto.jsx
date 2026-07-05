'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import GooglePlacePhoto from '@/components/common/GooglePlacePhoto';
import { getTypeIcon } from './lib/display';

/**
 * AttractionPhoto — resolves the best available image for an experience.
 *
 * Priority: the curated local `image` (when present, it wins — it's
 * hand-picked and reliably bright), then a Google photo via baked `photoName`
 * / enriched `googlePhotos`, then `placeId`, then a typed emoji. A local image
 * that fails to load (404) falls through to the Google photo. Shared by
 * AttractionCard and ExperienceDetailModal so resolution stays in one place.
 */
export default function AttractionPhoto({ attraction, priority = false, sizes, className }) {
  const imgClass = className || 'object-cover object-center';
  const [localFailed, setLocalFailed] = useState(false);
  useEffect(() => { setLocalFailed(false); }, [attraction?.image]);
  const localImage = (!localFailed && attraction?.image) || null;

  // Curated local image wins — no Google overlay on cards that already have one.
  if (localImage) {
    return (
      <Image
        src={localImage}
        alt={attraction.name}
        fill
        sizes={sizes}
        className={imgClass}
        priority={priority}
        onError={() => setLocalFailed(true)}
      />
    );
  }

  // No local image → fall back to Google. Prefer a single-hop photo name (baked
  // or enriched) over the two-hop placeId; pass both so a stale photoName can
  // retry via the placeId lookup.
  const googlePhotoName = attraction?.googlePhotos?.[0]?.name || attraction?.photoName || null;
  const googlePlaceId = attraction?.googlePlaceId || null;
  const googleProps = googlePhotoName || googlePlaceId
    ? { photoName: googlePhotoName || undefined, placeId: googlePlaceId || undefined }
    : null;

  if (googleProps) {
    return (
      <GooglePlacePhoto
        {...googleProps}
        maxWidth={1024}
        alt={attraction.name}
        fill
        sizes={sizes}
        className={imgClass}
        priority={priority}
        fallback={null}
      />
    );
  }

  // Nothing → typed emoji.
  return (
    <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">
      {getTypeIcon(attraction?.type)}
    </div>
  );
}
