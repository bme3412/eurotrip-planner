"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DateSelector from "../components/DateSelector";
import ResultsGrid from "../components/ResultsGrid";
import { useTripDates } from "../hooks/useTripDates";
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
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">EuroExplorer</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            <button onClick={submit} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">{loading ? "Generating…" : "Itineraries"}</span>
            </button>
            <Link href={{ pathname: "/city-guides", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">City Guides</span>
            </Link>
            <button type="button" onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Countries</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="px-6 py-8">
        <div className="w-full max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
            Plan your <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent">Eurotrip</span> in minutes
          </h1>
          
          <div className="max-w-2xl mx-auto">
            <DateSelector onChange={setDates} />
          </div>
        </div>
      </section>

      {/* Results or Curated Sections */}
      {results?.length > 0 ? (
        <main className="px-6 pb-20">
          <ResultsGrid results={results} sortBy={sortBy} setSortBy={setSortBy} />
        </main>
      ) : (
        <main className="px-6 pb-20 pt-4">
          <div className="mx-auto max-w-6xl space-y-8">
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
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-zinc-900">Euro‑Trip</h3>
              <p className="text-sm text-zinc-600">
                Plan your perfect European adventure with data-driven recommendations and seasonal insights.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900">Features</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li>Seasonal Activity Planning</li>
                <li>Weather-Based Recommendations</li>
                <li>City Connection Maps</li>
                <li>Cultural Event Calendar</li>
              </ul>
            </div>

            {/* Coverage */}
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900">Coverage</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li>125+ European Cities</li>
                <li>30+ Countries</li>
                <li>Monthly Activity Guides</li>
                <li>Transport Connections</li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900">Support</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between text-sm text-zinc-500">
            <span>© {new Date().getFullYear()} Euro‑Trip. All rights reserved.</span>
            <div className="mt-2 sm:mt-0 flex items-center space-x-4">
              <span>Made with ❤️ for European travelers</span>
            </div>
          </div>
        </div>
      </footer>


      {/* Sample Preview Modal */}
      {showPreview && (
        <SampleItineraryPreview isOpen={showPreview} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

