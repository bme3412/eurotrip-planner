'use client';

import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

/**
 * A small "first leg" map: a Mapbox static image pinned to the first activity,
 * with the depart-by time + route note overlaid. Degrades to a tasteful panel
 * when there's no token or no coordinates — never a broken tile.
 */
export default function RouteMap({ firstActivity, departBy, routeNote }) {
  const [imgOk, setImgOk] = useState(true);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const lat = firstActivity?.lat;
  const lng = firstActivity?.lng;
  const canMap = imgOk && token && Number.isFinite(lat) && Number.isFinite(lng);

  const src = canMap
    ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+1e63e9(${lng},${lat})/${lng},${lat},13,0/640x280@2x?access_token=${token}`
    : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-blue-50 to-indigo-50">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Map near ${firstActivity?.name || 'your first stop'}`}
          className="h-36 w-full object-cover"
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center">
          <MapPin className="h-8 w-8 text-blue-300" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Navigation className="h-3.5 w-3.5" />
          {departBy ? `Leave by ${departBy}` : 'Your first leg'}
          {firstActivity?.name && <span className="font-normal text-white/85">· {firstActivity.name}</span>}
        </div>
        {routeNote && <p className="mt-0.5 text-[11px] leading-snug text-white/85">{routeNote}</p>}
      </div>
    </div>
  );
}
