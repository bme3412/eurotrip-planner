'use client';

/**
 * Legend swatch row for the trip schedule strip.
 * Renders one dot + label per assigned city, plus an "Unassigned" pill
 * if any gap days exist.
 */
export default function Legend({ cities = [], hasGaps = false }) {
  if (cities.length === 0 && !hasGaps) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-[#8a8578]">
      {cities.map((c) => (
        <span key={c.id || c.name} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: c.color || '#2a2520' }}
            aria-hidden="true"
          />
          <span className="font-medium text-[#6a6459] normal-case tracking-normal">
            {c.name}
          </span>
        </span>
      ))}
      {hasGaps && (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full border border-dashed border-[#b5b0a8]"
            aria-hidden="true"
          />
          <span className="font-medium text-[#8a8578] normal-case tracking-normal">
            Unassigned
          </span>
        </span>
      )}
    </div>
  );
}
