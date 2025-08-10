"use client";
import { useState } from "react";

const tabs = [
  { key: "exact", label: "Exact dates" },
  { key: "range", label: "Date range" },
  { key: "month", label: "Month" },
];

export default function DateSelector({ onChange }) {
  const [mode, setMode] = useState("exact");
  const [exact, setExact] = useState({ start: "", end: "" });
  const [range, setRange] = useState({ start: "", end: "" });
  const [month, setMonth] = useState("");

  const pushChange = () => {
    if (mode === "exact") onChange?.({ mode, ...exact });
    if (mode === "range") onChange?.({ mode, ...range });
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
        {mode !== "month" && (
          <>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">Start</label>
              <input
                type="date"
                className="input"
                value={(mode === "exact" ? exact.start : range.start) || ""}
                onChange={(e) =>
                  mode === "exact"
                    ? setExact({ ...exact, start: e.target.value })
                    : setRange({ ...range, start: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium">End</label>
              <input
                type="date"
                className="input"
                value={(mode === "exact" ? exact.end : range.end) || ""}
                onChange={(e) =>
                  mode === "exact"
                    ? setExact({ ...exact, end: e.target.value })
                    : setRange({ ...range, end: e.target.value })
                }
              />
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
        Tip: You can choose exact dates, a flexible range, or a single month. We’ll match seasonal highlights, festivals, and fewer‑crowd gems.
      </p>
    </div>
  );
}

