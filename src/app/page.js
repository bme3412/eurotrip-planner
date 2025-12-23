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
    if (!dates?.start || !dates?.end) {
      const dateSelector = document.getElementById("date-selector-card");
      if (dateSelector) {
        dateSelector.scrollIntoView({ behavior: "smooth", block: "center" });
        dateSelector.classList.add("ring-4", "ring-blue-400/50", "scale-[1.02]");
        setTimeout(() => {
          dateSelector.classList.remove("ring-4", "ring-blue-400/50", "scale-[1.02]");
        }, 2000);
      }
      return;
    }
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Header */}
      <header className="px-6 md:px-10 py-3 bg-white/90 backdrop-blur-md border-b border-blue-200/30 shadow-sm z-50">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
          {/* Logo */}
          <div className="flex items-center">
            <span className="font-display text-2xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
              Euro<span className="text-blue-500">Trip</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <button 
              onClick={submit} 
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
            >
              {loading ? "Generating…" : "Get Itinerary"}
            </button>
            <Link 
              href={{ pathname: "/city-guides", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} 
              className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              City Guides
            </Link>
            <Link
              href="/paris-trip"
              className="px-4 py-2 rounded-full border-2 border-blue-300 bg-white text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Paris
            </Link>
            <Link 
              href="/explore" 
              className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Explore
            </Link>
            <button 
              type="button" 
              onClick={() => setShowPreview(true)} 
              className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Countries
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-4 md:pt-6 lg:pt-8 pb-24 md:pb-32 lg:pb-40 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: narrative & CTA */}
          <div className="flex flex-col animate-fade-in lg:pr-8">
            <h1 className="font-display text-6xl md:text-7xl lg:text-[100px] leading-[0.8] text-gray-900 font-bold mb-4 tracking-tighter">
              Discover <br />
              <span className="text-blue-600">Europe</span><br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 bg-clip-text text-transparent">
                your way
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 leading-tight mb-8 max-w-md">
              Get personalized city recommendations based on your dates, with real-time insights on weather, crowds, and seasonal events.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <button
                onClick={submit}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
              >
                <span className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      Get My Itinerary
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              <Link
                href="/city-guides"
                className="px-8 py-4 bg-white text-blue-600 text-base font-bold rounded-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Browse All Cities
              </Link>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              No signup required • Free to use • Data-driven insights
            </div>
          </div>

          {/* Right: Date selector card */}
          <div id="date-selector-card" className="relative animate-fade-in-delay transition-all duration-500 lg:mt-0 mt-8">
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-blue-50 relative z-10">
              <div className="mb-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-3">
                  Step 1: Choose Dates
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {dates?.start && dates?.end ? 'Your Travel Dates' : 'When are you traveling?'}
                </h3>
                <p className="text-gray-500 text-base font-medium">
                  {dates?.start && dates?.end 
                    ? `${Math.ceil((new Date(dates.end) - new Date(dates.start)) / (1000 * 60 * 60 * 24))} nights in Europe`
                    : 'Select your dates for personalized insights'}
                </p>
              </div>

              <div className="flex justify-center lg:justify-start">
                <DateSelector onChange={setDates} />
              </div>
            </div>
            
            {/* Background blob for the card */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100/40 to-indigo-100/40 rounded-[2.5rem] -z-0 blur-2xl"></div>
          </div>
        </div>
      </section>

      {/* Immediate Content - No Scrolling Required */}
      {results?.length === 0 && (
        <section className="px-6 py-16 bg-white rounded-t-[3rem] shadow-[0_-12px_40px_rgba(0,0,0,0.03)] border-t border-blue-50">
          <div className="max-w-7xl mx-auto">
            {/* September Experiences - Immediately Visible */}
            <div className="mb-16">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                    <span className="w-8 h-px bg-blue-600"></span>
                    Seasonal Highlights
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Best Experiences in September</h2>
                  <p className="text-gray-500 text-lg max-w-2xl font-medium">Perfect timing for festivals, harvest season, and comfortable weather across the continent.</p>
                </div>
                <Link href="/city-guides" className="hidden sm:flex items-center gap-2 px-6 py-3 bg-gray-50 text-blue-600 hover:bg-blue-50 rounded-full font-bold text-sm transition-all group">
                  View all cities
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="mb-16">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                    <span className="w-8 h-px bg-blue-600"></span>
                    Summer Vibes
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Mediterranean Paradise</h2>
                  <p className="text-gray-500 text-lg max-w-2xl font-medium">Stunning coastlines, crystal-clear waters, and charming seaside towns with endless sunshine.</p>
                </div>
                <Link href="/city-guides" className="hidden sm:flex items-center gap-2 px-6 py-3 bg-gray-50 text-blue-600 hover:bg-blue-50 rounded-full font-bold text-sm transition-all group">
                  Explore Beaches
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
        <section className="px-6 py-20 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            {/* Alpine Gems */}
            <div className="mb-20">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                    <span className="w-8 h-px bg-indigo-600"></span>
                    Natural Beauty
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Hidden Alpine Treasures</h2>
                  <p className="text-gray-500 text-lg max-w-2xl font-medium">Mountain towns with breathtaking scenery and authentic charm for the perfect escape.</p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {["innsbruck", "graz", "lucerne", "bern"]
                  .map((id) => cityById[id])
                  .filter(Boolean)
                  .map((city) => (
                    <CityCard key={city.id} city={city} />
                  ))}
              </div>
            </div>

            {/* Ready-Made Adventures */}
            <div>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-3">
                  <span className="w-4 h-px bg-blue-600"></span>
                  Start Exploring
                  <span className="w-4 h-px bg-blue-600"></span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Ready-Made Adventures</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">Popular routes that combine the best of Europe in perfect itineraries.</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Classic Capitals", subtitle: "Paris → Amsterdam → Berlin → Prague", weeks: "2 weeks", color: "blue" },
                  { title: "Mediterranean Highlights", subtitle: "Barcelona → Nice → Rome", weeks: "10–14 days", color: "green" },
                  { title: "Alpine + Lakes", subtitle: "Munich → Salzburg → Lake Bled", weeks: "1–2 weeks", color: "purple" },
                  { title: "Iberian Explorer", subtitle: "Lisbon → Porto → Madrid → Granada", weeks: "2 weeks", color: "orange" },
                ].map((trip, i) => (
                  <Link key={i} href={{ pathname: "/start-planning", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} className="group block h-full">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl bg-${trip.color}-50 flex items-center justify-center text-${trip.color}-600 group-hover:bg-${trip.color}-500 group-hover:text-white transition-colors duration-300`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {trip.weeks}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{trip.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">{trip.subtitle}</p>
                      </div>
                      <div className="pt-6 border-t border-gray-50 flex items-center justify-between text-blue-600 font-bold text-sm">
                        Plan this trip
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
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
