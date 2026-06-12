'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RATING_COLORS } from './lib/constants';
import { buildTooltipData } from './lib/derived';
import { bandFor } from '../visitBands';
import BandLegend from '../BandLegend';

// Approximate tooltip dimensions used for viewport edge detection.
// The real DOM size will vary slightly with content; these are upper bounds
// that keep the tooltip on-screen in the worst case.
const TOOLTIP_WIDTH = 320;
const TOOLTIP_MAX_HEIGHT = 240;
const VIEWPORT_MARGIN = 12;

/**
 * 12-month overview calendar. Renders all 12 month cards in a grid with
 * a colour swatch per day and a hover tooltip.
 *
 * Tooltip rendering:
 *   The tooltip is rendered ONCE at the end of the tree using `position: fixed`
 *   so it can never be clipped by parent overflow. Placement is computed from
 *   the hovered cell's getBoundingClientRect():
 *     • horizontally centered on the cell, clamped to the viewport
 *     • shown above by default, flipped below if too close to viewport top
 *
 * Props:
 *   • calendarData             — output of `buildCalendarData()`
 *   • activeTooltip            — current tooltip payload (or null)
 *   • onTooltipChange          — set the tooltip payload (or null to clear)
 *   • onSelectMonth(monthName) — called when a month card is clicked
 *   • selectedMonth            — month currently open in the guide below
 *                                (drawn with a selected ring)
 *   • onOpenMonthGuide(name)   — optional "View guide" action inside the
 *                                pinned day tooltip
 *
 * Day cells pin the tooltip; clicking anywhere else on a month card selects
 * the month (one click — no intermediate panel).
 */
