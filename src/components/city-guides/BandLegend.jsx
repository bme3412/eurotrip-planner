import React from 'react';
import { VISIT_BANDS, BAND_ORDER } from './visitBands';

/**
 * Shared visit-quality legend. Swatches show the actual tinted cell colour so
 * the legend looks like the calendar it explains.
 */
export default function BandLegend({ showEventHint = true, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      {BAND_ORDER.map((rating) => {
        const band = VISIT_BANDS[rating];
        return (
          <span key={rating} className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded ring-1 ring-black/5"
              style={{ backgroundColor: band.dot }}
            />
            <span className="text-[11px] font-medium text-gray-600">{band.label}</span>
          </span>
        );
      })}
      {showEventHint && (
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[11px] text-gray-500">Event</span>
        </span>
      )}
    </div>
  );
}
