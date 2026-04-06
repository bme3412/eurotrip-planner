'use client';

import { MapPin, Clock } from 'lucide-react';

// Colors for different cities in the progress bar
const CITY_COLORS = [
  '#4a7c59', // green
  '#5b7bb0', // blue
  '#9b6b9e', // purple
  '#c97a4d', // orange
  '#6b9b9b', // teal
];

/**
 * RemainingDaysBar - Visual indicator showing days allocation budget
 *
 * Props:
 * - totalDays: number - Total gap days available
 * - selections: Array<{ cityName, days }> - Cities already selected with their days
 * - startCityName: string - Name of anchor start city
 * - endCityName: string - Name of anchor end city
 */
export default function RemainingDaysBar({
  totalDays,
  selections = [],
  startCityName,
  endCityName,
}) {
  const allocatedDays = selections.reduce((sum, s) => sum + (s.days || 0), 0);
  const remainingDays = totalDays - allocatedDays;
  const percentage = totalDays > 0 ? (allocatedDays / totalDays) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-[#e5e0d8] p-4">
      {/* Header with counts */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#a08545]" />
          <span className="text-sm font-medium text-[#2a2520]">
            {allocatedDays} of {totalDays} days allocated
          </span>
        </div>
        <span
          className={`text-sm font-medium ${
            remainingDays === 0
              ? 'text-[#4a7c59]'
              : remainingDays < 0
              ? 'text-[#dc2626]'
              : 'text-[#a08545]'
          }`}
        >
          {remainingDays === 0
            ? 'All set!'
            : remainingDays < 0
            ? `${Math.abs(remainingDays)}d over`
            : `${remainingDays}d remaining`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-[#f5f3f0] rounded-full overflow-hidden flex">
        {selections.map((sel, i) => (
          <div
            key={sel.city || sel.cityName || i}
            className="h-full transition-all duration-300"
            style={{
              width: `${(sel.days / totalDays) * 100}%`,
              backgroundColor: CITY_COLORS[i % CITY_COLORS.length],
            }}
          />
        ))}
        {/* Remaining space indicator */}
        {remainingDays > 0 && (
          <div
            className="h-full bg-[#e5e0d8] border-l border-dashed border-[#c5c0b8]"
            style={{ width: `${(remainingDays / totalDays) * 100}%` }}
          />
        )}
      </div>

      {/* City breakdown legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
        {/* Start anchor */}
        {startCityName && (
          <div className="flex items-center gap-1.5 text-xs text-[#6a6459]">
            <MapPin className="w-3 h-3" />
            <span>{startCityName}</span>
            <span className="text-[#a08545]">→</span>
          </div>
        )}

        {/* Selected cities */}
        {selections.map((sel, i) => (
          <div key={sel.city || sel.cityName || i} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: CITY_COLORS[i % CITY_COLORS.length] }}
            />
            <span className="text-[#2a2520]">{sel.cityName}</span>
            <span className="text-[#8a8578]">{sel.days}d</span>
            {i < selections.length - 1 && (
              <span className="text-[#a08545] ml-1">→</span>
            )}
          </div>
        ))}

        {/* Open days indicator */}
        {remainingDays > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#a08545] bg-[#faf6eb]" />
            <span className="text-[#a08545] italic">{remainingDays}d open</span>
          </div>
        )}

        {/* End anchor */}
        {endCityName && (
          <div className="flex items-center gap-1.5 text-xs text-[#6a6459]">
            <span className="text-[#a08545]">→</span>
            <MapPin className="w-3 h-3" />
            <span>{endCityName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
