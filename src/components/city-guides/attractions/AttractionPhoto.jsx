'use client';

import React from 'react';
import Image from 'next/image';
import GooglePlacePhoto from '@/components/common/GooglePlacePhoto';
import { getTypeIcon } from './lib/display';

/**
 * AttractionPhoto — resolves the best available image for an experience:
 * Google photo by `photoName`, then by `placeId`, then the JSON-supplied
 * `image`, then a typed emoji fallback. Shared by AttractionCard and
 * ExperienceDetailModal so photo resolution stays in one place.
 */
export default function AttractionPhoto({ attraction, priority = false, sizes, className }) {
  const imgClass = className || 'object-cover object-center';

  if (attraction?.googlePhotos?.[0]?.name) {
    return (
      <GooglePlacePhoto
        photoName={attraction.googlePhotos[0].name}
        maxWidth={1024}
        alt={attraction.name}
        fill
        sizes={sizes}
        className={imgClass}
        priority={priority}
        fallback={attraction.image ? (
          <Image src={attraction.image} alt={attraction.name} fill sizes={sizes} className="object-cover object-center" />
        ) : null}
      />
    );
  }
  if (attraction?.googlePlaceId) {
    return (
      <GooglePlacePhoto
        placeId={attraction.googlePlaceId}
        maxWidth={1024}
        alt={attraction.name}
        fill
        sizes={sizes}
        className={imgClass}
        priority={priority}
        fallback={attraction.image ? (
          <Image src={attraction.image} alt={attraction.name} fill sizes={sizes} className="object-cover object-center" />
        ) : null}
      />
    );
  }
  if (attraction?.image) {
    return (
      <Image src={attraction.image} alt={attraction.name} fill sizes={sizes} className={imgClass} />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">
      {getTypeIcon(attraction?.type)}
    </div>
  );
}
