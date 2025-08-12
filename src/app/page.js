"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DateSelector from "../components/DateSelector";
import ResultsGrid from "../components/ResultsGrid";
import { useTripDates } from "../hooks/useTripDates";
import Chatbot from "../components/Chatbot";

export default function Page() {
  const { dates, setDates, toQuery } = useTripDates(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [sortBy, setSortBy] = useState("score");
  const SampleItineraryPreview = useMemo(() => dynamic(() => import("../components/SampleItineraryPreview"), { ssr: false }), []);
  const [showPreview, setShowPreview] = useState(false);
  // New: simple interest and weight inputs (optional payload for API)
  const interestOptions = ["Beaches", "Food", "Nightlife", "Museums", "Nature", "Architecture"];
  const [interests, setInterests] = useState([]);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [weights, setWeights] = useState({ weather: 0.5, crowds: 0.5, budget: 0.5 });

  const submit = async () => {
    if (!dates) return;
    setLoading(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates, interests, weights }),
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
      <header className="flex-1 flex items-center justify-center px-6 py-12 text-center">
        <div className="w-full max-w-5xl">
          <h1 className="mt-2 text-4xl md:text-6xl font-extrabold tracking-tight">
            Plan your Eurotrip in minutes — tell us <span className="text-indigo-600">when</span>, we’ll tell you <span className="text-indigo-600">where</span>
          </h1>
          <p className="mt-4 text-zinc-700 max-w-2xl mx-auto">
            Transparent scoring that blends weather, crowds, and real events. Your <span className="font-semibold">first itinerary is free</span>.
          </p>
          

          <div className="mt-8">
            <DateSelector onChange={setDates} />
            
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={submit} className="btn-primary">
                {loading ? "Generating…" : "Generate My Itinerary"}
              </button>
              <Link href={{ pathname: "/city-guides", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} className="btn-secondary">
                Browse City Guides
              </Link>
              <button type="button" onClick={() => setShowPreview(true)} className="tab bg-white/70 ring-1 ring-black/5 text-sm">
                Preview Sample
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              First itinerary free. Pro unlocks unlimited generates, exports, rescheduling, and saved trips. Recommendations include a transparent “why now”.
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

      {/* Floating AI Copilot */}
      <Chatbot />

      {/* Sample Preview Modal */}
      {showPreview && (
        <SampleItineraryPreview isOpen={showPreview} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

