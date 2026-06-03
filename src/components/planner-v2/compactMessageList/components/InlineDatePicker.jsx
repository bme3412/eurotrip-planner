import React, { useEffect, useState } from 'react';
import PlannerDateCalendar from '../../PlannerDateCalendar.jsx';

// ── Inline date picker (start/end + flexible month fallback) ─────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatLongDate(iso) {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InlineDatePicker({ pendingInput, currentDates, onDatesPick, onFlexibleMonth, onFlexible }) {
  const data = pendingInput?.data || {};
  const mode = data.mode || 'range';
  const minDate = todayISO();

  // Only seed from dates the traveler has already chosen — never auto-fill a
  // default/suggested date, so the picker doesn't land on "today" (e.g. June 1).
  const initialStart = currentDates?.startDate || '';
  const initialEnd = currentDates?.endDate || '';

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [flexibleOpen, setFlexibleOpen] = useState(mode === 'month' || mode === 'flexible');

  // If the picker mode changes (new pendingInput), reset the flexible toggle.
  useEffect(() => {
    setFlexibleOpen(mode === 'month' || mode === 'flexible');
  }, [mode]);

  const validRange = Boolean(start && end && end >= start);
  const nights = validRange
    ? Math.round(
        (new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) /
        (1000 * 60 * 60 * 24)
      )
    : 0;

  const handleConfirmRange = () => {
    if (!validRange) return;
    onDatesPick?.({ startDate: start, endDate: end });
  };

  const handlePickMonth = (month, year) => {
    onFlexibleMonth?.({ month, year, label: `${month} ${year}` });
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const upcomingMonths = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (currentMonth + i + 1) % 12;
    const year = currentYear + Math.floor((currentMonth + i + 1) / 12);
    return { month: MONTH_NAMES[monthIndex], year };
  });

  return (
    <div className="rounded-2xl border border-[#e5e0d8] bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
        Pick travel dates
      </p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-[#6a6459]">
        Choose your start and end, or pick a flexible month and we&apos;ll refine later.
      </p>

      <div className="mt-3">
        <PlannerDateCalendar
          value={{ start, end }}
          onChange={({ start: nextStart, end: nextEnd }) => {
            setStart(nextStart || '');
            setEnd(nextEnd || '');
          }}
          minDate={minDate}
          initialMonth={currentDates?.startDate || null}
        />
        <p className="mt-2 text-center text-[11px] text-[#8a8578]">
          {start && !end
            ? `${formatLongDate(start)} → pick an end date`
            : start && end
              ? `${formatLongDate(start)} → ${formatLongDate(end)} · ${nights}n`
              : 'Tap a start date, then an end date'}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleConfirmRange}
          disabled={!validRange}
          className="rounded-full bg-[#2a2520] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a1510] disabled:cursor-not-allowed disabled:bg-[#cdc6bc]"
        >
          {validRange
            ? `Use ${formatLongDate(start)} → ${formatLongDate(end)} · ${nights}n`
            : 'Pick start and end'}
        </button>
        <button
          type="button"
          onClick={() => setFlexibleOpen((value) => !value)}
          className="rounded-full border border-[#e5e0d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#6a6459] hover:border-[#c9a227]/40 hover:text-[#2a2520]"
        >
          {flexibleOpen ? 'Hide flexible options' : 'Flexible month instead'}
        </button>
      </div>

      {flexibleOpen && (
        <div className="mt-3 border-t border-[#f0ece3] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8578]">
            Or pick a month
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {upcomingMonths.map(({ month, year }) => (
              <button
                key={`${month}-${year}`}
                type="button"
                onClick={() => handlePickMonth(month, year)}
                className="rounded-full border border-[#e5e0d8] bg-[#faf8f5] px-2.5 py-1 text-[11px] font-semibold text-[#4a4540] hover:border-[#c9a227]/50 hover:bg-white"
              >
                {month} {year}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onFlexible?.()}
              className="rounded-full border border-dashed border-[#d5d0c8] px-2.5 py-1 text-[11px] font-semibold text-[#8a8578] hover:border-[#8a8578] hover:text-[#2a2520]"
            >
              I&apos;m fully flexible
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
