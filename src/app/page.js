"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DateSelector from "../components/DateSelector";
import ResultsGrid from "../components/ResultsGrid";
import { useTripDates } from "../hooks/useTripDates";
import Chatbot from "../components/Chatbot";
import CityCard from "../components/city-guides/CityCard";
import { getCitiesData } from "../components/city-guides/cityData";

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

  // Curated helpers
  const allCities = useMemo(() => getCitiesData(), []);
  const cityById = useMemo(() => Object.fromEntries(allCities.map(c => [c.id, c])), [allCities]);

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
      <header className="flex-1 flex items-center justify-center px-6 py-10 text-center">
        <div className="w-full max-w-5xl">
          {/* Top nav pills */}
          <div className="flex justify-center gap-2">
            <button onClick={submit} className="tab tab-active text-white">
              {loading ? "Generating…" : "Generate My Itinerary"}
            </button>
            <Link href={{ pathname: "/city-guides", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} className="tab bg-white/70 ring-1 ring-black/5 text-sm">
              Browse City Guides
            </Link>
            <button type="button" onClick={() => setShowPreview(true)} className="tab bg-white/70 ring-1 ring-black/5 text-sm">
              Preview Sample
            </button>
          </div>
          <h1 className="mt-0 text-4xl md:text-6xl font-extrabold tracking-tight">
            Plan your <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent">Eurotrip</span> in minutes — tell us <span className="text-indigo-600">when</span>, we’ll tell you <span className="text-indigo-600">where</span>
          </h1>
          <p className="mt-4 text-zinc-700 max-w-2xl mx-auto">
            Transparent scoring that blends weather, crowds, and real events. Your <span className="font-semibold">first itinerary is free</span>.
          </p>
          

          <div className="mt-8">
            <DateSelector onChange={setDates} />
            <p className="mt-3 text-xs text-zinc-500">
              First itinerary free. Pro unlocks unlimited generates, exports, rescheduling, and saved trips. Recommendations include a transparent “why now”.
            </p>
          </div>
        </div>
      </header>

      {/* Results or Curated Sections */}
      {results?.length > 0 ? (
        <main className="px-6 pb-20">
          <ResultsGrid results={results} sortBy={sortBy} setSortBy={setSortBy} />
        </main>
      ) : (
        <main className="px-6 pb-20">
          <div className="mx-auto max-w-6xl space-y-12">
            {/* September Experiences */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">Best Experiences in September</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  "munich", // Oktoberfest
                  "barcelona", // La Mercè
                  "venice", // Regata Storica
                  "nice",
                ]
                  .map((id) => cityById[id])
                  .filter(Boolean)
                  .map((city) => (
                    <CityCard key={city.id} city={city} />
                  ))}
              </div>
            </section>

            {/* Mediterranean Beach Towns */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">Best Mediterranean Beach Towns</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {["nice", "santorini", "valencia", "dubrovnik"]
                  .map((id) => cityById[id])
                  .filter(Boolean)
                  .map((city) => (
                    <CityCard key={city.id} city={city} />
                  ))}
              </div>
            </section>

            {/* Alpine Gems */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">Overlooked Alpine Gems</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {["innsbruck", "graz", "lucerne", "bern"]
                  .map((id) => cityById[id])
                  .filter(Boolean)
                  .map((city) => (
                    <CityCard key={city.id} city={city} />
                  ))}
              </div>
            </section>

            {/* Popular Eurotrips */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">Popular Eurotrips</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Classic Capitals", subtitle: "Paris → Amsterdam → Berlin → Prague", weeks: "2 weeks" },
                  { title: "Mediterranean Highlights", subtitle: "Barcelona → Nice → Rome", weeks: "10–14 days" },
                  { title: "Alpine + Lakes", subtitle: "Munich → Salzburg → Lake Bled", weeks: "1–2 weeks" },
                  { title: "Iberian Explorer", subtitle: "Lisbon → Porto → Madrid → Granada", weeks: "2 weeks" },
                ].map((trip, i) => (
                  <Link key={i} href={{ pathname: "/start-planning", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} className="card p-5 hover:-translate-y-0.5 transition bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-zinc-800">{trip.title}</div>
                        <div className="text-sm text-zinc-600">{trip.subtitle}</div>
                        <div className="mt-2 text-xs text-zinc-500">{trip.weeks}</div>
                      </div>
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
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

