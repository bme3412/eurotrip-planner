import React, { useEffect, useState } from 'react';
import BandLegend from '../../BandLegend.jsx';
import { crowdLabel } from '../../visitBands.js';
import { stripEventYear } from '../lib/eventDates.js';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The colour-coded calendar grid for the selected month. Each cell is tinted
 * by its visit-quality rating; days with events get a red dot indicator plus a
 * popup listing up to 3 events with meta chips (time/location/crowd/price).
 * The popup shows on hover and pins on click/tap (hover doesn't exist on
 * touch devices), dismissing on outside click or Escape.
 */
export default function CalendarGrid({ monthName, monthData, days }) {
  const [pinnedDay, setPinnedDay] = useState(null);

  // Reset the pinned popup when the month changes.
  useEffect(() => {
    setPinnedDay(null);
  }, [monthName]);

  useEffect(() => {
    if (pinnedDay == null) return undefined;
    const onDocClick = (e) => {
      if (!e.target.closest('.cg-day')) setPinnedDay(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setPinnedDay(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinnedDay]);

  return (
    <div className="bg-gray-50 rounded-xl p-5">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900">{monthName}</h4>
        {crowdLabel(monthData?.tourismLevel) && (
          <span className="text-sm text-gray-500">{crowdLabel(monthData.tourismLevel)}</span>
        )}
      </div>

      {/* Weather */}
      {(typeof monthData?.weatherLowC === 'number' || typeof monthData?.weatherHighC === 'number') && (
        <p className="text-sm text-gray-600 mb-4">
          {monthData.weatherLowC !== undefined && `${monthData.weatherLowC}°`}
          {monthData.weatherLowC !== undefined && monthData.weatherHighC !== undefined && ' – '}
          {monthData.weatherHighC !== undefined && `${monthData.weatherHighC}°C`}
        </p>
      )}

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          const col = i % 7;
          const tooltipAlign = col <= 1 ? 'left-0' : col >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2';

          return day.type === 'empty' ? (
            <div key={`e-${i}`} className="aspect-square" />
          ) : (
            <div
              key={`d-${day.d}`}
              className={`cg-day group aspect-square flex items-center justify-center rounded relative hover:z-10 hover:ring-2 hover:ring-gray-400/60 ${
                day.hasEvent ? 'cursor-pointer' : 'cursor-default'
              } ${pinnedDay === day.d ? 'ring-2 ring-gray-900 z-10' : ''}`}
              style={{ backgroundColor: day.color }}
              onClick={() => {
                if (day.hasEvent) setPinnedDay((prev) => (prev === day.d ? null : day.d));
              }}
            >
              <span className="text-white text-xs font-semibold drop-shadow-sm">{day.d}</span>
              {day.hasEvent && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-red-500"></span>
                </span>
              )}
              {day.hasEvent && (
                <div
                  className={`absolute bottom-full ${tooltipAlign} mb-2 w-72 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-gray-200 transition-opacity z-50 overflow-hidden ${
                    pinnedDay === day.d
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100'
                  }`}
                >
                  <div className="px-4 py-3 space-y-4 max-h-56 overflow-y-auto">
                    {day.events.slice(0, 3).map((ev, j) => (
                      <div key={`evtip-${j}`}>
                        <div className="font-semibold text-gray-900 text-[13px] leading-tight mb-1">
                          {ev.name || ev.event || 'Event'}
                        </div>
                        {ev.date && <div className="text-xs text-gray-500 mb-1">{stripEventYear(ev.date)}</div>}
                        {ev.description && (
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{ev.description}</p>
                        )}
                        {(ev.location || ev.crowdLevel || ev.price || ev.time) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {ev.time && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                {ev.time}
                              </span>
                            )}
                            {ev.location && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                {ev.location}
                              </span>
                            )}
                            {ev.crowdLevel && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                {ev.crowdLevel}
                              </span>
                            )}
                            {ev.price && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                                {ev.price}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {day.events.length > 3 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                      +{day.events.length - 3} more event{day.events.length - 3 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend — same scale as the 12-month overview grid */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <BandLegend showEventHint={false} />
      </div>
    </div>
  );
}
