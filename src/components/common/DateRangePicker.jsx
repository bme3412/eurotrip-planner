"use client";

import { useMemo, useState } from "react";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
function formatLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isInRange(date, start, end) {
  if (!start || !end) return false;
  const time = date.setHours(0, 0, 0, 0);
  const s = start.setHours(0, 0, 0, 0);
  const e = end.setHours(0, 0, 0, 0);
  return time > s && time < e;
}

function MonthGrid({ baseDate, start, end, onSelect }) {
  const first = startOfMonth(baseDate);
  const firstWeekday = first.getDay(); // 0=Sun..6=Sat
  const totalDays = daysInMonth(baseDate);
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(baseDate.getFullYear(), baseDate.getMonth(), d));

  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  return (
    <div className="w-56">
      <div className="grid grid-cols-7 text-xs text-zinc-500 mb-1 font-medium">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={`${day}-${i}`} className="text-center py-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="h-8" />;
          const selectedStart = isSameDay(d, start);
          const selectedEnd = isSameDay(d, end);
          const inRange = isInRange(new Date(d), start ? new Date(start) : null, end ? new Date(end) : null);
          const isPast = d < today;
          const baseCls = "h-8 rounded-md flex items-center justify-center text-sm font-medium select-none transition-colors";
          const stateCls = selectedStart || selectedEnd
            ? "bg-indigo-600 text-white shadow-sm cursor-pointer"
            : inRange
            ? "bg-indigo-50 text-indigo-700 cursor-pointer"
            : isPast
            ? "text-zinc-300 cursor-not-allowed"
            : "hover:bg-zinc-100 text-zinc-700 cursor-pointer";
          return (
            <button
              type="button"
              key={idx}
              className={`${baseCls} ${stateCls}`}
              onClick={() => !isPast && onSelect(d)}
              disabled={isPast}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({ value, onChange, initialMonth }) {
  const startDate = parseISO(value?.start);
  const endDate = parseISO(value?.end);
  const [cursor, setCursor] = useState(() => startOfMonth(initialMonth ? new Date(initialMonth) : new Date()));

  const left = cursor;
  const right = addMonths(cursor, 1);

  const handleSelect = (date) => {
    if (!startDate || (startDate && endDate)) {
      onChange?.({ start: toISO(date), end: "" });
      return;
    }
    if (startDate && !endDate) {
      const s = startDate;
      const e = date;
      if (e < s) {
        onChange?.({ start: toISO(e), end: toISO(s) });
      } else {
        onChange?.({ start: toISO(s), end: toISO(e) });
      }
    }
  };

  const monthLabel = useMemo(() => ({ left: formatLabel(left), right: formatLabel(right) }), [left, right]);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <button type="button" className="px-2 py-1 text-sm font-medium rounded hover:bg-zinc-100 transition-colors" onClick={() => setCursor(addMonths(cursor, -1))}>
          ‹ Previous
        </button>
        <div className="text-sm text-zinc-600 font-medium">Select your travel dates</div>
        <button type="button" className="px-2 py-1 text-sm font-medium rounded hover:bg-zinc-100 transition-colors" onClick={() => setCursor(addMonths(cursor, 1))}>
          Next ›
        </button>
      </div>
      <div className="flex gap-6">
        <div className="w-56">
          <div className="text-center text-sm font-semibold mb-2 text-zinc-900">{monthLabel.left}</div>
          <MonthGrid baseDate={left} start={startDate} end={endDate} onSelect={handleSelect} />
        </div>
        <div className="w-56">
          <div className="text-center text-sm font-semibold mb-2 text-zinc-900">{monthLabel.right}</div>
          <MonthGrid baseDate={right} start={startDate} end={endDate} onSelect={handleSelect} />
        </div>
      </div>
      <div className="mt-3 text-xs text-zinc-500 text-center">Click a start date, then an end date to select your travel period</div>
    </div>
  );
}


