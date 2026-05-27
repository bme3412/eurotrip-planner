'use client';

import { Minus, Plus, MapPin } from 'lucide-react';
import { getFlagForCountry } from '@/utils/countryFlags';

/**
 * Single-row segment bar: one segment per trip day; this city's days filled
 * with `color`, others neutral grey. Clicking a segment focuses that day in
 * the main strip.
 */
function PositionBar({ days, cityId, color, onDayFocus }) {
  if (!days || days.length === 0) return null;

  return (
    <div
      className="mt-2 flex h-2 w-full max-w-full gap-px overflow-hidden rounded-full bg-[#e5e0d8]"
      role="presentation"
    >
      {days.map((day) => {
        const isMine = day.cityId === cityId;
        return (
          <button
            key={day.dayIndex}
            type="button"
            onClick={() => onDayFocus?.(day.dayIndex)}
            className="min-w-0 flex-1 rounded-[1px] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#c9a227] focus:ring-offset-1"
            style={{
              backgroundColor: isMine ? color || '#2a2520' : '#f0ebe4',
            }}
            title={`Day ${day.dayIndex + 1}`}
            aria-label={`Focus day ${day.dayIndex + 1} in schedule`}
          />
        );
      })}
    </div>
  );
}

/**
 * Compact city card: role, name, nights steppers, and a slim trip timeline bar.
 */
export default function CityScheduleCard({
  city,
  days = [],
  color,
  onIncrementNights,
  onDecrementNights,
  onDayFocus,
  dateRange,
}) {
  if (!city) return null;
  const nights = Number.isFinite(city.nights) ? city.nights : 0;
  const cityKey = city.id || city.name?.toLowerCase();

  return (
    <div className="flex h-[92px] w-[148px] shrink-0 flex-col rounded-xl border border-[#e5e0d8] bg-white px-2.5 py-2 shadow-sm">
      <div className="flex min-h-0 flex-1 items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-[#8a8578]">
            {city.role === 'start'
              ? 'Start'
              : city.role === 'end'
                ? 'End'
                : 'Stop'}
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            <MapPin
              className="h-3 w-3 shrink-0"
              style={{ color: color || '#2a2520' }}
              aria-hidden="true"
            />
            <h3 className="truncate font-display text-[13px] leading-tight text-[#2a2520]">
              {city.country && (
                <span className="mr-1 font-sans" aria-hidden="true">
                  {getFlagForCountry(city.country)}
                </span>
              )}
              {city.name}
            </h3>
          </div>
          {city.country && (
            <p className="truncate text-[9px] text-[#8a8578]">{city.country}</p>
          )}
          {dateRange && (
            <p className="mt-0.5 truncate text-[9px] font-medium text-[#6a6459]">
              {dateRange}
            </p>
          )}
        </div>

        {(onIncrementNights || onDecrementNights) && (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => onIncrementNights?.(city)}
              className="flex h-5 w-5 items-center justify-center rounded border border-[#e5e0d8] text-[#8a8578] hover:bg-[#f5f0e8]"
              aria-label={`Add a night in ${city.name}`}
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
            <span className="text-[10px] font-medium tabular-nums text-[#2a2520]">
              {nights}n
            </span>
            <button
              type="button"
              onClick={() => onDecrementNights?.(city)}
              disabled={nights <= 0}
              className="flex h-5 w-5 items-center justify-center rounded border border-[#e5e0d8] text-[#8a8578] hover:bg-[#f5f0e8] disabled:opacity-30"
              aria-label={`Remove a night in ${city.name}`}
            >
              <Minus className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      <PositionBar
        days={days}
        cityId={cityKey}
        color={color}
        onDayFocus={onDayFocus}
      />
    </div>
  );
}
