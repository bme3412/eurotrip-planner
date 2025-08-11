"use client";
import { useState } from "react";
import Link from "next/link";
import DateSelector from "../components/DateSelector";
import ResultsGrid from "../components/ResultsGrid";
import { useTripDates } from "../hooks/useTripDates";

export default function Page() {
  const { dates, setDates, toQuery } = useTripDates(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [sortBy, setSortBy] = useState("score");

  const submit = async () => {
    if (!dates) return;
    setLoading(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates }),
      });
      const data = await res.json();
      setResults(data.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <header className="flex-1 flex items-center justify-center px-6 py-16 text-center">
        <div className="w-full max-w-5xl">
          <div className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium tracking-wide bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            Eurotrip planner & itinerary resources
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
            Plan your Eurotrip — tell us <span className="text-indigo-600">when</span>, we’ll tell you <span className="text-indigo-600">where</span>
          </h1>
          <p className="mt-4 text-zinc-700 max-w-2xl mx-auto">
            Enter your dates and we rank the best European cities, festivals, and experiences for that moment in time. Build an itinerary in minutes.
          </p>

          <div className="mt-8">
            <DateSelector onChange={setDates} />
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={submit} className="btn-primary">
                {loading ? "Finding…" : "Top Itineraries"}
              </button>
              <Link href={{ pathname: "/city-guides", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} className="btn-secondary">
                Browse City Guides
              </Link>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Free to start. Pro unlocks AI itineraries, exports, and saved trips. Recommendations are ranked with a transparent scoring model.
            </p>
          </div>
        </div>
      </header>

      {/* Results */}
      {results?.length > 0 && (
        <main className="px-6 pb-20">
          <ResultsGrid results={results} sortBy={sortBy} setSortBy={setSortBy} />
        </main>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-zinc-600 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Euro‑Trip</span>
          <span>Seasonality • Crowd levels • Festival index</span>
        </div>
      </footer>
    </div>
  );
}

