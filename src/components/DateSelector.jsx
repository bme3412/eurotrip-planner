"use client";
import { useEffect, useState } from "react";
import DateRangePopover from "./common/DateRangePopover";

export default function DateSelector({ onChange }) {
  const [dates, setDates] = useState({ start: "", end: "" });

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDays(iso, days) {
    const base = iso ? new Date(iso) : new Date();
    const copy = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    copy.setDate(copy.getDate() + Number(days));
    return toISODate(copy);
  }

  function getNextWeekendRange() {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun..6=Sat
    const daysUntilFri = (5 - dow + 7) % 7; // Friday = 5
    const fri = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFri);
    const start = toISODate(fri);
    const end = toISODate(new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 2)); // checkout Sunday
    return { start, end };
  }

  // Handle date changes
  const handleDateChange = (newDates) => {
    setDates(newDates);
    if (newDates && newDates.start && newDates.end) {
      onChange?.({ mode: "dates", ...newDates });
    }
  };

  // Auto-propagate when both start and end are selected
  useEffect(() => {
    if (dates && dates.start && dates.end) {
      onChange?.({ mode: "dates", ...dates });
    }
  }, [dates, onChange]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <DateRangePopover value={dates} onChange={handleDateChange} />
      {/* Add a bit more white space before CTAs */}
      <div className="h-3" />
    </div>
  );
}

