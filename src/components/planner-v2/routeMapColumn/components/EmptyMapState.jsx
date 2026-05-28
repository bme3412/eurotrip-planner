import React from 'react';

/**
 * Placeholder shown when the trip has no confirmed or preview stops yet.
 * Uses dashed circles + lines to suggest "your map will appear here".
 */
export default function EmptyMapState() {
  return (
    <div className="relative flex h-full min-h-[320px] items-center justify-center overflow-hidden bg-[#f7f3ec] p-8">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-[12%] top-[18%] h-24 w-24 rounded-full border border-[#e5e0d8]" />
        <div className="absolute right-[16%] top-[28%] h-16 w-16 rounded-full border border-[#e5e0d8]" />
        <div className="absolute bottom-[18%] left-[30%] h-20 w-20 rounded-full border border-[#e5e0d8]" />
        <div className="absolute left-[20%] right-[20%] top-1/2 border-t border-dashed border-[#d5d0c8]" />
      </div>
      <div className="relative max-w-sm rounded-3xl border border-[#e5e0d8] bg-white/85 p-5 text-center shadow-sm backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a8578]">
          Itinerary map
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold text-[#2a2520]">
          Your route becomes a day-by-day map.
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6a6459]">
          Add a city, paste a flight, or describe a route. Days, pins, and route details
          will appear here as the plan takes shape.
        </p>
      </div>
    </div>
  );
}
