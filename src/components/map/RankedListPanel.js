import React from 'react';

/**
 * Panel listing the cities ranked for the selected dates by the V4 engine.
 *
 * Shows qualitative bands (Top Pick / Great / Good / Fair) and the one-line
 * "why", never a raw score — consistent with the honest-ranking design and the
 * sparse scoring data. Driven by the same ranking the /results scoreboard uses.
 *
 * @param {Array<Object>} props.items - ranked entries { id, title, country, score, band, why, rank }
 * @param {{start:string,end:string}|null} props.dateRange - active date window (for the header)
 * @param {Function} props.onClose - close the panel
 * @param {Function} props.onCitySelect - select a city (focuses it on the map)
 */
const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const RankedListPanel = ({ items = [], dateRange = null, onClose, onCitySelect }) => {
  const ranked = [...items].sort((a, b) => (a.rank || 999) - (b.rank || 999));

  return (
    <div className="absolute top-4 right-4 bg-white p-4 rounded-2xl shadow-lg w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] flex flex-col z-20 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-200 flex-shrink-0">
        <div>
          <h4 className="font-bold text-md text-gray-900">Ranked for your dates</h4>
          {dateRange?.start && dateRange?.end && (
            <p className="text-xs text-gray-500 mt-0.5">
              {fmtDate(dateRange.start)} – {fmtDate(dateRange.end)}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 -mr-1"
          title="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-grow pr-2 -mr-2 custom-scrollbar">
        {ranked.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">
            Set a date range to rank cities for your trip.
          </p>
        ) : (
          <ul className="space-y-1.5 animate-fade-in">
            {ranked.map((dest, index) => (
              <li
                key={dest.id || dest.title}
                onClick={() => onCitySelect?.(dest)}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="mt-0.5 text-xs font-bold text-gray-400 w-4 text-right flex-shrink-0">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">{dest.title}</span>
                    {dest.band && (
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${dest.band.bg} ${dest.band.text}`}>
                        {dest.band.label}
                      </span>
                    )}
                  </span>
                  {dest.why && (
                    <span className="block text-xs leading-snug text-gray-500 mt-0.5 line-clamp-2">{dest.why}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RankedListPanel;
