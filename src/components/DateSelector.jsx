"use client";
import { useState } from "react";

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

  const pushChange = () => {
    onChange?.({ mode: "dates", ...dates });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <div className="md:col-span-1">
          <label className="mb-1 block text-sm font-medium">Check‑in</label>
          <input
            type="date"
            className="input"
            value={dates.start || ""}
            onChange={(e) => setDates({ ...dates, start: e.target.value })}
            max={dates.end || undefined}
          />
        </div>
        <div className="md:col-span-1">
          <label className="mb-1 block text-sm font-medium">Check‑out</label>
          <input
            type="date"
            className="input"
            value={dates.end || ""}
            onChange={(e) => setDates({ ...dates, end: e.target.value })}
            min={dates.start || undefined}
          />
        </div>
        <div className="md:col-span-2 mt-1">
          <button onClick={pushChange} className="btn-primary w-full">Set Dates</button>
        </div>
      </div>

      {/* Quick presets */}
      <div className="mt-5 flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          className="tab bg-white/70 ring-1 ring-black/5 text-sm"
          onClick={() => {
            if (dates.start) {
              setDates({ ...dates, end: addDays(dates.start, 1) });
            } else {
              const start = toISODate(new Date());
              setDates({ start, end: addDays(start, 1) });
            }
          }}
        >
          +1 night
        </button>
        <button
          type="button"
          className="tab bg-white/70 ring-1 ring-black/5 text-sm"
          onClick={() => {
            if (dates.start) {
              setDates({ ...dates, end: addDays(dates.start, 2) });
            } else {
              setDates(getNextWeekendRange());
            }
          }}
        >
          Weekend
        </button>
        <button
          type="button"
          className="tab bg-white/70 ring-1 ring-black/5 text-sm"
          onClick={() => {
            if (dates.start) {
              setDates({ ...dates, end: addDays(dates.start, 7) });
            } else {
              const start = toISODate(new Date());
              setDates({ start, end: addDays(start, 7) });
            }
          }}
        >
          1 week
        </button>
        <button
          type="button"
          className="tab bg-white/70 ring-1 ring-black/5 text-sm"
          onClick={() => setDates({ start: "", end: "" })}
        >
          Clear
        </button>
      </div>

      <p className="mt-4 text-sm text-zinc-600 text-center">
        Choose your check‑in and check‑out dates to see the best time‑matched recommendations.
      </p>
    </div>
  );
}

