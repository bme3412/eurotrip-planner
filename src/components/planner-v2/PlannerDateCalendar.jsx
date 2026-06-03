'use client';

import { useMemo, useState } from 'react';

// Compact, warm-themed inline range calendar for the planner. Click a start
// day, then an end day. Past days are disabled. Nothing is pre-selected and the
// view anchors to the existing trip start (or the given month) — it never
// auto-fills a date or forces "today's month" as a selection.

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
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function isSameDay(a, b) {
  return (
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function PlannerDateCalendar({ value, onChange, minDate, initialMonth }) {
  const startDate = parseISO(value?.start);
  const endDate = parseISO(value?.end);
  const min = parseISO(minDate) || startOfToday();

  const [cursor, setCursor] = useState(() => {
    if (startDate) return startOfMonth(startDate);
    if (initialMonth) {
      const parsed = parseISO(initialMonth) || new Date(initialMonth);
      if (parsed && !Number.isNaN(parsed.getTime())) return startOfMonth(parsed);
    }
    return startOfMonth(min);
  });

  const handleSelect = (date) => {
    if (!startDate || (startDate && endDate)) {
      onChange?.({ start: toISO(date), end: '' });
      return;
    }
    // start chosen, no end yet
    if (date < startDate) onChange?.({ start: toISO(date), end: toISO(startDate) });
    else onChange?.({ start: toISO(startDate), end: toISO(date) });
  };

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const lead = first.getDay();
    const total = daysInMonth(cursor);
    const out = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= total; d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return out;
  }, [cursor]);

  const canGoBack = startOfMonth(cursor) > startOfMonth(min);

  return (
    <div className="rounded-2xl border border-[#e5e0d8] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoBack && setCursor(addMonths(cursor, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#6a6459] transition hover:bg-[#faf6eb] disabled:cursor-not-allowed disabled:text-[#d5d0c8]"
        >
          ‹
        </button>
        <span className="text-[13px] font-semibold text-[#2a2520]">{formatLabel(cursor)}</span>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, 1))}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#6a6459] transition hover:bg-[#faf6eb]"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a8a290]">
        {WEEKDAYS.map((day, i) => (
          <div key={`${day}-${i}`} className="py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="h-8" />;
          const isStart = isSameDay(d, startDate);
          const isEnd = isSameDay(d, endDate);
          const inRange = startDate && endDate && d > startDate && d < endDate;
          const isPast = d < min;
          let cls = 'text-[#4a4540] hover:bg-[#faf6eb]';
          if (isStart || isEnd) cls = 'bg-[#2a2520] text-white font-bold shadow-sm';
          else if (inRange) cls = 'bg-[#f3e7c3] text-[#2a2520]';
          else if (isPast) cls = 'text-[#dcd7cd] cursor-not-allowed';
          return (
            <button
              key={idx}
              type="button"
              disabled={isPast}
              onClick={() => !isPast && handleSelect(d)}
              className={`h-8 rounded-lg text-[13px] font-medium transition ${cls}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
