import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
const ResultCard = dynamic(() => import("./ResultCard"));

function formatDateRange(dates) {
  if (!dates?.start || !dates?.end) return null;
  const fmt = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(dates.start)} – ${fmt(dates.end)}`;
}

function getNights(dates) {
  if (!dates?.start || !dates?.end) return null;
  const diff = new Date(dates.end) - new Date(dates.start);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function CalendarIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

/**
 * Aggregates all event highlights from the results into a horizontally
 * scrollable strip. Each pill scrolls to that city's card.
 */
function EventStrip({ results, dateRange }) {
  const scrollRef = useRef(null);

  // Collect all event-type highlights, tag with city, deduplicate by name
  const seen = new Set();
  const pills = [];
  for (const r of results) {
    for (const h of (r.highlights || [])) {
      if (h.type !== 'event') continue;
      const key = `${h.name}-${r.cityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pills.push({ ...h, cityName: r.cityName, cityId: r.cityId });
    }
  }

  // Sort chronologically using sortKey
  pills.sort((a, b) => (a.sortKey ?? 999) - (b.sortKey ?? 999));

  if (pills.length === 0) return null;

  const scrollToCard = (cityId) => {
    const el = document.getElementById(cityId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-xs font-bold text-amber-700 mb-2.5 uppercase tracking-wide">
        During {dateRange} across Europe
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pills.slice(0, 12).map((p, i) => (
          <button
            key={i}
            onClick={() => scrollToCard(p.cityId)}
            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-100 transition-colors group text-left"
          >
            <CalendarIcon className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[11px] font-bold text-amber-700 whitespace-nowrap">{p.date}</span>
            <span className="text-amber-300 text-[11px]">·</span>
            <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap group-hover:text-gray-900">{p.name}</span>
            <span className="text-gray-300 text-[11px]">·</span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">{p.cityName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ResultsGrid({ results, sortBy, setSortBy, dates, onChangeDates, hideHeader = false }) {
  const sorted = useMemo(() => [...results].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "popularity") return (b.popularity ?? 0) - (a.popularity ?? 0);
    if (sortBy === "value") return (b.value ?? 0) - (a.value ?? 0);
    return 0;
  }), [results, sortBy]);

  const dateRange = formatDateRange(dates);
  const nights = getNights(dates);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        {!hideHeader && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              {dateRange ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {results.length} best cities for {dateRange}
                    {nights ? <span className="text-gray-400 font-normal text-lg"> · {nights} nights</span> : null}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Ranked by weather, crowd levels, seasonal events, and value for your exact dates.
                  </p>
                </>
              ) : (
                <h2 className="text-xl font-semibold text-gray-900">Your curated picks</h2>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {onChangeDates && dateRange && (
                <button
                  onClick={onChangeDates}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                >
                  Change dates
                </button>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-600">Sort by</label>
                <select
                  className="input rounded-full"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="score">Best Match</option>
                  <option value="popularity">Popularity</option>
                  <option value="value">Best Value</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Sort bar inside modal (when header hidden) */}
        {hideHeader && (
          <div className="flex items-center justify-between mb-4">
            {onChangeDates && (
              <button
                onClick={onChangeDates}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
              >
                ← Change dates
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-zinc-600">Sort by</label>
              <select
                className="input rounded-full"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="score">Best Match</option>
                <option value="popularity">Popularity</option>
                <option value="value">Best Value</option>
              </select>
            </div>
          </div>
        )}

        {/* Event strip — "What's happening during your trip" */}
        {dateRange && <EventStrip results={results} dateRange={dateRange} />}
      </div>

      <VirtualizedGrid items={sorted} dates={dates} />
    </section>
  );
}

function VirtualizedGrid({ items, dates }) {
  const slice = items.slice(0, 30);
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {slice.map((item, idx) => (
        <ResultCard key={item.id ?? idx} item={item} index={idx} dates={dates} />
      ))}
    </div>
  );
}
