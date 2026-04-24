"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DateRangePicker from "./DateRangePicker";
import citiesData from "@/generated/cities.json";

// ─── Date Utilities ────────────────────────────────────────────────────────

function formatShort(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toIso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function nextWeekendDates() {
  const today = new Date();
  const dow = today.getDay();
  const friOffset = (5 - dow + 7) % 7 || 7;
  const fri = addDays(today, friOffset);
  const sun = addDays(fri, 2);
  return { mode: "dates", start: toIso(fri), end: toIso(sun) };
}

function nextMonthDates() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const end = addDays(first, 7);
  return { mode: "dates", start: toIso(first), end: toIso(end) };
}

function summer2026Dates() {
  const start = new Date(2026, 6, 1);
  const end = addDays(start, 14);
  return { mode: "dates", start: toIso(start), end: toIso(end) };
}

const DATE_PRESETS = [
  { id: "weekend", label: "Next weekend", get: nextWeekendDates },
  { id: "month", label: "Next month", get: nextMonthDates },
  { id: "summer", label: "Summer 2026", get: summer2026Dates },
];

function detectActivePreset(value) {
  if (!value?.start || !value?.end) return null;
  for (const p of DATE_PRESETS) {
    const preset = p.get();
    if (preset.start === value.start && preset.end === value.end) return p.id;
  }
  return null;
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
                  <Image
                    src={city.thumbnail || "/images/city-placeholder.svg"}
                    alt={city.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover"
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
        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-gray-100 relative">
          <Image
            src={city.thumbnail || "/images/city-placeholder.svg"}
            alt={city.name}
            width={44}
            height={44}
            className="object-cover"
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

// ─── Main Component ────────────────────────────────────────────────────────

export default function TripSearchBar({ value, onChange, onSubmit, className = "", embedded = false }) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState(null); // "start" | "end" | "dates" | "addCity"
  const [startCity, setStartCity] = useState(null);
  const [endCity, setEndCity] = useState(null);

  const hasValidDates = value?.start && value?.end;
  const dateDisplay = hasValidDates
    ? `${formatShort(value.start)} – ${formatShort(value.end)}`
    : null;

  const nights = hasValidDates
    ? Math.ceil((new Date(value.end) - new Date(value.start)) / 86400000)
    : null;

  // Detect mode based on what user has filled in (Form tab only)
  const detectedMode = useMemo(() => {
    if (!startCity && !endCity && !hasValidDates) return "empty";
    if (!startCity && !endCity && hasValidDates) return "discovery";
    if (startCity && !endCity) return "roundtrip";
    if (startCity && endCity && startCity.id === endCity.id) return "roundtrip";
    if (startCity && endCity) return "openjaw";
    return "discovery";
  }, [startCity, endCity, hasValidDates]);

  // Get button text based on mode
  const buttonText = useMemo(() => {
    switch (detectedMode) {
      case "empty": return "Get started";
      case "discovery": return "Show best cities";
      case "roundtrip": return "Plan my trip";
      case "openjaw": return "Plan my route";
      default: return "Continue";
    }
  }, [detectedMode]);

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
        router.push(`/plan?mode=wizard&${params.toString()}`);
        break;

      case "openjaw":
        // Navigate to trip planner with start/end pre-filled
        if (startCity) params.set("start", startCity.id);
        if (endCity) params.set("end", endCity.id);
        if (value?.start) params.set("startDate", value.start);
        if (value?.end) params.set("endDate", value.end);
        router.push(`/plan?mode=wizard&${params.toString()}`);
        break;

      default:
        onSubmit?.({ dates: value, startCity, endCity });
    }
  };

  // Inner content — used both standalone and embedded.
  const Inner = (
    <>
      {/* City selectors */}
      <div className="grid grid-cols-2 gap-3 mb-3">
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

      {/* Merged date row: chips on the left, current selection on the right */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          {DATE_PRESETS.map((preset) => {
            const isActive = detectActivePreset(value) === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange?.(preset.get())}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActivePanel("dates")}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
          >
            Custom
          </button>
        </div>
        <button
          type="button"
          onClick={() => setActivePanel("dates")}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-b-xl hover:bg-blue-50/50 transition-colors"
        >
          <svg className={`w-4 h-4 flex-shrink-0 ${hasValidDates ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {hasValidDates ? (
            <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
              {dateDisplay}
              <span className="ml-2 text-xs font-medium text-blue-600">{nights} nights</span>
            </span>
          ) : (
            <span className="flex-1 text-sm font-medium text-gray-500">
              Select dates
            </span>
          )}
          <span className="text-xs text-gray-400">Change</span>
        </button>
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
      >
        {buttonText}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Microcopy under CTA */}
      <p className="mt-3 text-center text-xs text-gray-500">
        Free · No signup · 220 cities across 41 countries
      </p>
    </>
  );

  return (
    <div className={`w-full ${className}`}>
      {embedded ? (
        Inner
      ) : (
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100">
          {Inner}
        </div>
      )}

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
