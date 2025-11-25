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
      <header className="px-6 md:px-10 py-5 md:py-6 border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 md:gap-8">
          {/* Logo */}
          <div className="flex items-center">
            <span className="font-display text-2xl tracking-tight text-slate-50">
              Euro<span className="text-amber-300">Trip</span> Planner
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-4 md:gap-7">
            <button 
              onClick={submit} 
              className="btn-primary text-sm"
            >
              {loading ? "Generating…" : "Get Itineraries"}
            </button>
            <Link 
              href={{ pathname: "/city-guides", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} 
              className="text-slate-200 hover:text-amber-200 font-medium text-sm tracking-wide uppercase"
            >
              City Guides
            </Link>
            <Link
              href="/paris-trip"
              className="px-4 py-2 rounded-full border border-amber-400/60 bg-amber-50/10 text-amber-200 text-sm font-medium tracking-wide uppercase hover:bg-amber-50/20 hover:border-amber-300 transition-colors"
            >
              Paris Planner
            </Link>
            <Link 
              href="/explore" 
              className="text-slate-200 hover:text-amber-200 font-medium text-sm tracking-wide uppercase"
            >
              Explore Map
            </Link>
            <button 
              type="button" 
              onClick={() => setShowPreview(true)} 
              className="text-slate-200 hover:text-amber-200 font-medium text-sm tracking-wide uppercase"
            >
              Countries
            </button>
          </nav>
        </div>
      </header>

      {/* Distilled‑aesthetic Hero */}
      <section className="relative px-6 eu-hero overflow-hidden">
        <div className="eu-hero-orbit" />
        <div className="relative w-full max-w-6xl mx-auto eu-hero-grid">
          {/* Left: narrative & CTA */}
          <div className="flex flex-col justify-center space-y-6 animate-fade-in">
            <div>
              <h1 className="font-display text-[clamp(2.6rem,4vw,3.6rem)] leading-tight text-slate-50 mb-4">
                Design a{" "}
                <span className="text-amber-200">trip that feels curated</span>
                <br />
                not copy‑pasted from a blog.
              </h1>
              <p className="text-base md:text-lg text-slate-200/80 max-w-xl">
                Drop in your dates and let the planner stitch together cities, seasons, and
                festivals into an itinerary that actually matches how you like to travel – not a
                generic “10 days in Europe” template.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={submit}
                className="btn-primary bg-amber-300 text-slate-950 hover:bg-amber-200"
              >
                Start from my dates
              </button>
              <Link
                href="/city-guides"
                className="btn-secondary text-slate-100 bg-slate-900/60 border border-slate-500/60 hover:bg-slate-900"
              >
                Browse city guides
              </Link>
              <p className="text-xs text-slate-300/80">
                No login required • Data‑driven, not influencer‑driven
              </p>
            </div>
          </div>

          {/* Right: planner capsule */}
          <div className="relative animate-fade-in-delay mt-4 md:mt-6">
            <div className="eu-hero-card p-5 md:p-6">
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
                  Trip snapshot
                </p>
                <p className="text-[11px] text-slate-100/80">
                  Late‑September • 12 nights • Rail‑first
                </p>
              </div>

              <div className="mt-5 md:mt-6">
                <DateSelector onChange={setDates} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-slate-200/90">
                {[
                  { label: "Weather", value: "Mild days, crisp evenings", score: "◎◎◎◎" },
                  { label: "Crowds", value: "Post‑summer, theatre season starts", score: "◎◎◎" },
                  { label: "Budget", value: "Flights down, hotels sane", score: "◎◎◎◎" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-600/70 bg-slate-900/60 px-3 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug">{item.value}</p>
                    <p className="mt-1 text-[10px] text-amber-300/80">{item.score}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between text-[11px] text-slate-300/80">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-300/20 text-amber-200 text-[10px]">
                    AI
                  </span>
                  <span>Uses live seasonality, not static “best month” blurbs.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="underline underline-offset-4 decoration-amber-300/60 hover:text-amber-200"
                >
                  Peek at a sample itinerary
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Immediate Content - No Scrolling Required */}
      {results?.length === 0 && (
        <section className="px-6 py-8 mt-8 md:mt-10 bg-white rounded-t-3xl shadow-[0_-12px_40px_rgba(15,23,42,0.35)]">
          <div className="max-w-6xl mx-auto">
            {/* September Experiences - Immediately Visible */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Best Experiences in September</h2>
                  <p className="text-gray-600 text-sm">Perfect timing for festivals, harvest season, and comfortable weather</p>
                </div>
                <Link href="/city-guides" className="hidden sm:flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View all cities
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>

            {/* Mediterranean Beach Towns */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Mediterranean Paradise</h2>
                  <p className="text-gray-600 text-sm">Stunning coastlines, crystal-clear waters, and charming seaside towns</p>
                </div>
                <Link href="/city-guides" className="hidden sm:flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View all cities
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {["nice", "santorini", "valencia", "dubrovnik"]
                  .map((id) => cityById[id])
                  .filter(Boolean)
                  .map((city) => (
                    <CityCard key={city.id} city={city} />
                  ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Additional Content Sections */}
      {results?.length === 0 && (
        <section className="px-6 py-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            {/* Alpine Gems */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Hidden Alpine Treasures</h2>
                  <p className="text-gray-600 text-sm">Mountain towns with breathtaking scenery and authentic charm</p>
                </div>
                <Link href="/city-guides" className="hidden sm:flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View all cities
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {["innsbruck", "graz", "lucerne", "bern"]
                  .map((id) => cityById[id])
                  .filter(Boolean)
                  .map((city) => (
                    <CityCard key={city.id} city={city} />
                  ))}
              </div>
            </div>

            {/* Ready-Made Adventures */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Ready-Made Adventures</h2>
                  <p className="text-gray-600 text-sm">Popular routes that combine the best of Europe in perfect itineraries</p>
                </div>
                <Link href="/start-planning" className="hidden sm:flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Start planning
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Classic Capitals", subtitle: "Paris → Amsterdam → Berlin → Prague", weeks: "2 weeks", color: "blue" },
                  { title: "Mediterranean Highlights", subtitle: "Barcelona → Nice → Rome", weeks: "10–14 days", color: "green" },
                  { title: "Alpine + Lakes", subtitle: "Munich → Salzburg → Lake Bled", weeks: "1–2 weeks", color: "purple" },
                  { title: "Iberian Explorer", subtitle: "Lisbon → Porto → Madrid → Granada", weeks: "2 weeks", color: "orange" },
                ].map((trip, i) => (
                  <Link key={i} href={{ pathname: "/start-planning", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} className="group block">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-3 h-3 rounded-full bg-${trip.color}-500`}></div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">{trip.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{trip.subtitle}</p>
                        <div className="text-xs text-gray-500 font-medium">{trip.weeks}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results Section */}
      {results?.length > 0 && (
        <main className="px-6 pb-20">
          <ResultsGrid results={results} sortBy={sortBy} setSortBy={setSortBy} />
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
