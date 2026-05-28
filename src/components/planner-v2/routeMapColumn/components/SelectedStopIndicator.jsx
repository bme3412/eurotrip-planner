import React from 'react';
import { cityDisplayName } from '../lib/cityResolution.js';

/**
 * Top-left badge identifying the currently selected day/city. Hides itself
 * when no day is selected.
 */
export default function SelectedStopIndicator({ selectedDay }) {
  if (!selectedDay?.point) return null;
  return (
    <div className="absolute left-3 top-3 z-20 max-w-[min(360px,calc(100%-1.5rem))] rounded-full border border-[#e5e0d8] bg-white/90 px-3 py-2 text-xs font-semibold text-[#2a2520] shadow-sm backdrop-blur">
      <span className="text-[#8a8578]">
        {selectedDay.label}
        {selectedDay.dateLabel ? ` · ${selectedDay.dateLabel}` : ''}
      </span>
      <span className="mx-1.5 text-[#d5d0c8]" aria-hidden="true">
        /
      </span>
      <span>{cityDisplayName(selectedDay.point)}</span>
    </div>
  );
}
