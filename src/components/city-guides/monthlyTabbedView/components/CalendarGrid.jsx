import React from 'react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The colour-coded calendar grid for the selected month. Each cell is tinted
 * by its visit-quality rating; days with events get a red dot indicator plus a
 * hover popup listing up to 3 events with meta chips (time/location/crowd/price).
 */
export default function CalendarGrid({ monthName, monthData, days }) {
  return (
    <div className="bg-gray-50 rounded-xl p-5">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900">{monthName}</h4>
        {typeof monthData?.tourismLevel === 'number' && (
          <span className="text-sm text-gray-500">Crowds {monthData.tourismLevel}/10</span>
        )}
      </div>

      {/* Weather */}
      {(typeof monthData?.weatherLowC === 'number' || typeof monthData?.weatherHighC === 'number') && (
        <p className="text-sm text-gray-600 mb-4">
          🌡️ {monthData.weatherLowC !== undefined && `${monthData.weatherLowC}°`}
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
              className="group aspect-square flex items-center justify-center rounded relative cursor-default transition-transform hover:scale-110 hover:z-10"
              style={{ backgroundColor: day.color }}
            >
              <span className="text-white text-xs font-semibold drop-shadow-sm">{day.d}</span>
              {day.hasEvent && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-red-500"></span>
                </span>
              )}
              {day.hasEvent && (
                <div
                  className={`pointer-events-none absolute bottom-full ${tooltipAlign} mb-2 w-72 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 overflow-hidden`}
                >
                  <div className="px-4 py-3 space-y-4 max-h-56 overflow-y-auto">
                    {day.events.slice(0, 3).map((ev, j) => (
                      <div key={`evtip-${j}`}>
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-sm">🎉</span>
                          <div className="font-semibold text-gray-900 text-[13px] leading-tight">
                            {ev.name || ev.event || 'Event'}
                          </div>
                        </div>
                        {ev.date && <div className="text-xs text-gray-500 ml-6 mb-1">{ev.date}</div>}
                        {ev.description && (
                          <p className="text-xs text-gray-600 ml-6 leading-relaxed line-clamp-3">{ev.description}</p>
                        )}
                        {(ev.location || ev.crowdLevel || ev.price || ev.time) && (
                          <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                            {ev.time && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                🕐 {ev.time}
                              </span>
                            )}
                            {ev.location && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                📍 {ev.location}
                              </span>
                            )}
                            {ev.crowdLevel && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                👥 {ev.crowdLevel}
                              </span>
                            )}
                            {ev.price && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                                💰 {ev.price}
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

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>Great
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>Good
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-orange-500"></span>Fair
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-red-500"></span>Busy
        </span>
      </div>
    </div>
  );
}
