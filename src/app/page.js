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
      {/* Clean Header */}
      <header className="px-6 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              EuroExplorer
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <button 
              onClick={submit} 
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {loading ? "Generating…" : "Get Itineraries"}
            </button>
            <Link 
              href={{ pathname: "/city-guides", query: dates ? Object.fromEntries(new URLSearchParams(toQuery())) : undefined }} 
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              City Guides
            </Link>
            <Link 
              href="/explore" 
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Explore Map
            </Link>
            <button 
              type="button" 
              onClick={() => setShowPreview(true)} 
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Countries
            </button>
          </nav>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative px-6 py-16 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        
        <div className="relative w-full max-w-6xl mx-auto">
          {/* Main headline with better hierarchy */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Plan your perfect <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                European adventure
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover hidden gems, avoid tourist traps, and create unforgettable memories with our 
              <span className="font-semibold text-gray-800"> AI-powered trip planner</span> that knows Europe inside out.
            </p>
          </div>

          {/* Compact search interface */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-1">When do you want to travel?</h2>
                <p className="text-gray-600 text-sm">Get personalized recommendations based on your travel dates</p>
              </div>
              <DateSelector onChange={setDates} />
              
              {/* Quick action buttons */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <button 
                  onClick={() => setDates({ mode: "dates", ...getNextWeekendRange() })}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  This Weekend
                </button>
                <button 
                  onClick={() => setDates({ mode: "dates", start: addDays("", 30), end: addDays("", 37) })}
                  className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  Next Month
                </button>
                <button 
                  onClick={() => setDates({ mode: "dates", start: addDays("", 90), end: addDays("", 97) })}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                  Summer Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Immediate Content - No Scrolling Required */}
      {results?.length === 0 && (
        <section className="px-6 py-8 bg-white">
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

