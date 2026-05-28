'use client';

import React from 'react';
import { RATING_COLORS } from './lib/constants';
import { buildTooltipData } from './lib/derived';

const COLOR_LEGEND = [
  { color: '#10b981', label: 'Excellent (5)' },
  { color: '#34d399', label: 'Good (4)' },
  { color: '#fbbf24', label: 'Average (3)' },
  { color: '#fb923c', label: 'Below Avg (2)' },
  { color: '#ef4444', label: 'Avoid (1)' },
];

/**
 * 12-month overview calendar. Renders all 12 month cards in a grid with
 * a colour swatch per day and a hover tooltip.
 *
 * Props:
 *   • calendarData             — output of `buildCalendarData()`
 *   • activeTooltip            — current tooltip payload (or null)
 *   • onTooltipChange          — set the tooltip payload (or null to clear)
 *   • onSelectMonth(monthName) — called when a month card is clicked
 *   • onSelectDay(monthName, dayOfMonth) — called when a specific day is clicked
 */
export default function MonthlyCalendar({
  calendarData,
  activeTooltip,
  onTooltipChange,
  onSelectMonth,
  onSelectDay,
}) {
  if (!calendarData?.length) return null;

  return (
    <div className="mt-3">
      {/* Color legend */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-2.5 p-1.5 bg-gray-50 rounded-lg">
        {COLOR_LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center">
            <div className="w-5 h-2.5 rounded mr-1.5" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-gray-600 font-medium">{label}</span>
          </div>
        ))}
        <span className="text-[11px] text-gray-500 ml-2">• = Special Event</span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
        {calendarData.map(({ monthName, monthIndex, days, isCurrentMonth }) => (
          <div
            key={monthIndex}
            className={`border rounded-lg transition-all cursor-pointer hover:shadow-md hover:border-indigo-300 ${
              isCurrentMonth ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onSelectMonth?.(monthName)}
          >
            <div className="bg-gray-50 p-2 text-center border-b flex items-center justify-center gap-1.5">
              <div className="text-xs font-semibold text-gray-700">{monthName}</div>
              {isCurrentMonth && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500 text-white">Now</span>
              )}
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-medium text-gray-500 bg-gray-50">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="p-0.5">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px overflow-visible">
              {days.map((day, dayIndex) =>
                day.type === 'empty' ? (
                  <div key={`empty-${dayIndex}`} className="aspect-square" />
                ) : (
                  <div
                    key={`day-${day.dayOfMonth}`}
                    className="day-cell aspect-square flex items-center justify-center text-[10px] relative transition-transform cursor-pointer hover:scale-105"
                    style={{ backgroundColor: day.color }}
                    onMouseEnter={() => onTooltipChange?.(buildTooltipData(day, monthIndex, day.dayOfMonth))}
                    onMouseLeave={() => onTooltipChange?.(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay?.(monthName, day.dayOfMonth);
                    }}
                    aria-label={`Day ${day.dayOfMonth}${day.event ? `: ${day.event}` : ''}`}
                  >
                    <span className="text-white font-medium text-[9px]">{day.dayOfMonth}</span>
                    {day.special && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    )}

                    {activeTooltip
                      && activeTooltip.monthIndex === monthIndex
                      && activeTooltip.dayOfMonth === day.dayOfMonth && (
                      <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-50 w-56">
                        <div className="rounded-lg shadow-xl bg-white ring-1 ring-black/10 p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500">
                              {monthName} {day.dayOfMonth}
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: `${day.color}20`, color: day.color }}
                            >
                              Score: {day.rating}/5
                            </span>
                          </div>
                          {activeTooltip.event && (
                            <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                              <span>🎉</span>{activeTooltip.event}
                            </div>
                          )}
                          {activeTooltip.notes && (
                            <div className="text-[11px] text-gray-600 mb-1.5 line-clamp-2">
                              {activeTooltip.notes}
                            </div>
                          )}
                          {!day.event && !day.notes && day.isPlaceholder && (
                            <div className="text-[11px] text-gray-500 italic">
                              General guidance — tap month for details.
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {activeTooltip.weather && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                🌡️ {activeTooltip.weather}
                              </span>
                            )}
                            {activeTooltip.crowdLevel && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                👥 {activeTooltip.crowdLevel}
                              </span>
                            )}
                            {activeTooltip.price && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                                💰 {activeTooltip.price}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mx-auto h-2 w-2 rotate-45 bg-white shadow translate-y-[-5px]" />
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { RATING_COLORS };
