'use client';

import { Train, Plus, MapPin } from 'lucide-react';
import DateScoreBadges, { DateScoreSummary } from './DateScoreBadges';

/**
 * CityPopup
 *
 * Map popup showing city details with date-specific scoring.
 * Used when clicking a city pin on the GapFillerMap.
 */
export default function CityPopup({ city, onSelect, onClose }) {
  if (!city) return null;

  const handleSelect = () => {
    onSelect?.(city);
    onClose?.();
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-[#e5e0d8] overflow-hidden min-w-[280px] max-w-[320px]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#faf8f5] border-b border-[#e5e0d8]">
        <div className="flex items-start justify-between">
          <div>
            <h3
              className="text-lg font-light text-[#2a2520]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {city.name}
            </h3>
            <p className="text-xs text-[#8a8578]">{city.country}</p>
          </div>
          {city.dateScore && (
            <DateScoreSummary dateScore={city.dateScore} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Date-specific badges */}
        {city.scoreBadges && (
          <DateScoreBadges scoreBadges={city.scoreBadges} />
        )}

        {/* Why go description */}
        {city.whyGo && (
          <p className="text-sm text-[#5a5549] leading-relaxed line-clamp-3">
            "{city.whyGo}"
          </p>
        )}

        {/* Transport info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-[#6a6459]">
            <Train className="w-4 h-4" />
            <span>{city.transportTime}</span>
            {city.transportDetails?.type && (
              <span className="text-xs text-[#8a8578]">
                • {city.transportDetails.type}
              </span>
            )}
          </div>
          <div className="text-[#a08545] font-medium">
            {city.recommendedDays}d suggested
          </div>
        </div>

        {/* Transport details */}
        {city.transportDetails?.frequency && (
          <div className="text-xs text-[#8a8578]">
            {city.transportDetails.frequency}
            {city.transportDetails.priceRange && ` • ${city.transportDetails.priceRange}`}
          </div>
        )}

        {/* Match reasons */}
        {city.matchReasons?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {city.matchReasons.map((reason, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-[#faf8f5] border border-[#e5e0d8] rounded-full text-[10px] text-[#6a6459]"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Events */}
        {city.dateScore?.events?.length > 0 && (
          <div className="pt-2 border-t border-[#e5e0d8]">
            <p className="text-xs font-medium text-[#6a6459] mb-1.5">During your dates:</p>
            <div className="space-y-1">
              {city.dateScore.events.slice(0, 2).map((event, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-[#a08545]">🎭</span>
                  <div>
                    <span className="font-medium text-[#2a2520]">{event.name}</span>
                    {event.date && (
                      <span className="text-[#8a8578] ml-1">• {event.date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with action */}
      <div className="px-4 py-3 bg-[#faf8f5] border-t border-[#e5e0d8]">
        <button
          onClick={handleSelect}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c9a227] hover:bg-[#d4af37] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add to trip
        </button>
      </div>
    </div>
  );
}

/**
 * Compact variant for list items
 */
export function CityListItem({ city, isSelected, onSelect, onHover }) {
  const handleClick = () => {
    onSelect?.(city);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => onHover?.(city)}
      onMouseLeave={() => onHover?.(null)}
      className={`
        w-full p-3 rounded-xl border transition-all text-left group
        ${isSelected
          ? 'bg-[#f0f7f4] border-[#4a7c59]/30'
          : 'bg-white hover:bg-[#faf6eb] border-[#e5e0d8] hover:border-[#c9a227]/40'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isSelected ? 'bg-[#4a7c59]/15' : 'bg-[#faf8f5] group-hover:bg-[#c9a227]/10'
          }`}>
            <MapPin className={`w-3.5 h-3.5 transition-colors ${
              isSelected ? 'text-[#4a7c59]' : 'text-[#8a8578] group-hover:text-[#a08545]'
            }`} />
          </div>
          <div>
            <div
              className="text-sm font-light text-[#2a2520]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {city.name}
            </div>
            <div className="text-[10px] text-[#8a8578]">{city.country}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[10px] text-[#6a6459]">
            <Train className="w-3 h-3" />
            {city.transportTime}
          </div>
          <div className="text-[10px] text-[#a08545]">
            {city.recommendedDays}d
          </div>
        </div>
      </div>

      {/* Date score badges (compact) */}
      {city.scoreBadges && (
        <DateScoreBadges scoreBadges={city.scoreBadges} compact />
      )}
    </button>
  );
}
