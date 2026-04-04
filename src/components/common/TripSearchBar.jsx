"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import DateRangePicker from "./DateRangePicker";
import citiesData from "@/generated/cities.json";

// ─── Date Utilities ────────────────────────────────────────────────────────

function formatShort(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Popular cities for quick selection ────────────────────────────────────

const POPULAR_CITIES = [
  "Paris", "London", "Rome", "Barcelona", "Amsterdam",
  "Berlin", "Prague", "Vienna", "Lisbon", "Athens"
];

// ─── Modal wrapper ─────────────────────────────────────────────────────────

function Modal({ children, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ─── City Search Dropdown ──────────────────────────────────────────────────

function CitySearchDropdown({ value, onSelect, onClose, label }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const popularCities = useMemo(() => {
    return citiesData.filter(c => POPULAR_CITIES.includes(c.name));
  }, []);

  const filteredCities = useMemo(() => {
    if (!search) return popularCities;
    const lower = search.toLowerCase();
    return citiesData
      .filter((c) =>
        c.name.toLowerCase().includes(lower) ||
        c.country.toLowerCase().includes(lower)
      )
      .slice(0, 12);
  }, [search, popularCities]);

  return (
    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">{label}</h3>
        <p className="text-sm text-gray-500 mt-0.5">Optional - leave blank if flexible</p>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search 220 cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Flexible option */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => { onSelect(null); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            !value
              ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
              : "bg-gray-50 border-2 border-transparent hover:border-gray-200 text-gray-600"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-semibold">I&apos;m flexible</div>
            <div className="text-xs text-gray-500">Show me all options</div>
          </div>
          {!value && (
            <svg className="w-5 h-5 text-blue-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Section label */}
      <div className="px-5 pt-3 pb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {search ? `Results for \u201c${search}\u201d` : "Popular starting points"}
        </span>
      </div>

      {/* City grid */}
      <div className="max-h-[320px] overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {filteredCities.map((city) => {
            const isSelected = value?.id === city.id;
            return (
              <button
                key={city.id}
                onClick={() => { onSelect(city); onClose(); }}
                className={`relative group rounded-xl overflow-hidden transition-all ${
                  isSelected
                    ? "ring-2 ring-blue-500 ring-offset-2"
                    : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-1"
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-[4/3] relative">
                  <img
                    src={city.thumbnail || "/images/city-placeholder.svg"}
                    alt={city.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* City info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="font-semibold text-white text-sm drop-shadow-lg">
                      {city.name}
                    </div>
                    <div className="text-white/80 text-xs drop-shadow">
                      {city.country}
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filteredCities.length === 0 && search && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No cities found for &ldquo;{search}&rdquo;</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Date Selector Panel ───────────────────────────────────────────────────

function DatePanel({ value, onChange, onClose }) {
  const handlePickerChange = (next) => {
    if (next.start && next.end) {
      onChange?.({ mode: "dates", ...next });
      onClose();
    }
  };

  return (
    <div className="relative w-full max-w-[620px] rounded-3xl bg-white shadow-2xl p-2">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all z-20"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <DateRangePicker value={value || { start: "", end: "" }} onChange={handlePickerChange} />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function TripSearchBar({ value, onChange, onSubmit, className = "" }) {
  const [activePanel, setActivePanel] = useState(null); // "start" | "end" | "dates"
  const [startCity, setStartCity] = useState(null);
  const [endCity, setEndCity] = useState(null);
  const [mode, setMode] = useState("plan"); // "plan" | "review"

  const hasValidDates = value?.start && value?.end;
  const dateDisplay = hasValidDates
    ? `${formatShort(value.start)} – ${formatShort(value.end)}`
    : "Select dates";

  const nights = hasValidDates
    ? Math.ceil((new Date(value.end) - new Date(value.start)) / 86400000)
    : null;

  const handleSubmit = () => {
    onSubmit?.({
      startCity,
      endCity,
      dates: value,
      mode
    });
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-blue-50">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-3">
            Plan your trip
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            Where do you want to go?
          </h3>
          <p className="text-gray-500 text-base">
            Tell us your start and end points, and we&apos;ll suggest the best cities to visit
          </p>
        </div>

        {/* Search fields - 3 in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Starting City */}
          <button
            type="button"
            onClick={() => setActivePanel("start")}
            className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400 font-medium">Starting city</div>
              <div className="text-sm font-semibold text-gray-900 truncate">
                {startCity ? startCity.name : "I'm flexible"}
              </div>
            </div>
          </button>

          {/* Ending City */}
          <button
            type="button"
            onClick={() => setActivePanel("end")}
            className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400 font-medium">Ending city</div>
              <div className="text-sm font-semibold text-gray-900 truncate">
                {endCity ? endCity.name : "I'm flexible"}
              </div>
            </div>
          </button>

          {/* Dates */}
          <button
            type="button"
            onClick={() => setActivePanel("dates")}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left ${
              hasValidDates
                ? "bg-blue-50 border-blue-200 hover:border-blue-400"
                : "bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              hasValidDates
                ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                : "bg-gradient-to-br from-blue-100 to-indigo-100"
            }`}>
              <svg className={`w-4 h-4 ${hasValidDates ? "text-white" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400 font-medium">Travel dates</div>
              <div className={`text-sm font-semibold truncate ${hasValidDates ? "text-blue-700" : "text-gray-900"}`}>
                {dateDisplay}
                {nights && <span className="text-blue-500 font-normal ml-1">· {nights}n</span>}
              </div>
            </div>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <button
            type="button"
            onClick={() => setMode("plan")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all flex-1 ${
              mode === "plan"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              mode === "plan" ? "border-blue-500" : "border-gray-300"
            }`}>
              {mode === "plan" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <span className="text-sm font-medium">Help me plan my trip</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("review")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all flex-1 ${
              mode === "review"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              mode === "review" ? "border-blue-500" : "border-gray-300"
            }`}>
              {mode === "review" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <span className="text-sm font-medium">I have an itinerary - review it</span>
          </button>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          {mode === "plan" ? "Start planning" : "Review my itinerary"}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      {/* Modals */}
      {activePanel === "start" && (
        <Modal onClose={() => setActivePanel(null)}>
          <CitySearchDropdown
            value={startCity}
            onSelect={setStartCity}
            onClose={() => setActivePanel(null)}
            label="Where are you starting?"
          />
        </Modal>
      )}

      {activePanel === "end" && (
        <Modal onClose={() => setActivePanel(null)}>
          <CitySearchDropdown
            value={endCity}
            onSelect={setEndCity}
            onClose={() => setActivePanel(null)}
            label="Where are you ending?"
          />
        </Modal>
      )}

      {activePanel === "dates" && (
        <Modal onClose={() => setActivePanel(null)}>
          <DatePanel
            value={value}
            onChange={onChange}
            onClose={() => setActivePanel(null)}
          />
        </Modal>
      )}
    </div>
  );
}
