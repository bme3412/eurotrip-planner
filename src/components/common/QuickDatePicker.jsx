"use client";

import { useMemo } from "react";
import DateRangePicker from "./DateRangePicker";

// ─── Date Utilities ────────────────────────────────────────────────────────

function formatShort(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function QuickDatePicker({ value, onChange, className = "" }) {
  // Format selected dates for display
  const selectedDisplay = useMemo(() => {
    if (!value?.start || !value?.end) return null;
    return `${formatShort(value.start)} – ${formatShort(value.end)}`;
  }, [value]);

  const handlePickerChange = (next) => {
    if (next.start && next.end) {
      onChange?.({ mode: "dates", ...next });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Selected dates display */}
      {selectedDisplay && (
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {selectedDisplay}
          </span>
        </div>
      )}

      {/* Date range picker inline */}
      <DateRangePicker value={value || { start: "", end: "" }} onChange={handlePickerChange} />
    </div>
  );
}
