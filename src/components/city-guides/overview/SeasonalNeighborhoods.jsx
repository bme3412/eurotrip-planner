'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCityDataUrl, getCityPaths } from '@/lib/city-data';

const DEFAULT_SEASONAL_NEIGHBORHOODS = [
  { season: 'Spring', neighborhood: 'Historic center', reason: 'best balance of walking weather and classic sights' },
  { season: 'Summer', neighborhood: 'Parks + waterfront areas', reason: 'long evenings and outdoor dining' },
  { season: 'Fall', neighborhood: 'Museum districts', reason: 'culture-heavy days when weather turns mixed' },
  { season: 'Winter', neighborhood: 'Old town + covered markets', reason: 'cozy indoor stops and seasonal food' },
];

/**
 * "Where to base your days after you choose dates" — a 4-card grid of
 * neighborhood recommendations bucketed by season, plus a CTA to the
 * planner. Reads `seasonalNeighborhoods` from the same
 * `seasonal-prose.json` file SeasonalProse uses (HTTP cache dedupes the
 * request).
 */
export default function SeasonalNeighborhoods({ cityName, country }) {
  const [items, setItems] = useState(DEFAULT_SEASONAL_NEIGHBORHOODS);

  useEffect(() => {
    if (!cityName) return;
    let cancelled = false;
    const { seasonalProse } = getCityPaths(country, cityName);
    fetchCityDataUrl(seasonalProse, { cache: 'force-cache' })
      .then((json) => {
        if (!cancelled && Array.isArray(json?.seasonalNeighborhoods) && json.seasonalNeighborhoods.length) {
          setItems(json.seasonalNeighborhoods);
        }
      })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, [cityName, country]);

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Neighborhood by season
          </p>
          <h3 className="text-xl font-bold text-gray-900">
            Where to base your days after you choose dates
          </h3>
        </div>
        <Link
          href={`/plan/${encodeURIComponent(cityName?.toLowerCase() || 'paris')}`}
          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Turn this into a trip
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.season} className="rounded-lg bg-white p-4 ring-1 ring-gray-200">
            <div className="text-sm font-semibold text-blue-700">{item.season}</div>
            <div className="mt-1 font-bold text-gray-900">{item.neighborhood}</div>
            <p className="mt-2 text-sm leading-snug text-gray-600">{item.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
