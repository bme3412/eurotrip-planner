import React from 'react';

/**
 * Panel listing the cities ranked for the selected dates by the V4 engine.
 *
 * Grouped into qualitative tiers (Top Picks / Great / Good / Fair) with section
 * headers + counts, so the discrimination is visible — "only N cities are
 * genuinely top for my dates" — instead of a flat list where every row reads
 * the same. Shows the band + one-line "why", never a raw score (honest-ranking
 * design). Driven by the same V4 ranking the /results scoreboard uses.
 *
 * @param {Array<Object>} props.items - ranked entries { id, title, country, score, band, why, rank }
 * @param {{start:string,end:string}|null} props.dateRange - active date window
 * @param {Function} props.onClose - close the panel
 * @param {Function} props.onCitySelect - select a city (focuses it on the map)
 */
// Tier order + the section heading shown for each band group.
const GROUPS = [
  { key: 'top', heading: 'Top picks' },
  { key: 'great', heading: 'Great options' },
  { key: 'good', heading: 'Good options' },
  { key: 'fair', heading: 'Worth considering' },
  { key: 'limited', heading: 'Limited data' },
];

const RankedListPanel = ({ items = [], loading = false, highlightId = null, onCityHover, onClose, onCitySelect }) => {
  const ranked = [...items].sort((a, b) => (a.rank || 999) - (b.rank || 999));

  // Bucket by qualitative band (derived from score), preserving rank order.
  const byBand = {};
  for (const it of ranked) {
    const key = it.band?.key || 'fair';
    (byBand[key] ||= []).push(it);
  }
  const groups = GROUPS.map((g) => ({ ...g, cities: byBand[g.key] || [] })).filter((g) => g.cities.length);

  return (
    <div className="absolute top-[4.75rem] right-4 bg-white/95 backdrop-blur ring-1 ring-slate-200 rounded-2xl shadow-lg w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] flex flex-col z-20 overflow-hidden">
      {/* Header — dates + count live in the top-left badge (single source). */}
      <div className="flex justify-between items-center p-4 pb-3 border-b border-gray-200 flex-shrink-0">
        <h4 className="font-bold text-md text-gray-900">Ranked for your dates</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 -mr-1" title="Close panel">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Grouped list */}
      <div className="overflow-y-auto flex-grow custom-scrollbar">
        {loading && ranked.length === 0 ? (
          <ul className="p-2 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-2.5 px-2 py-2 animate-pulse">
                <span className="h-11 w-11 flex-shrink-0 rounded-md bg-slate-200" />
                <span className="min-w-0 flex-1">
                  <span className="block h-3 w-2/3 rounded bg-slate-200" />
                  <span className="mt-1.5 block h-2.5 w-5/6 rounded bg-slate-100" />
                </span>
              </li>
            ))}
          </ul>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6 px-4">
            Set a date range to rank cities for your trip.
          </p>
        ) : (
          groups.map((g) => {
            const band = g.cities[0]?.band;
            return (
              <section key={g.key}>
                <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 ${band?.bg || 'bg-gray-100'}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${band?.text || 'text-gray-700'}`}>
                    {g.heading}
                  </span>
                  <span className={`text-[11px] font-semibold ${band?.text || 'text-gray-500'}`}>{g.cities.length}</span>
                </div>
                <ul>
                  {g.cities.map((dest) => (
                    <li
                      key={dest.id || dest.title}
                      onClick={() => onCitySelect?.(dest)}
                      onMouseEnter={() => onCityHover?.(dest.id)}
                      onMouseLeave={() => onCityHover?.(null)}
                      className={`flex items-start gap-2.5 px-4 py-2 border-l-4 transition-colors cursor-pointer ${
                        highlightId && (dest.id === highlightId)
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      style={{ borderLeftColor: band?.color || '#cbd5e1' }}
                    >
                      <span className="mt-2 text-xs font-bold text-gray-400 w-4 text-right flex-shrink-0">
                        {dest.rank}
                      </span>
                      <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {dest.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={dest.image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-sm text-gray-900 truncate block">{dest.title}</span>
                        {dest.why && (
                          <span className="block text-xs leading-snug text-gray-500 mt-0.5 line-clamp-2">{dest.why}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RankedListPanel;
