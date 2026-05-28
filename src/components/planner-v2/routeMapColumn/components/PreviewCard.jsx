import React from 'react';
import { cityDisplayName } from '../lib/cityResolution.js';

/**
 * Bottom-right card listing un-committed preview suggestions from the current
 * interaction. Renders nothing when there are no preview points.
 */
export default function PreviewCard({ previewPoints }) {
  if (previewPoints.length === 0) return null;
  return (
    <div className="absolute bottom-4 right-4 z-20 w-[min(340px,calc(100%-2rem))] rounded-3xl border border-dashed border-[#c9a227]/60 bg-white/95 p-4 shadow-xl backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
        Preview suggestions
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#4a4540]">
        These stops are options from the current interaction. They are not committed until you pick one.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {previewPoints.map((point) => (
          <span
            key={point.id}
            className="rounded-full border border-[#e5e0d8] bg-[#faf8f5] px-2.5 py-1 text-[11px] font-semibold text-[#2a2520]"
          >
            {cityDisplayName(point)}
          </span>
        ))}
      </div>
    </div>
  );
}
