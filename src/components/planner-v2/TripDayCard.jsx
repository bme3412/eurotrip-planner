'use client';

import { useEffect, useRef } from 'react';
import { getFlagForCountry } from '@/utils/countryFlags';
import { parseIsoDate } from '@/lib/conversation/dayAssignments';

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatShortDate(iso) {
  const d = parseIsoDate(iso);
  if (!d) return null;
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function formatLongDate(iso) {
  const d = parseIsoDate(iso);
  if (!d) return null;
  return `${DOW_SHORT[d.getDay()]}, ${MONTH_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function roleLabel(role) {
  if (role === 'start') return 'Start';
  if (role === 'end') return 'End';
  if (role === 'stop') return 'Stop';
  return null;
}

/**
 * Compact day card used in the planner top-bar Day Strip.
 *
 * Collapsed: `Day N · Mon D · 🇫🇷 City` with a small color dot.
 * Expanded (popover): full date, role, city/country, nights, +/- controls.
 */
export default function TripDayCard({
  day,
  city,
  nightsForCity,
  tripDates,
  isExpanded,
  onClick,
  onClose,
  onSetCityNights,
  onSetTripDates,
}) {
  const popoverRef = useRef(null);
  const cardRef = useRef(null);

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!isExpanded) return;
    function handlePointerDown(event) {
      if (popoverRef.current?.contains(event.target)) return;
      if (cardRef.current?.contains(event.target)) return;
      onClose?.();
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, onClose]);

  const isAssigned = !!day.cityId;
  const flag = city?.country ? getFlagForCountry(city.country) : null;
  const shortDate = formatShortDate(day.date);
  const longDate = formatLongDate(day.date);

  const canDecrement = isAssigned && Number.isFinite(nightsForCity) && nightsForCity > 1 && onSetCityNights;
  const canIncrement = isAssigned && onSetCityNights;

  return (
    <div className="relative shrink-0">
      <button
        ref={cardRef}
        type="button"
        onClick={onClick}
        className={`group flex h-14 w-[88px] flex-col items-stretch justify-between rounded-lg border px-2 py-1.5 text-left transition-all ${
          isExpanded
            ? 'border-[#2a2520] bg-[#2a2520] text-white shadow-sm'
            : isAssigned
              ? 'border-[#e5e0d8] bg-white text-[#2a2520] hover:border-[#b5b0a8] hover:bg-[#faf8f5]'
              : 'border-dashed border-[#d5d0c8] bg-white text-[#8a8578] hover:border-[#b5b0a8]'
        }`}
        aria-expanded={isExpanded}
        aria-label={
          isAssigned
            ? `Day ${day.dayIndex + 1}${shortDate ? `, ${shortDate}` : ''}, ${day.cityName}`
            : `Day ${day.dayIndex + 1}${shortDate ? `, ${shortDate}` : ''}, unassigned`
        }
      >
        <span
          className={`text-[10px] font-semibold tabular-nums ${
            isExpanded ? 'text-white/85' : 'text-[#6a6459]'
          }`}
        >
          {shortDate || '—'}
        </span>
        <div className="flex items-center gap-1">
          {flag && <span className="text-[11px] leading-none" aria-hidden="true">{flag}</span>}
          <span className={`truncate text-[11px] font-medium ${isExpanded ? 'text-white' : ''}`}>
            {day.cityName || 'Free'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Details for day ${day.dayIndex + 1}`}
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-64 rounded-xl border border-[#e5e0d8] bg-white p-3 text-left shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
                Day {day.dayIndex + 1}
                {roleLabel(day.role) && (
                  <span className="ml-1.5 rounded-full bg-[#faf8f5] px-1.5 py-0.5 text-[9px] text-[#6a6459]">
                    {roleLabel(day.role)}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#2a2520]">
                {longDate || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 shrink-0 rounded-full p-1 text-[#8a8578] hover:bg-[#faf8f5] hover:text-[#2a2520]"
              aria-label="Close details"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-[#2a2520]">
              {flag && <span className="mr-1" aria-hidden="true">{flag}</span>}
              {day.cityName || 'Unassigned'}
              {city?.country && (
                <span className="text-[#8a8578]"> · {city.country}</span>
              )}
            </span>
          </div>

          {isAssigned && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-[#e5e0d8] bg-[#faf8f5] px-2 py-1.5">
              <span className="text-[11px] font-medium text-[#6a6459]">
                Nights in {day.cityName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canDecrement && onSetCityNights(day.cityId, nightsForCity - 1)}
                  disabled={!canDecrement}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e5e0d8] bg-white text-sm font-semibold text-[#2a2520] hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease nights"
                >
                  −
                </button>
                <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums text-[#2a2520]">
                  {Number.isFinite(nightsForCity) ? nightsForCity : 0}
                </span>
                <button
                  type="button"
                  onClick={() => canIncrement && onSetCityNights(day.cityId, (nightsForCity || 0) + 1)}
                  disabled={!canIncrement}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e5e0d8] bg-white text-sm font-semibold text-[#2a2520] hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase nights"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {onSetTripDates && (
            <div className="mt-3 rounded-lg border border-[#e5e0d8] bg-[#faf8f5] px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8578]">
                Trip dates
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="date"
                  value={tripDates?.startDate || ''}
                  onChange={(e) =>
                    onSetTripDates({
                      startDate: e.target.value || null,
                      endDate: tripDates?.endDate || null,
                    })
                  }
                  className="min-w-0 flex-1 rounded-md border border-[#e5e0d8] bg-white px-1.5 py-1 text-[11px] text-[#2a2520]"
                  aria-label="Trip start date"
                />
                <span className="text-[10px] text-[#b5b0a8]" aria-hidden="true">–</span>
                <input
                  type="date"
                  value={tripDates?.endDate || ''}
                  min={tripDates?.startDate || undefined}
                  onChange={(e) =>
                    onSetTripDates({
                      startDate: tripDates?.startDate || null,
                      endDate: e.target.value || null,
                    })
                  }
                  className="min-w-0 flex-1 rounded-md border border-[#e5e0d8] bg-white px-1.5 py-1 text-[11px] text-[#2a2520]"
                  aria-label="Trip end date"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
