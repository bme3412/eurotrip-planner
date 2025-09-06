import dynamic from "next/dynamic";
import { useMemo } from "react";
const ResultCard = dynamic(() => import("./ResultCard"));

export default function ResultsGrid({ results, sortBy, setSortBy }) {
  const sorted = useMemo(() => [...results].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "popularity") return (b.popularity ?? 0) - (a.popularity ?? 0);
    if (sortBy === "value") return (b.value ?? 0) - (a.value ?? 0);
    return 0;
  }), [results, sortBy]);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your curated picks</h2>
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

      <VirtualizedGrid items={sorted} />
    </section>
  );
}

function VirtualizedGrid({ items }) {
  // Simple windowing: render only up to 30 cards (10 per column set), adjust as needed
  const slice = items.slice(0, 30);
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {slice.map((item, idx) => (
        <ResultCard key={item.id ?? idx} item={item} index={idx} />
      ))}
    </div>
  );
}

