'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const TripMap = dynamic(
  () => import('@/components/trip-planner/TripMap'),
  { ssr: false, loading: () => <div className="flex-1 bg-slate-100 animate-pulse" /> }
);

// Simple haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RouteMapColumn({ trip }) {
  // Build itinerary for TripMap
  const itinerary = useMemo(() => {
    const items = [];
    if (trip.startCity) {
      items.push({
        type: 'anchor',
        city: trip.startCity.id,
        cityName: trip.startCity.name,
        country: trip.startCity.country,
      });
    }
    if (trip.stops) {
      trip.stops.forEach(stop => {
        items.push({
          type: 'gap-filled',
          city: stop.id,
          cityName: stop.name,
          country: stop.country,
        });
      });
    }
    if (trip.endCity && trip.endCity.id !== trip.startCity?.id) {
      items.push({
        type: 'anchor',
        city: trip.endCity.id,
        cityName: trip.endCity.name,
        country: trip.endCity.country,
      });
    }
    return items;
  }, [trip.startCity, trip.stops, trip.endCity]);

  // Route stats from city coordinates
  const stats = useMemo(() => {
    if (itinerary.length < 2) return null;

    // Use cities.json lookup for coordinates
    let totalKm = 0;
    try {
      const citiesData = require('@/generated/cities.json');
      const lookup = new Map(citiesData.map(c => [c.id, c]));

      for (let i = 0; i < itinerary.length - 1; i++) {
        const from = lookup.get(itinerary[i].city);
        const to = lookup.get(itinerary[i + 1].city);
        if (from?.latitude && to?.latitude) {
          totalKm += haversine(from.latitude, from.longitude, to.latitude, to.longitude);
        }
      }
    } catch {
      return null;
    }

    if (totalKm === 0) return null;

    // Estimate transit time (avg 100 km/h by rail)
    const transitHours = totalKm / 100;
    const transitLabel = transitHours >= 1
      ? `${Math.round(transitHours)}h`
      : `${Math.round(transitHours * 60)}m`;

    // CO2 estimate: ~6g/km/passenger for rail
    const co2Kg = (totalKm * 6) / 1000;
    const co2Label = co2Kg >= 1
      ? `${co2Kg.toFixed(1)} kg`
      : `${Math.round(co2Kg * 1000)} g`;

    return {
      distance: `${Math.round(totalKm)} km`,
      transit: transitLabel,
      co2: co2Label,
    };
  }, [itinerary]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Thin top border — no label needed */}
      <div className="border-b border-slate-200 shrink-0" />

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <TripMap itinerary={itinerary} className="h-full" />
      </div>

      {/* Stats footer */}
      {stats && (
        <div className="px-4 py-3 border-t border-slate-200 shrink-0">
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Total distance</span>
              <span className="text-slate-700 font-medium tabular-nums">{stats.distance}</span>
            </div>
            <div className="flex justify-between">
              <span>Transit time</span>
              <span className="text-slate-700 font-medium tabular-nums">{stats.transit}</span>
            </div>
            <div className="flex justify-between">
              <span>CO&#x2082; (rail)</span>
              <span className="text-slate-700 font-medium tabular-nums">{stats.co2}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[9px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px bg-slate-600" /> Planned route
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dashed border-slate-400" /> Alternate
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
