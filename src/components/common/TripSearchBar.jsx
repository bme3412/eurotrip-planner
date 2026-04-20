"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
          {search ? `Results for \u201c${search}\u201d` : "Popular cities"}
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
    // Always update parent with date changes (include mode for serialization)
    onChange?.({ mode: "dates", start: next.start, end: next.end });
    // Only auto-close if both dates are selected
    if (next.start && next.end) {
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

// ─── City Button with Thumbnail ─────────────────────────────────────────────

function CityButton({ city, label, iconType, onClick }) {
  const hasCity = !!city;

  const iconColors = iconType === "start"
    ? { bg: "bg-emerald-50", icon: "text-emerald-600" }
    : { bg: "bg-rose-50", icon: "text-rose-500" };

  const Icon = iconType === "start" ? (
    <svg className={`w-4 h-4 ${iconColors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
    </svg>
  ) : (
    <svg className={`w-4 h-4 ${iconColors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all text-left group"
    >
      {/* Thumbnail or icon */}
      {hasCity ? (
        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
          <img
            src={city.thumbnail || "/images/city-placeholder.svg"}
            alt={city.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColors.bg}`}>
          {Icon}
        </div>
      )}

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-gray-900 truncate">
          {hasCity ? city.name : "Anywhere"}
        </div>
        {hasCity && (
          <div className="text-xs text-gray-500">{city.country}</div>
        )}
      </div>

      {/* Chevron */}
      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Route City Chip (for review mode) ─────────────────────────────────────

function RouteCityChip({ city, onRemove, isFirst, isLast }) {
  return (
    <div className="flex items-center gap-1">
      {!isFirst && (
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full group">
        <span className="text-sm font-medium text-gray-800">{city.name}</span>
        <button
          onClick={() => onRemove(city)}
          className="w-4 h-4 rounded-full bg-gray-300 hover:bg-red-400 flex items-center justify-center transition-colors"
        >
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Contextual Hint ───────────────────────────────────────────────────────

function ContextualHint({ detectedMode, startCity, endCity, nights, routeCities }) {
  const hints = {
    empty: {
      icon: "💡",
      text: "Select your travel dates to get started",
      subtext: null,
    },
    discovery: {
      icon: "🔍",
      text: "Find the best cities for your dates",
      subtext: nights ? `${nights} nights of possibilities` : null,
    },
    roundtrip: {
      icon: "📍",
      text: `${nights || "Your"} days in ${startCity?.name || "one city"}`,
      subtext: "We'll help plan activities and day trips",
    },
    openjaw: {
      icon: "🗺️",
      text: `${startCity?.name} → ${endCity?.name}`,
      subtext: nights ? `${nights} nights — we'll suggest the best stops` : "We'll suggest the best stops along the way",
    },
    audit: {
      icon: "✅",
      text: routeCities?.length > 0
        ? `Review: ${routeCities.map(c => c.name).join(" → ")}`
        : "Add your planned cities to review",
      subtext: routeCities?.length > 0
        ? "We'll check efficiency and suggest improvements"
        : "Build your route using the button below",
    },
  };

  const hint = hints[detectedMode] || hints.empty;

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
      <span className="text-lg">{hint.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">
          {hint.text}
        </div>
        {hint.subtext && (
          <div className="text-xs text-gray-500 mt-0.5">
            {hint.subtext}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function TripSearchBar({ value, onChange, onSubmit, className = "" }) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState(null); // "start" | "end" | "dates" | "addCity"
  const [startCity, setStartCity] = useState(null);
  const [endCity, setEndCity] = useState(null);
  const [mode, setMode] = useState("plan"); // "plan" | "review"
  const [routeCities, setRouteCities] = useState([]); // For review mode

  const hasValidDates = value?.start && value?.end;
  const dateDisplay = hasValidDates
    ? `${formatShort(value.start)} – ${formatShort(value.end)}`
    : null;

  const nights = hasValidDates
    ? Math.ceil((new Date(value.end) - new Date(value.start)) / 86400000)
    : null;

  // Detect mode based on what user has filled in
  const detectedMode = useMemo(() => {
    if (mode === "review") return "audit";
    if (!startCity && !endCity && !hasValidDates) return "empty";
    if (!startCity && !endCity && hasValidDates) return "discovery";
    if (startCity && !endCity) return "roundtrip";
    if (startCity && endCity && startCity.id === endCity.id) return "roundtrip";
    if (startCity && endCity) return "openjaw";
    return "discovery";
  }, [startCity, endCity, hasValidDates, mode]);

  // Get button text based on mode
  const buttonText = useMemo(() => {
    switch (detectedMode) {
      case "empty": return "Get started";
      case "discovery": return "Show best cities";
      case "roundtrip": return "Plan my trip";
      case "openjaw": return "Plan my route";
      case "audit": return "Audit my route";
      default: return "Continue";
    }
  }, [detectedMode]);

  // Add city to route (review mode)
  const handleAddCityToRoute = (city) => {
    if (city && !routeCities.find(c => c.id === city.id)) {
      setRouteCities([...routeCities, city]);
    }
  };

  // Remove city from route (review mode)
  const handleRemoveCityFromRoute = (city) => {
    setRouteCities(routeCities.filter(c => c.id !== city.id));
  };

  // Handle submit based on detected mode
  const handleSubmit = () => {
    const params = new URLSearchParams();

    switch (detectedMode) {
      case "empty":
        // Open date picker
        setActivePanel("dates");
        break;

      case "discovery":
        // Use existing modal behavior
        onSubmit?.({ dates: value, startCity, endCity, mode: "discovery" });
        break;

      case "roundtrip":
        // Navigate to trip planner with same start/end
        if (startCity) {
          params.set("start", startCity.id);
          params.set("end", startCity.id);
        }
        if (value?.start) params.set("startDate", value.start);
        if (value?.end) params.set("endDate", value.end);
        router.push(`/trip-planner?${params.toString()}`);
        break;

      case "openjaw":
        // Navigate to trip planner with start/end pre-filled
        if (startCity) params.set("start", startCity.id);
        if (endCity) params.set("end", endCity.id);
        if (value?.start) params.set("startDate", value.start);
        if (value?.end) params.set("endDate", value.end);
        router.push(`/trip-planner?${params.toString()}`);
        break;

      case "audit":
        // Navigate to trip planner in audit mode
        if (routeCities.length > 0) {
          params.set("mode", "audit");
          params.set("cities", routeCities.map(c => c.id).join(","));
          if (value?.start) params.set("startDate", value.start);
          if (value?.end) params.set("endDate", value.end);
          router.push(`/trip-planner?${params.toString()}`);
        } else {
          // Open city picker
          setActivePanel("addCity");
        }
        break;

      default:
        onSubmit?.({ dates: value, startCity, endCity, mode });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Plan your trip
          </h3>
          <span className="text-xs text-gray-400">
            220 cities
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("plan")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === "plan"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Plan trip
          </button>
          <button
            type="button"
            onClick={() => setMode("review")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === "review"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Review route
          </button>
        </div>

        {/* Plan mode: City selectors */}
        {mode === "plan" && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <CityButton
              city={startCity}
              label="From"
              iconType="start"
              onClick={() => setActivePanel("start")}
            />
            <CityButton
              city={endCity}
              label="To"
              iconType="end"
              onClick={() => setActivePanel("end")}
            />
          </div>
        )}

        {/* Review mode: Route builder */}
        {mode === "review" && (
          <div className="mb-4">
            {routeCities.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 p-3 bg-gray-50 rounded-xl mb-3">
                {routeCities.map((city, idx) => (
                  <RouteCityChip
                    key={city.id}
                    city={city}
                    onRemove={handleRemoveCityFromRoute}
                    isFirst={idx === 0}
                    isLast={idx === routeCities.length - 1}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center mb-3">
                <p className="text-sm text-gray-500">No cities added yet</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setActivePanel("addCity")}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm font-medium text-gray-600 hover:text-blue-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add city to route
            </button>
          </div>
        )}

        {/* Date selector */}
        <button
          type="button"
          onClick={() => setActivePanel("dates")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left mb-4 ${
            hasValidDates
              ? "bg-blue-50 border-blue-200 hover:border-blue-400"
              : "bg-gray-50 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            hasValidDates
              ? "bg-blue-600"
              : "bg-gradient-to-br from-blue-50 to-indigo-100"
          }`}>
            <svg className={`w-5 h-5 ${hasValidDates ? "text-white" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            {hasValidDates ? (
              <>
                <div className="text-sm font-semibold text-gray-900">
                  {dateDisplay}
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  {nights} nights
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">When</div>
                <div className="text-sm font-medium text-gray-500">
                  Select dates
                </div>
              </>
            )}
          </div>
          {hasValidDates && (
            <span className="text-xs text-blue-600 font-medium">Change</span>
          )}
        </button>

        {/* Contextual hint */}
        <div className="mb-4">
          <ContextualHint
            detectedMode={detectedMode}
            startCity={startCity}
            endCity={endCity}
            nights={nights}
            routeCities={routeCities}
          />
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={detectedMode === "audit" && routeCities.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {buttonText}
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

      {activePanel === "addCity" && (
        <Modal onClose={() => setActivePanel(null)}>
          <CitySearchDropdown
            value={null}
            onSelect={(city) => {
              handleAddCityToRoute(city);
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
            label="Add city to your route"
          />
        </Modal>
      )}
    </div>
  );
}
