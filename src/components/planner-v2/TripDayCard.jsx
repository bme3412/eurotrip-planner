'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getFlagForCountry } from '@/utils/countryFlags';
import { parseIsoDate } from '@/lib/conversation/dayAssignments';
import { ACCOMMODATION_FIELDS } from '@/lib/conversation/tripState';

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

function emptyAccommodation() {
  return ACCOMMODATION_FIELDS.reduce((acc, key) => {
    acc[key] = '';
    return acc;
  }, {});
}

function hydrateAccommodation(city) {
  const base = emptyAccommodation();
  const a = city?.accommodation;
  if (!a || typeof a !== 'object') return base;
  for (const key of ACCOMMODATION_FIELDS) {
    if (a[key] != null) base[key] = String(a[key]);
  }
  return base;
}

/**
 * Compact day card used in the planner top-bar Day Strip.
 *
 * Collapsed: `Day N · Mon D · 🇫🇷 City` with a small color dot.
 * Click opens a modal with: full date, role, city/country, nights ±,
 * trip dates, and an editable accommodation/stay section.
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
  onSetCityAccommodation,
  onSetTripDates,
}) {
  const cardRef = useRef(null);
  const modalRef = useRef(null);

  // Local accommodation form state. We commit to parent on blur so a server
  // autosave doesn't fire on every keystroke.
  const initial = useMemo(() => hydrateAccommodation(city), [city]);
  const [accommodation, setAccommodation] = useState(initial);

  // Re-sync when the underlying city's accommodation changes (e.g. when the
  // user re-opens the modal on a different day card).
  useEffect(() => {
    setAccommodation(hydrateAccommodation(city));
  }, [city, isExpanded]);

  // Close modal on Escape.
  useEffect(() => {
    if (!isExpanded) return;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onClose]);

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!isExpanded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isExpanded]);

  const isAssigned = !!day.cityId;
  const flag = city?.country ? getFlagForCountry(city.country) : null;
  const shortDate = formatShortDate(day.date);
  const longDate = formatLongDate(day.date);

  const canDecrement = isAssigned && Number.isFinite(nightsForCity) && nightsForCity > 1 && onSetCityNights;
  const canIncrement = isAssigned && onSetCityNights;

  const handleAccommodationChange = (field, value) => {
    setAccommodation((prev) => ({ ...prev, [field]: value }));
  };

  const commitAccommodationField = (field) => {
    if (!isAssigned || !onSetCityAccommodation || !day.cityId) return;
    const nextValue = accommodation[field] ?? '';
    const prevValue = initial[field] ?? '';
    if (nextValue === prevValue) return;
    onSetCityAccommodation(day.cityId, { [field]: nextValue });
  };

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
        aria-haspopup="dialog"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
          onMouseDown={(e) => {
            // Close when backdrop (not modal body) is clicked.
            if (modalRef.current && !modalRef.current.contains(e.target)) {
              onClose?.();
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Details for day ${day.dayIndex + 1}`}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#e5e0d8] bg-white p-5 text-left shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
                  Day {day.dayIndex + 1}
                  {roleLabel(day.role) && (
                    <span className="ml-1.5 rounded-full bg-[#faf8f5] px-1.5 py-0.5 text-[9px] text-[#6a6459]">
                      {roleLabel(day.role)}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-base font-semibold text-[#2a2520]">
                  {longDate || '—'}
                </p>
                <p className="mt-1 text-sm text-[#2a2520]">
                  {flag && <span className="mr-1" aria-hidden="true">{flag}</span>}
                  {day.cityName || 'Unassigned'}
                  {city?.country && (
                    <span className="text-[#8a8578]"> · {city.country}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-1.5 text-[#8a8578] hover:bg-[#faf8f5] hover:text-[#2a2520]"
                aria-label="Close details"
              >
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>

            {isAssigned && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-[#e5e0d8] bg-[#faf8f5] px-3 py-2">
                <span className="text-xs font-medium text-[#6a6459]">
                  Nights in {day.cityName}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => canDecrement && onSetCityNights(day.cityId, nightsForCity - 1)}
                    disabled={!canDecrement}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e5e0d8] bg-white text-base font-semibold text-[#2a2520] hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease nights"
                  >
                    −
                  </button>
                  <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums text-[#2a2520]">
                    {Number.isFinite(nightsForCity) ? nightsForCity : 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => canIncrement && onSetCityNights(day.cityId, (nightsForCity || 0) + 1)}
                    disabled={!canIncrement}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e5e0d8] bg-white text-base font-semibold text-[#2a2520] hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase nights"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {isAssigned && onSetCityAccommodation && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
                  Stay
                </p>
                <div className="mt-2 space-y-2">
                  <label className="block">
                    <span className="text-[11px] font-medium text-[#6a6459]">Hotel / lodging</span>
                    <input
                      type="text"
                      value={accommodation.name}
                      onChange={(e) => handleAccommodationChange('name', e.target.value)}
                      onBlur={() => commitAccommodationField('name')}
                      placeholder="e.g. Hotel des Grands Boulevards"
                      className="mt-1 w-full rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-sm text-[#2a2520] placeholder-[#b5b0a8] focus:border-[#2a2520] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-[#6a6459]">Address</span>
                    <input
                      type="text"
                      value={accommodation.address}
                      onChange={(e) => handleAccommodationChange('address', e.target.value)}
                      onBlur={() => commitAccommodationField('address')}
                      placeholder="Street, city, postal code"
                      className="mt-1 w-full rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-sm text-[#2a2520] placeholder-[#b5b0a8] focus:border-[#2a2520] focus:outline-none"
                    />
                  </label>
                  <div className="flex gap-2">
                    <label className="block flex-1">
                      <span className="text-[11px] font-medium text-[#6a6459]">Check-in</span>
                      <input
                        type="time"
                        value={accommodation.checkIn}
                        onChange={(e) => handleAccommodationChange('checkIn', e.target.value)}
                        onBlur={() => commitAccommodationField('checkIn')}
                        className="mt-1 w-full rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-sm text-[#2a2520] focus:border-[#2a2520] focus:outline-none"
                      />
                    </label>
                    <label className="block flex-1">
                      <span className="text-[11px] font-medium text-[#6a6459]">Check-out</span>
                      <input
                        type="time"
                        value={accommodation.checkOut}
                        onChange={(e) => handleAccommodationChange('checkOut', e.target.value)}
                        onBlur={() => commitAccommodationField('checkOut')}
                        className="mt-1 w-full rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-sm text-[#2a2520] focus:border-[#2a2520] focus:outline-none"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-medium text-[#6a6459]">Confirmation #</span>
                    <input
                      type="text"
                      value={accommodation.confirmationNumber}
                      onChange={(e) => handleAccommodationChange('confirmationNumber', e.target.value)}
                      onBlur={() => commitAccommodationField('confirmationNumber')}
                      placeholder="Booking reference"
                      className="mt-1 w-full rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-sm text-[#2a2520] placeholder-[#b5b0a8] focus:border-[#2a2520] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-[#6a6459]">Notes</span>
                    <textarea
                      rows={2}
                      value={accommodation.notes}
                      onChange={(e) => handleAccommodationChange('notes', e.target.value)}
                      onBlur={() => commitAccommodationField('notes')}
                      placeholder="Door code, breakfast included, etc."
                      className="mt-1 w-full resize-none rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-sm text-[#2a2520] placeholder-[#b5b0a8] focus:border-[#2a2520] focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {onSetTripDates && (
              <div className="mt-4 rounded-lg border border-[#e5e0d8] bg-[#faf8f5] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
                  Trip dates
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={tripDates?.startDate || ''}
                    onChange={(e) =>
                      onSetTripDates({
                        startDate: e.target.value || null,
                        endDate: tripDates?.endDate || null,
                      })
                    }
                    className="min-w-0 flex-1 rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-xs text-[#2a2520]"
                    aria-label="Trip start date"
                  />
                  <span className="text-xs text-[#b5b0a8]" aria-hidden="true">–</span>
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
                    className="min-w-0 flex-1 rounded-md border border-[#e5e0d8] bg-white px-2 py-1.5 text-xs text-[#2a2520]"
                    aria-label="Trip end date"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
