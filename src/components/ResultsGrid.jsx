import ResultCard from "./ResultCard";

export default function ResultsGrid({ results, sortBy, setSortBy }) {
  const sorted = [...results].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "popularity") return (b.popularity ?? 0) - (a.popularity ?? 0);
    if (sortBy === "value") return (b.value ?? 0) - (a.value ?? 0);
    return 0;
  });

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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((item, idx) => (
          <ResultCard key={item.id} item={item} index={idx} />)
        )}
      </div>
    </section>
  );
}

