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
    <div className="w-48 sm:w-56">
      <div className="grid grid-cols-7 text-[10px] text-zinc-500 mb-1 font-medium uppercase tracking-wider">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={`${day}-${i}`} className="text-center py-0.5">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="h-7 sm:h-8" />;
          const selectedStart = isSameDay(d, start);
          const selectedEnd = isSameDay(d, end);
          const inRange = isInRange(new Date(d), start ? new Date(start) : null, end ? new Date(end) : null);
          const isPast = d < today;
          const baseCls = "h-7 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold select-none transition-all duration-200";
          const stateCls = selectedStart || selectedEnd
            ? "bg-blue-600 text-white shadow-md scale-105 z-10 cursor-pointer"
            : inRange
            ? "bg-blue-50 text-blue-700 cursor-pointer"
            : isPast
            ? "text-zinc-200 cursor-not-allowed"
            : "hover:bg-zinc-100 text-zinc-600 cursor-pointer";
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
    <div className="rounded-[2rem] border border-blue-50 bg-white p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <button type="button" className="p-2 rounded-full hover:bg-gray-100 transition-colors group" onClick={() => setCursor(addMonths(cursor, -1))}>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm font-bold text-gray-900 uppercase tracking-widest">Select Trip Dates</div>
        <button type="button" className="p-2 rounded-full hover:bg-gray-100 transition-colors group" onClick={() => setCursor(addMonths(cursor, 1))}>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-8 items-center justify-center">
        <div>
          <div className="text-center text-xs font-bold mb-3 text-blue-600 uppercase tracking-widest">{monthLabel.left}</div>
          <MonthGrid baseDate={left} start={startDate} end={endDate} onSelect={handleSelect} />
        </div>
        <div className="hidden sm:block">
          <div className="text-center text-xs font-bold mb-3 text-blue-600 uppercase tracking-widest">{monthLabel.right}</div>
          <MonthGrid baseDate={right} start={startDate} end={endDate} onSelect={handleSelect} />
        </div>
      </div>
      <div className="mt-6 pt-6 border-t border-gray-50 text-[10px] text-gray-400 font-medium text-center uppercase tracking-widest">
        Select start and end dates for your European adventure
      </div>
    </div>
  );
}


