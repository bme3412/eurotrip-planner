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

  return (
    <div className="w-64">
      <div className="grid grid-cols-7 text-[10px] text-zinc-500 mb-1">
        {"SMTWTFS".split("").map((c, i) => (
          <div key={`${c}-${i}`} className="text-center py-1">{c}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="h-8" />;
          const selectedStart = isSameDay(d, start);
          const selectedEnd = isSameDay(d, end);
          const inRange = isInRange(new Date(d), start ? new Date(start) : null, end ? new Date(end) : null);
          const baseCls = "h-8 rounded-md flex items-center justify-center text-sm cursor-pointer select-none";
          const stateCls = selectedStart || selectedEnd
            ? "bg-indigo-600 text-white"
            : inRange
            ? "bg-indigo-50 text-indigo-700"
            : "hover:bg-zinc-100";
          return (
            <button
              type="button"
              key={idx}
              className={`${baseCls} ${stateCls}`}
              onClick={() => onSelect(d)}
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
    <div className="rounded-xl border border-black/10 bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="px-2 py-1 text-sm rounded hover:bg-zinc-100" onClick={() => setCursor(addMonths(cursor, -1))}>
          ‹ Prev
        </button>
        <div className="text-xs text-zinc-500">Select a start date, then an end date</div>
        <button type="button" className="px-2 py-1 text-sm rounded hover:bg-zinc-100" onClick={() => setCursor(addMonths(cursor, 1))}>
          Next ›
        </button>
      </div>
      <div className="flex gap-8">
        <div className="w-64">
          <div className="text-center text-sm font-semibold mb-2">{monthLabel.left}</div>
          <MonthGrid baseDate={left} start={startDate} end={endDate} onSelect={handleSelect} />
        </div>
        <div className="w-64">
          <div className="text-center text-sm font-semibold mb-2">{monthLabel.right}</div>
          <MonthGrid baseDate={right} start={startDate} end={endDate} onSelect={handleSelect} />
        </div>
      </div>
      <div className="mt-3 text-xs text-zinc-600">Use arrows to change months.</div>
    </div>
  );
}


