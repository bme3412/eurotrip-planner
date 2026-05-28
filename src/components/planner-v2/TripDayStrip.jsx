'use client';

import { useMemo, useState } from 'react';
import TripDayCard from './TripDayCard';
import { cityKey } from '@/lib/planning/cityColors';

/**
 * Horizontal-scroll day strip rendered in the top header row of `/plan`,
 * inline next to the Describe / Step by step toggle. One card per trip day.
 *
 * Renders nothing when there's no trip yet.
 */
export default function TripDayStrip({
  days,
  cities,
  tripDates,
  onSetCityNights,
  onSetTripDates,
}) {
  const [openIndex, setOpenIndex] = useState(null);

  const cityById = useMemo(() => {
    const map = new Map();
    (cities || []).forEach((c) => {
      const key = cityKey(c);
      if (key) map.set(key, c);
    });
    return map;
  }, [cities]);

  if (!Array.isArray(days) || days.length === 0) return null;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
        {days.map((day) => {
          const city = day.cityId ? cityById.get(day.cityId) : null;
          const nights = Number.isFinite(city?.nights) ? city.nights : 0;
          const isOpen = openIndex === day.dayIndex;
          return (
            <TripDayCard
              key={day.dayIndex}
              day={day}
              city={city}
              nightsForCity={nights}
              tripDates={tripDates}
              isExpanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : day.dayIndex)}
              onClose={() => setOpenIndex(null)}
              onSetCityNights={onSetCityNights}
              onSetTripDates={onSetTripDates}
            />
          );
        })}
      </div>
    </div>
  );
}
