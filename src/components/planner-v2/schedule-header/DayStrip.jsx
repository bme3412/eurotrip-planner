'use client';

import { useCallback, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { parseIsoDate } from '@/lib/conversation/dayAssignments';

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return null;
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatChipDate(value) {
  const d = parseIsoDate(value);
  if (!d) return null;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function DayChip({
  day,
  cityColor,
  isSelected,
  isFocused,
  onClick,
  registerRef,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (registerRef) registerRef(day.dayIndex, ref.current);
  }, [day.dayIndex, registerRef]);

  const dow = day.date ? DOW_SHORT[parseIsoDate(day.date).getDay()] : null;
  const dateLabel = formatChipDate(day.date);
  const isAssigned = !!day.cityId;
  const tint = !isSelected && isAssigned && cityColor
    ? hexToRgba(cityColor, 0.14)
    : null;

  const baseCls =
    'group relative flex min-h-[76px] min-w-[88px] flex-col items-stretch rounded-xl border px-2 py-2 text-left shrink-0 transition-all';
  let stateCls = '';
  if (isSelected) {
    stateCls = 'border-[#2a2520] bg-[#2a2520] text-white shadow-md';
  } else if (isAssigned) {
    stateCls = 'border-[#e5e0d8] text-[#2a2520] hover:border-[#b5b0a8]';
  } else {
    stateCls =
      'border-dashed border-[#d5d0c8] bg-[#faf8f5] text-[#8a8578] hover:border-[#b5b0a8] hover:bg-white';
  }
  if (isFocused) stateCls += ' ring-2 ring-blue-400';

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`${baseCls} ${stateCls}`}
      style={tint && !isSelected ? { backgroundColor: tint } : undefined}
      aria-pressed={isSelected}
      aria-label={
        isAssigned
          ? `Day ${day.dayIndex + 1} in ${day.cityName}`
          : `Day ${day.dayIndex + 1}, unassigned`
      }
    >
      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider opacity-70">
        <span>Day {day.dayIndex + 1}</span>
        {dow && <span>{dow}</span>}
      </div>
      <div className="mt-1 text-[11px] font-semibold tabular-nums">
        {dateLabel || '—'}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            backgroundColor: isAssigned ? cityColor || '#2a2520' : 'transparent',
            border: isAssigned ? 'none' : '1px dashed #b5b0a8',
          }}
          aria-hidden="true"
        />
        <span
          className={`truncate text-[10px] ${
            isSelected ? 'text-white/90' : isAssigned ? 'text-[#6a6459]' : 'text-[#a5a098]'
          }`}
        >
          {day.cityName || 'Free'}
        </span>
      </div>
    </button>
  );
}

/**
 * Inline toolbar below the title row when days are selected (no floating popover).
 */
function AssignToolbar({
  selectionCount,
  cities = [],
  cityColors = {},
  onAssign,
  onUnassign,
  onCancel,
}) {
  return (
    <div
      role="region"
      aria-label="Assign selected days"
      className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#e5e0d8] bg-white px-2.5 py-2 shadow-sm"
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8a8578]">
        {selectionCount} {selectionCount === 1 ? 'day' : 'days'} selected
      </span>
      <span className="text-[#e5e0d8]" aria-hidden="true">
        |
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {cities.map((c) => {
          const id = c.id || c.name?.toLowerCase();
          const color = cityColors[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onAssign(id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e0d8] px-2.5 py-1 text-[11px] text-[#2a2520] hover:bg-[#f5f0e8]"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color || '#2a2520' }}
                aria-hidden="true"
              />
              {c.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onUnassign}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#d5d0c8] px-2.5 py-1 text-[11px] text-[#8a8578] hover:bg-[#f5f0e8]"
        >
          <X className="h-3 w-3" /> Make free
        </button>
        <button
          type="button"
          onClick={() => onAssign('__new__')}
          className="inline-flex items-center gap-1 rounded-full border border-[#2a2520] bg-[#2a2520] px-2.5 py-1 text-[11px] text-white hover:bg-[#1a1510]"
        >
          <Plus className="h-3 w-3" /> New city
        </button>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="ml-auto text-[10px] uppercase tracking-[0.1em] text-[#8a8578] hover:text-[#2a2520]"
      >
        Cancel
      </button>
    </div>
  );
}

export default function DayStrip({
  days = [],
  cityColors = {},
  cities = [],
  selectedSet,
  selectionCount = 0,
  selectedIndices = [],
  onToggleDay,
  onClearSelection,
  onAssignSelectionToCity,
  onUnassignSelection,
  focusedDayIndex = null,
}) {
  const chipRefs = useRef(new Map());
  const scrollerRef = useRef(null);

  // Stable identity so DayChip's registration effect doesn't re-fire every
  // time DayStrip renders.
  const registerRef = useCallback((idx, el) => {
    if (el) chipRefs.current.set(idx, el);
    else chipRefs.current.delete(idx);
  }, []);

  useEffect(() => {
    if (focusedDayIndex == null) return;
    const el = chipRefs.current.get(focusedDayIndex);
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [focusedDayIndex]);

  if (days.length === 0) return null;

  return (
    <div>
      {selectionCount > 0 && (
        <div className="mb-1 flex justify-end px-1">
          <button
            type="button"
            onClick={onClearSelection}
            className="text-[10px] uppercase tracking-[0.12em] text-[#8a8578] hover:text-[#2a2520]"
          >
            Clear selection
          </button>
        </div>
      )}

      {selectionCount > 0 && onAssignSelectionToCity && (
        <AssignToolbar
          selectionCount={selectionCount}
          cities={cities}
          cityColors={cityColors}
          onAssign={(cityIdOrNew) =>
            onAssignSelectionToCity(cityIdOrNew, selectedIndices)
          }
          onUnassign={() => onUnassignSelection?.(selectedIndices)}
          onCancel={onClearSelection}
        />
      )}

      <div
        ref={scrollerRef}
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {days.map((day) => {
          const cityId = day.cityId;
          return (
            <div key={day.dayIndex}>
              <DayChip
                day={day}
                cityColor={cityId ? cityColors[cityId] : null}
                isSelected={selectedSet?.has(day.dayIndex) ?? false}
                isFocused={focusedDayIndex === day.dayIndex}
                onClick={(e) =>
                  onToggleDay?.(day.dayIndex, { shift: e?.shiftKey })
                }
                registerRef={registerRef}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
