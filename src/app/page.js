"use client";
import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import ResultsGrid from "../components/ResultsGrid";
import { useTripDates } from "../hooks/useTripDates";
import ScoringDemoSection from "../components/home/ScoringDemoSection";
import BestCitiesNow from "../components/home/BestCitiesNow";
import BestNowTicker from "../components/home/BestNowTicker";
import HeroWidget from "../components/home/HeroWidget";

// Lazy load Hero V2 - only imported when ?v=2 is present
const HeroV2 = dynamic(() => import("@/components/home/v2/Hero"), {
  ssr: true,
  loading: () => (
    <div className="min-h-screen bg-hero-paper flex items-center justify-center">
      <div className="animate-pulse text-hero-ink-muted">Loading...</div>
    </div>
  ),
});

function getInitialDates() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const toIso = (d) => d.toISOString().slice(0, 10);
  return { mode: "dates", start: toIso(start), end: toIso(end) };
}

// ── Results Modal ───────────────────────────────────────────────────
function ResultsModal({ results, loading, dates, sortBy, setSortBy, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);
  // Animate in after mount
  useEffect(() => {
    if (!mounted) return;
    if (loading || results.length > 0) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [mounted, loading, results.length]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  function formatDateRange(d) {
    if (!d?.start || !d?.end) return null;
    const fmt = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(d.start)} – ${fmt(d.end)}`;
  }
  function getNights(d) {
    if (!d?.start || !d?.end) return null;
    return Math.ceil((new Date(d.end) - new Date(d.start)) / 86400000);
  }

  const dateRange = formatDateRange(dates);
  const nights = getNights(dates);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[8000] flex flex-col transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Sheet — slides up from bottom */}
      <div
        className={`relative mt-auto w-full bg-white rounded-t-[2rem] shadow-[0_-20px_60px_rgba(0,0,0,0.2)] flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "92vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-sm font-semibold text-gray-600">Scoring all 220 cities…</span>
              </div>
            ) : (
              <>
                <h2 className="text-base font-bold text-gray-900">
                  {results.length} best cities
                  {dateRange && <span className="text-gray-500 font-normal"> for {dateRange}</span>}
                  {nights && <span className="text-gray-400 font-normal"> · {nights} nights</span>}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Ranked by weather, crowds, events & value for your exact dates</p>
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 pb-10">
          {loading ? (
            <LoadingState />
          ) : (
            <div className="pt-6">
              <ResultsGrid
                results={results}
                sortBy={sortBy}
                setSortBy={setSortBy}
                dates={dates}
                onChangeDates={handleClose}
                hideHeader
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function LoadingState() {
  const cards = Array.from({ length: 6 });
  return (
    <div className="pt-6">
      <div className="h-14 bg-amber-50 border border-amber-100 rounded-2xl animate-pulse mb-6" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
            <div className="h-44 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-14 bg-amber-50 rounded-xl" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page Router ─────────────────────────────────────────────────────
function PageRouter() {
  const searchParams = useSearchParams();
  const isV2 = searchParams.get("v") === "2";

  // Render Hero V2 if ?v=2 is present
  if (isV2) {
    return <HeroV2 />;
  }

  // V1 (default) rendering continues below
  return <PageV1 />;
}

// ── Page (exported with Suspense boundary) ──────────────────────────
export default function Page() {
  return (
    <Suspense fallback={<PageV1 />}>
      <PageRouter />
    </Suspense>
  );
}

// ── Page V1 (existing implementation) ─────────────────────────────────
function PageV1() {
  const initialDates = useMemo(() => getInitialDates(), []);
  const { dates, setDates } = useTripDates(initialDates);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState("score");
  const [interests] = useState([]);
  const [weights] = useState({ weather: 0.5, crowds: 0.5, budget: 0.5 });
  const dateSelectorRef = useRef(null);
  const datesRef = useRef(dates);
  useEffect(() => { datesRef.current = dates; }, [dates]);

  const scrollToDatePicker = useCallback(() => {
    dateSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    dateSelectorRef.current?.classList.add("ring-4", "ring-blue-400/60");
    setTimeout(() => {
      dateSelectorRef.current?.classList.remove("ring-4", "ring-blue-400/60");
    }, 2000);
  }, []);

  const submit = useCallback(async () => {
    const d = datesRef.current;
    if (!d?.start || !d?.end) {
      scrollToDatePicker();
      return;
    }
    setResults([]);
    setModalOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: d, interests, weights, v: 4, flat: true }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults(data.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [scrollToDatePicker, interests, weights]);

  // Listen for the search button event dispatched from DateRangePopover
  useEffect(() => {
    window.addEventListener("trip-dates-submit", submit);
    return () => window.removeEventListener("trip-dates-submit", submit);
  }, [submit]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setResults([]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Hero Section - Single column, centered */}
      <section className="relative px-6 pt-8 md:pt-12 pb-12 md:pb-16 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        </div>

        <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center text-center animate-fade-in">
          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-gray-900 font-bold tracking-tight mb-5">
            Pick your dates. We&apos;ll rank{" "}
            <span className="text-blue-600">220 European cities</span>{" "}
            for them.
          </h1>

          {/* Hero widget — tabbed describe / structured */}
          <div ref={dateSelectorRef} className="relative w-full max-w-xl animate-fade-in-safe transition-shadow duration-500">
            <div className="relative z-10">
              <HeroWidget
                dates={dates}
                onChangeDates={setDates}
                onSubmitStructured={submit}
              />
            </div>
            {/* Background blob */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100/40 to-indigo-100/40 rounded-[2.5rem] -z-0 blur-2xl"></div>
          </div>

          {/* Live ticker — single live-data proof row */}
          <div className="mt-10 w-full">
            <BestNowTicker onCityClick={() => submit()} />
          </div>

          {/* Tertiary: browse all */}
          <Link
            href="/city-guides"
            className="mt-6 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
          >
            Browse all cities
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Scoring Demo + Dynamic Rankings */}
      <ScoringDemoSection onScrollToDatePicker={scrollToDatePicker} />
      <BestCitiesNow onScrollToDatePicker={scrollToDatePicker} />

      {/* Results Modal */}
      {modalOpen && (
        <ResultsModal
          results={results}
          loading={loading}
          dates={dates}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onClose={closeModal}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-zinc-900">Euro‑Trip</h3>
              <p className="text-sm text-zinc-600">
                Plan your perfect European adventure with data-driven recommendations and seasonal insights.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900">Features</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li>Seasonal Activity Planning</li>
                <li>Weather-Based Recommendations</li>
                <li>City Connection Maps</li>
                <li>Cultural Event Calendar</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900">Coverage</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li>220+ European Cities</li>
                <li>39 Countries</li>
                <li>Monthly Activity Guides</li>
                <li>Transport Connections</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900">Explore</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li><Link href="/city-guides" className="hover:text-indigo-600 transition-colors">City Guides</Link></li>
                <li><Link href="/explore" className="hover:text-indigo-600 transition-colors">Interactive Map</Link></li>
                <li><Link href="/start-planning" className="hover:text-indigo-600 transition-colors">Start Planning</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between text-sm text-zinc-500">
            <span>© {new Date().getFullYear()} Euro‑Trip. All rights reserved.</span>
            <div className="mt-2 sm:mt-0 flex items-center space-x-4">
              <span>Made with ❤️ for European travelers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
