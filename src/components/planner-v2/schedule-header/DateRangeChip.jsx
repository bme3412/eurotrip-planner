'use client';

import { Calendar } from 'lucide-react';

/**
 * Compact inline start / end date pickers (native) for the schedule header.
 */
export default function DateRangeChip({
  startDate,
  endDate,
  onDatesChange,
  disabled = false,
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#e5e0d8] bg-white px-2.5 py-2 shadow-sm">
      <Calendar className="h-3.5 w-3.5 shrink-0 text-[#8a8578]" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="sr-only" htmlFor="trip-start-date">
          Trip start date
        </label>
        <input
          id="trip-start-date"
          type="date"
          value={startDate || ''}
          disabled={disabled}
          onChange={(e) =>
            onDatesChange?.({ startDate: e.target.value || null, endDate: endDate || null })
          }
          className="max-w-[9.5rem] rounded-md border border-[#e5e0d8] bg-[#faf8f5] px-1.5 py-1 text-[11px] text-[#2a2520] disabled:opacity-50"
        />
        <span className="text-[10px] text-[#b5b0a8]" aria-hidden="true">
          –
        </span>
        <label className="sr-only" htmlFor="trip-end-date">
          Trip end date
        </label>
        <input
          id="trip-end-date"
          type="date"
          value={endDate || ''}
          disabled={disabled}
          min={startDate || undefined}
          onChange={(e) =>
            onDatesChange?.({ startDate: startDate || null, endDate: e.target.value || null })
          }
          className="max-w-[9.5rem] rounded-md border border-[#e5e0d8] bg-[#faf8f5] px-1.5 py-1 text-[11px] text-[#2a2520] disabled:opacity-50"
        />
      </div>
    </div>
  );
}
