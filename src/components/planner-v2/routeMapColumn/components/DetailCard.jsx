import React from 'react';
import { getFlagForCountry } from '@/utils/countryFlags';
import { cityDisplayName, haversine } from '../lib/cityResolution.js';

/**
 * Bottom-right info panel for the selected stop. Shows nights controls,
 * a "compare leg" CTA (or "open route" on the last stop), and an "open in
 * Maps" / "copy route" footer.
 */
export default function DetailCard({
  selectedDay,
  routePoints,
  onModeChange,
  onSetCityNights,
  onCompareTransport,
}) {
  const point = selectedDay?.point || routePoints[0];
  if (!point) return null;

  const routeIndex = routePoints.findIndex((city) => city.id === point.id);
  const nextPoint = routePoints[routeIndex + 1] || null;
  const nights = Number.isFinite(point.nights) ? point.nights : null;
  const nightLabel = nights != null
    ? `${nights} ${nights === 1 ? 'night' : 'nights'}`
    : 'Flexible stay';
  const nextLegKm = nextPoint
    ? Math.round(haversine(point.lat, point.lng, nextPoint.lat, nextPoint.lng))
    : null;
  const routeNames = routePoints.map((city) => city.name).filter(Boolean);
  const routeUrl = routePoints.length > 1
    ? (() => {
        const origin = routePoints[0];
        const destination = routePoints[routePoints.length - 1];
        const waypoints = routePoints.slice(1, -1);
        const params = new URLSearchParams({
          api: '1',
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          travelmode: 'transit',
        });
        if (waypoints.length > 0) {
          params.set(
            'waypoints',
            waypoints.map((city) => `${city.lat},${city.lng}`).join('|')
          );
        }
        return `https://www.google.com/maps/dir/?${params.toString()}`;
      })()
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.name} ${point.country || ''}`)}`;

  const handleCopyRoute = () => {
    const text = routeNames.join(' -> ');
    navigator.clipboard?.writeText(text);
  };

  const handleAddNight = () => {
    if (!point?.id || !onSetCityNights) return;
    onSetCityNights(point.id, (Number.isFinite(point.nights) ? point.nights : 0) + 1);
  };

  const handleRemoveNight = () => {
    if (!point?.id || !onSetCityNights) return;
    const current = Number.isFinite(point.nights) ? point.nights : 0;
    if (current <= 0) return;
    onSetCityNights(point.id, current - 1);
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 w-[min(360px,calc(100%-2rem))] rounded-3xl border border-[#e5e0d8] bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
            {selectedDay?.label || `Stop ${routeIndex + 1}`}
            {selectedDay?.dateLabel ? ` · ${selectedDay.dateLabel}` : ''}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-[#2a2520]">
            <span className="font-sans" aria-hidden="true">
              {point.country ? `${getFlagForCountry(point.country)} ` : ''}
            </span>
            {point.name}
          </h3>
          {point.country && (
            <p className="mt-0.5 text-sm text-[#8a8578]">{point.country}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onModeChange('hidden')}
          className="shrink-0 rounded-full border border-[#e5e0d8] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a8578] hover:bg-[#faf8f5] hover:text-[#2a2520]"
        >
          Hide
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-[#faf8f5] px-2.5 py-1 text-[11px] font-semibold text-[#6a6459]">
          {nightLabel}
        </span>
        <span className="rounded-full bg-[#faf8f5] px-2.5 py-1 text-[11px] font-semibold text-[#6a6459]">
          Stop {routeIndex + 1} of {routePoints.length}
        </span>
      </div>

      {nextPoint && (
        <div className="mt-3 rounded-2xl border border-[#e5e0d8] bg-[#faf8f5] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8578]">
            Next leg
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[#2a2520]">
            {cityDisplayName(nextPoint)}
            {nextLegKm != null ? (
              <span className="font-normal text-[#8a8578]"> · approx. {nextLegKm} km</span>
            ) : null}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center overflow-hidden rounded-full border border-[#e5e0d8] bg-white">
          <button
            type="button"
            onClick={handleRemoveNight}
            disabled={!onSetCityNights || nights == null || nights <= 1}
            className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-[#6a6459] hover:bg-[#faf8f5] disabled:opacity-30"
            aria-label={`Remove a night in ${point.name}`}
          >
            -
          </button>
          <span className="min-w-[78px] border-x border-[#e5e0d8] px-3 text-center text-xs font-semibold text-[#2a2520]">
            {nightLabel}
          </span>
          <button
            type="button"
            onClick={handleAddNight}
            disabled={!onSetCityNights}
            className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-[#6a6459] hover:bg-[#faf8f5] disabled:opacity-30"
            aria-label={`Add a night in ${point.name}`}
          >
            +
          </button>
        </div>

        {nextPoint && (
          <button
            type="button"
            onClick={() => onCompareTransport?.(point, nextPoint)}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#2a2520] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a1510]"
          >
            Compare leg
          </button>
        )}
        {!nextPoint && (
          <a
            href={routeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#2a2520] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a1510]"
          >
            Open route
          </a>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-[#e5e0d8] pt-3 text-xs font-semibold text-[#6a6459]">
        <a
          href={routeUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:text-[#2a2520] hover:underline"
        >
          Open in Maps
        </a>
        <span className="text-[#d5d0c8]" aria-hidden="true">/</span>
        <button
          type="button"
          onClick={handleCopyRoute}
          className="hover:text-[#2a2520] hover:underline"
        >
          Copy route
        </button>
      </div>
    </div>
  );
}
