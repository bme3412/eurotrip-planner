'use client';

import React from 'react';
import Link from 'next/link';

/**
 * "Where to base your days after you choose dates" — a 4-card grid of
 * neighborhood recommendations bucketed by season, plus a CTA to the
 * planner.
 */
export default function SeasonalNeighborhoods({ cityName, seasonalNeighborhoods }) {
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
        {seasonalNeighborhoods.map((item) => (
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
