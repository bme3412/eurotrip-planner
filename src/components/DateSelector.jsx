"use client";
import { useState } from "react";

const tabs = [
  { key: "dates", label: "Dates" },
  { key: "duration", label: "Duration" },
  { key: "month", label: "Month" },
];

export default function DateSelector({ onChange }) {
  const [mode, setMode] = useState("dates");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [duration, setDuration] = useState({ amount: "", unit: "days" });
  const [month, setMonth] = useState("");

  const pushChange = () => {
    if (mode === "dates") onChange?.({ mode, ...dates });
    if (mode === "duration") onChange?.({ mode, ...duration });
    if (mode === "month") onChange?.({ mode, month });
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="flex gap-2 mb-4 justify-center">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className={`tab ${mode === t.key ? "tab-active" : "bg-white/70 ring-1 ring-black/5"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {mode === "dates" && (
          <>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Start</label>
              <input
                type="date"
                className="input"
                value={dates.start || ""}
                onChange={(e) => setDates({ ...dates, start: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">End</label>
              <input
                type="date"
                className="input"
                value={dates.end || ""}
                onChange={(e) => setDates({ ...dates, end: e.target.value })}
              />
            </div>
          </>
        )}

        {mode === "duration" && (
          <>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Length</label>
              <input
                type="number"
                min="1"
                className="input"
                value={duration.amount}
                onChange={(e) => setDuration({ ...duration, amount: e.target.value })}
                placeholder="e.g. 10"
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Unit</label>
              <select
                className="input"
                value={duration.unit}
                onChange={(e) => setDuration({ ...duration, unit: e.target.value })}
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </>
        )}

        {mode === "month" && (
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Month</label>
            <input
              type="month"
              className="input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        )}

        <div className="md:col-span-1 flex items-end">
          <button onClick={pushChange} className="btn-primary w-full">Set Dates</button>
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-600 text-center">
        Tip: Choose specific dates, a duration (days/weeks/months), or a single month. We’ll match seasonal highlights, festivals, and fewer‑crowd gems.
      </p>
    </div>
  );
}