export default function MonthlyCalendar({
  calendarData,
  activeTooltip,
  onTooltipChange,
  onSelectMonth,
  selectedMonth = null,
  onOpenMonthGuide = null,
}) {
  const [anchor, setAnchor] = useState(null); // { rect, color, monthName, rating }
  const [pinned, setPinned] = useState(false);

  const setFromCell = useCallback((event, day, monthIndex, monthName) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor({
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      color: day.color,
      band: day.band || bandFor(day.rating),
      monthName,
      rating: day.rating,
    });
    onTooltipChange?.(buildTooltipData(day, monthIndex, day.dayOfMonth));
  }, [onTooltipChange]);

  const handleEnter = useCallback((event, day, monthIndex, monthName) => {
    if (pinned) return; // pinned tooltip ignores hover
    setFromCell(event, day, monthIndex, monthName);
  }, [pinned, setFromCell]);

  const handleLeave = useCallback(() => {
    if (pinned) return;
    setAnchor(null);
    onTooltipChange?.(null);
  }, [pinned, onTooltipChange]);

  const closeTooltip = useCallback(() => {
    setPinned(false);
    setAnchor(null);
    onTooltipChange?.(null);
  }, [onTooltipChange]);

  const handleDayClick = useCallback((event, day, monthIndex, monthName) => {
    event.stopPropagation();
    // Toggle off if clicking the same pinned day.
    if (pinned && anchor?.monthName === monthName && activeTooltip?.dayOfMonth === day.dayOfMonth) {
      closeTooltip();
      return;
    }
    setFromCell(event, day, monthIndex, monthName);
    setPinned(true);
  }, [pinned, anchor, activeTooltip, setFromCell, closeTooltip]);

  // Reset anchor whenever the tooltip is cleared from the outside (e.g. document click
  // handled by the parent). Skip while pinned — pinned tooltips opt out of outside-click
  // dismissal via the `.day-cell` marker class on the tooltip wrapper.
  useEffect(() => {
    if (!activeTooltip && !pinned) setAnchor(null);
  }, [activeTooltip, pinned]);

  // Dismiss the pinned tooltip on Escape for keyboard users.
  useEffect(() => {
    if (!pinned) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeTooltip(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pinned, closeTooltip]);

  if (!calendarData?.length) return null;

  // Compute fixed-position placement from the anchored cell rect.
  let tooltipStyle = null;
  let placement = 'top';
  if (anchor && typeof window !== 'undefined') {
    const { rect } = anchor;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Flip vertically if not enough room above.
    const fitsAbove = rect.top >= TOOLTIP_MAX_HEIGHT + VIEWPORT_MARGIN;
    placement = fitsAbove ? 'top' : 'bottom';

    let left = rect.left + rect.width / 2;
    const half = TOOLTIP_WIDTH / 2;
    if (left - half < VIEWPORT_MARGIN) left = half + VIEWPORT_MARGIN;
    if (left + half > vw - VIEWPORT_MARGIN) left = vw - half - VIEWPORT_MARGIN;

    const top = placement === 'top'
      ? rect.top - VIEWPORT_MARGIN
      : Math.min(rect.bottom + VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN);

    tooltipStyle = {
      position: 'fixed',
      top,
      left,
      width: TOOLTIP_WIDTH,
      transform: placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      zIndex: 9999,
    };
  }

  return (
    <div className="mt-3">
      {/* Shared visit-quality legend */}
      <div className="flex justify-center mb-3">
        <BandLegend />
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
        {calendarData.map(({ monthName, monthIndex, days, isCurrentMonth }) => {
          const isSelected = selectedMonth === monthName;
          return (
          <div
            key={monthIndex}
            className={`border rounded-lg transition-all cursor-pointer hover:shadow-md ${
              isSelected
                ? 'ring-2 ring-blue-600 border-blue-300 shadow-sm'
                : 'hover:border-blue-300'
            }`}
            onClick={() => onSelectMonth?.(monthName)}
            role={onSelectMonth ? 'button' : undefined}
            aria-pressed={onSelectMonth ? isSelected : undefined}
            aria-label={onSelectMonth ? `Open ${monthName} guide` : undefined}
          >
            <div className={`p-2 text-center border-b flex items-center justify-center gap-1.5 rounded-t-lg ${
              isSelected ? 'bg-blue-50' : 'bg-gray-50'
            }`}>
              <div className={`text-xs font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                {monthName}
              </div>
              {isCurrentMonth && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-blue-600 text-white">Now</span>
              )}
            </div>

            <div className="grid grid-cols-7 gap-0.5 p-1">
              {days.map((day, dayIndex) =>
                day.type === 'empty' ? (
                  <div key={`empty-${dayIndex}`} className="aspect-square" />
                ) : (
                  <div
                    key={`day-${day.dayOfMonth}`}
                    className={`day-cell aspect-square rounded-[3px] relative cursor-pointer flex items-center justify-center hover:z-10 hover:ring-2 hover:ring-gray-500/50 ${
                      pinned && anchor?.monthName === monthName && activeTooltip?.dayOfMonth === day.dayOfMonth
                        ? 'ring-2 ring-gray-900 z-10'
                        : ''
                    }`}
                    style={{ backgroundColor: day.color }}
                    onMouseEnter={(e) => handleEnter(e, day, monthIndex, monthName)}
                    onMouseLeave={handleLeave}
                    onClick={(e) => handleDayClick(e, day, monthIndex, monthName)}
                    aria-label={`${monthName} ${day.dayOfMonth}${day.event ? `: ${day.event}` : ''}`}
                  >
                    <span
                      className="font-semibold text-[10px] text-white"
                      style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.35)' }}
                    >
                      {day.dayOfMonth}
                    </span>
                    {day.special && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Single, viewport-aware tooltip (fixed-positioned so it cannot be clipped).
          The `day-cell` class is intentional: the parent's outside-click listener
          uses `closest('.day-cell')` to decide when to dismiss, so we use the same
          marker to keep a pinned tooltip interactive when its contents are clicked. */}
      {activeTooltip && anchor && tooltipStyle && (
        <div
          style={tooltipStyle}
          className={`day-cell ${pinned ? 'pointer-events-auto' : 'pointer-events-none'}`}
          role={pinned ? 'dialog' : undefined}
          aria-label={pinned ? `${anchor.monthName} ${activeTooltip.dayOfMonth} details` : undefined}
        >
          <div className={`rounded-xl shadow-2xl bg-white overflow-hidden ${
            pinned ? 'ring-2 ring-gray-900/30' : 'ring-1 ring-black/10'
          }`}>
            {/* Color accent strip reflecting the day's score */}
            <div className="h-1" style={{ backgroundColor: anchor.color }} />
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  {anchor.monthName} {activeTooltip.dayOfMonth}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1"
                    style={{ backgroundColor: anchor.band?.bg, color: anchor.band?.text }}
                  >
                    {activeTooltip.event && <span aria-hidden>★</span>}
                    {anchor.band?.label || 'Average'}
                  </span>
                  {pinned && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); closeTooltip(); }}
                      className="w-5 h-5 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-[14px] leading-none"
                      aria-label="Close details"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {activeTooltip.event && (
                <div className="text-[13px] font-semibold text-gray-900 mb-1.5 leading-snug">
                  {activeTooltip.event}
                </div>
              )}

              {activeTooltip.notes && (
                <p className="text-[12px] text-gray-700 leading-relaxed mb-2">
                  {activeTooltip.notes}
                </p>
              )}

              {!activeTooltip.event && !activeTooltip.notes && (
                <p className="text-[12px] text-gray-500 italic mb-2">
                  General guidance — click the day for full details.
                </p>
              )}

              <div className="grid grid-cols-1 gap-1.5 pt-1.5 border-t border-gray-100">
                {activeTooltip.weather && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-medium text-gray-500">Weather</span>
                    <span className="ml-auto text-gray-900">{activeTooltip.weather}</span>
                  </div>
                )}
                {activeTooltip.crowdLevel && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-medium text-gray-500">Crowds</span>
                    <span className="ml-auto text-gray-900">{activeTooltip.crowdLevel}</span>
                  </div>
                )}
                {activeTooltip.price && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-medium text-gray-500">Prices</span>
                    <span className="ml-auto text-gray-900">{activeTooltip.price}</span>
                  </div>
                )}
              </div>

              {pinned && onOpenMonthGuide && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const month = anchor.monthName;
                    closeTooltip();
                    onOpenMonthGuide(month);
                  }}
                  className="mt-2.5 w-full rounded-lg bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors text-center"
                >
                  View {anchor.monthName} guide →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { RATING_COLORS };
