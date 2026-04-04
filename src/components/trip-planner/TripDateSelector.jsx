'use client';

import { useState, useMemo } from 'react';

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
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
  return new Date(y, m - 1, d);
}

/**
 * A visual date range selector that shows only dates within the trip range.
 * Allows selecting a contiguous subset of days.
 */
export default function TripDateSelector({ tripDates, value, onChange, excludeRanges = [] }) {
  const [selecting, setSelecting] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);

  // Generate array of dates in the trip
  const tripDays = useMemo(() => {
    if (!tripDates.start || !tripDates.end) return [];

    const days = [];
    const start = parseISO(tripDates.start);
    const end = parseISO(tripDates.end);
    const current = new Date(start);

    while (current <= end) {
      days.push({
        date: new Date(current),
        iso: toISO(current),
        dayOfWeek: current.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: current.getDate(),
        month: current.toLocaleDateString('en-US', { month: 'short' }),
        isFirstOfMonth: current.getDate() === 1,
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [tripDates.start, tripDates.end]);

  // Check if a date is in an excluded range (already used by another anchor)
  const isExcluded = (iso) => {
    return excludeRanges.some(range => {
      const date = parseISO(iso);
      const start = parseISO(range.start);
      const end = parseISO(range.end);
      return date >= start && date < end;
    });
  };

  // Selection state
  const startDate = value?.start ? parseISO(value.start) : null;
  const endDate = value?.end ? parseISO(value.end) : null;

  const isSelected = (iso) => {
    if (!startDate) return false;
    const date = parseISO(iso);
    if (!endDate) return date.getTime() === startDate.getTime();
    return date >= startDate && date <= endDate;
  };

  const isInPreview = (iso) => {
    if (!selecting || !startDate || !hoverDate) return false;
    const date = parseISO(iso);
    const hover = parseISO(hoverDate);
    const start = startDate < hover ? startDate : hover;
    const end = startDate < hover ? hover : startDate;
    return date >= start && date <= end;
  };

  const handleDayClick = (day) => {
    if (isExcluded(day.iso)) return;

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onChange({ start: day.iso, end: '' });
      setSelecting(true);
    } else if (startDate && !endDate) {
      // Complete selection
      const clickedDate = parseISO(day.iso);
      if (clickedDate < startDate) {
        onChange({ start: day.iso, end: value.start });
      } else {
        onChange({ start: value.start, end: day.iso });
      }
      setSelecting(false);
    }
  };

  const handleMouseEnter = (day) => {
    if (selecting) {
      setHoverDate(day.iso);
    }
  };

  // Calculate nights
  const nights = useMemo(() => {
    if (!value?.start || !value?.end) return 0;
    const start = parseISO(value.start);
    const end = parseISO(value.end);
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  }, [value?.start, value?.end]);

  if (tripDays.length === 0) {
    return (
      <div className="text-center py-4 text-[#8a8578] text-sm">
        Set your trip dates first
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected range display */}
      {value?.start && (
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-[#2a2520]">
            <span className="font-medium">{formatShortDate(value.start)}</span>
            {value.end && (
              <>
                <span className="text-[#8a8578] mx-2">→</span>
                <span className="font-medium">{formatShortDate(value.end)}</span>
              </>
            )}
          </div>
          {nights > 0 && (
            <div className="text-xs text-[#a08545] font-medium">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </div>
          )}
        </div>
      )}

      {/* Day grid */}
      <div className="flex flex-wrap gap-1.5">
        {tripDays.map((day, idx) => {
          const excluded = isExcluded(day.iso);
          const selected = isSelected(day.iso);
          const preview = isInPreview(day.iso);
          const isStart = value?.start === day.iso;
          const isEnd = value?.end === day.iso;

          return (
            <button
              key={day.iso}
              type="button"
              disabled={excluded}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => handleMouseEnter(day)}
              className={`
                relative flex flex-col items-center justify-center
                w-12 h-14 rounded-lg border transition-all duration-150
                ${excluded
                  ? 'bg-[#f5f0e8] border-[#e5e0d8] text-[#c5c0b8] cursor-not-allowed'
                  : selected
                    ? 'bg-[#c9a227] border-[#a08545] text-white'
                    : preview
                      ? 'bg-[#faf6eb] border-[#c9a227]/50 text-[#2a2520]'
                      : 'bg-white border-[#e5e0d8] text-[#2a2520] hover:border-[#c9a227]/50 hover:bg-[#faf8f5]'
                }
                ${isStart ? 'ring-2 ring-[#a08545] ring-offset-1' : ''}
                ${isEnd ? 'ring-2 ring-[#a08545] ring-offset-1' : ''}
              `}
            >
              <span className={`text-[9px] uppercase tracking-wide ${selected ? 'text-white/80' : 'text-[#8a8578]'}`}>
                {day.dayOfWeek}
              </span>
              <span className="text-base font-medium leading-tight">
                {day.dayNum}
              </span>
              {(day.isFirstOfMonth || idx === 0) && (
                <span className={`text-[8px] uppercase ${selected ? 'text-white/70' : 'text-[#a5a098]'}`}>
                  {day.month}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <p className="text-xs text-[#8a8578] text-center">
        {!value?.start
          ? 'Click to select start date'
          : !value?.end
            ? 'Click to select end date'
            : 'Click any day to reselect'
        }
      </p>
    </div>
  );
}
