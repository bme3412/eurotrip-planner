'use client';

import { useMemo } from 'react';
import DateRangePopover from '@/components/common/DateRangePopover';

function formatDateRange(start, end) {
  if (!start || !end) return null;
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const nights = Math.round((e - s) / (1000 * 60 * 60 * 24));
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return { nights, formatted: `${fmt(s)} – ${fmt(e)}` };
}

export default function StepBasics({ tripDates, onChangeDates }) {
  const dateInfo = useMemo(
    () => formatDateRange(tripDates.start, tripDates.end),
    [tripDates.start, tripDates.end]
  );

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-[#8a8578] text-sm font-light leading-relaxed">
          When does your journey begin and end?
        </p>
      </div>

      {/* Date picker */}
      <div className="max-w-md mx-auto">
        <DateRangePopover
          value={tripDates}
          onChange={onChangeDates}
          showSearchLabelOnSelection={false}
        />
      </div>

      {/* Summary */}
      {dateInfo && (
        <div className="text-center mt-10">
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-[#faf6eb] border border-[#e5e0d8]">
            <span
              className="text-4xl font-light text-[#a08545]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {dateInfo.nights}
            </span>
            <div className="text-left border-l border-[#e5e0d8] pl-4">
              <span className="block text-[10px] text-[#a08545] uppercase tracking-[0.2em]">nights</span>
              <span className="block text-sm text-[#6a6459] mt-0.5">{dateInfo.formatted}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
