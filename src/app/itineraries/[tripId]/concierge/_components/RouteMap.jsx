'use client';

import { useState } from 'react';
import { Navigation, Footprints } from 'lucide-react';
import { directionsUrl, placeParam } from '@/lib/concierge/mapsLink';
import { useMapsPlatform } from '@/lib/concierge/useMapsPlatform';

/**
 * The "first leg" module. When the activity has coordinates we show a real Mapbox
 * static image pinned to it; otherwise — rather than faking a map on a blank
 * gradient — we render a clean depart-by panel with the route note. Never a
 * broken tile.
 */
export default function RouteMap({ firstActivity, departBy, routeNote, cityName }) {
  const [imgOk, setImgOk] = useState(true);
  const platform = useMapsPlatform();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const lat = firstActivity?.lat;
  const lng = firstActivity?.lng;
  const canMap = imgOk && token && Number.isFinite(lat) && Number.isFinite(lng);
  const navUrl = directionsUrl({ destination: placeParam(firstActivity, cityName), travelmode: 'transit', platform });

  if (canMap) {
    const src = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+1e63e9(${lng},${lat})/${lng},${lat},13,0/640x280@2x?access_token=${token}`;
    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Map near ${firstActivity?.name || 'your first stop'}`}
          className="h-36 w-full object-cover"
          onError={() => setImgOk(false)}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Navigation className="h-3.5 w-3.5" />
            {departBy ? `Leave by ${departBy}` : 'Your first leg'}
            {firstActivity?.name && <span className="font-normal text-white/85">· {firstActivity.name}</span>}
            {navUrl && (
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                Directions
              </a>
            )}
          </div>
          {routeNote && <p className="mt-0.5 text-[11px] leading-snug text-white/85">{routeNote}</p>}
        </div>
      </div>
    );
  }

  // No coordinates → a designed depart-by panel (not a fake map).
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
          <Footprints className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">
            {departBy ? `Leave by ${departBy}` : 'Your first leg'}
            {firstActivity?.name && <span className="font-normal text-gray-500"> · {firstActivity.name}</span>}
          </p>
          {routeNote && <p className="text-xs leading-snug text-gray-600">{routeNote}</p>}
        </div>
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:shadow"
          >
            Directions
          </a>
        )}
      </div>
    </div>
  );
}
