"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import DateRangePicker from "./DateRangePicker";

// ─── Date Utilities ────────────────────────────────────────────────────────

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function getThisWeekend() {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun, 6=Sat
  // Find coming Friday (if today is Sat/Sun, use next Friday)
  let daysToFri = (5 - dow + 7) % 7;
  if (daysToFri === 0 && dow !== 5) daysToFri = 7; // If today is Friday, use this Friday
  if (dow === 0) daysToFri = 5; // Sunday → this Friday
  if (dow === 6) daysToFri = 6; // Saturday → next Friday

  const friday = new Date(now);
  friday.setDate(now.getDate() + daysToFri);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  return { start: toISODate(friday), end: toISODate(sunday) };
}

function getNextWeekend() {
  const thisWeekend = getThisWeekend();
  return {
    start: addDays(thisWeekend.start, 7),
    end: addDays(thisWeekend.end, 7),
  };
}

function getFromTomorrow(days) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = toISODate(tomorrow);
  const end = addDays(start, days - 1);
  return { start, end };
}

function formatShort(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFriendly(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Preset Chip ───────────────────────────────────────────────────────────

function PresetChip({ label, dateHint, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex flex-col items-center justify-center
        px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold
        transition-all duration-200 min-w-[100px]
        ${active
          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
          : "border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
        }
      `}
    >
      <span>{label}</span>
      {dateHint && (
        <span className={`text-[10px] mt-0.5 ${active ? "text-blue-100" : "text-gray-400"}`}>
          {dateHint}
        </span>
      )}
    </button>
  );
}

// ─── Start + Duration Selector ─────────────────────────────────────────────

function StartDurationSelector({ value, onChange }) {
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState(7);

  // Generate next 60 days for start date dropdown
  const startOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 1; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      options.push({
        value: toISODate(d),
        label: formatFriendly(d),
      });
    }
    return options;
  }, []);

  const durationOptions = [
    { value: 2, label: "2 days" },
    { value: 3, label: "3 days" },
    { value: 4, label: "4 days" },
    { value: 5, label: "5 days" },
    { value: 7, label: "1 week" },
    { value: 10, label: "10 days" },
    { value: 14, label: "2 weeks" },
  ];

  const handleChange = (newStart, newDuration) => {
    if (!newStart) return;
    const end = addDays(newStart, newDuration - 1);
    onChange({ mode: "dates", start: newStart, end });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-xl">
      <span className="text-sm text-gray-500 font-medium">Starting</span>
      <select
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          handleChange(e.target.value, duration);
        }}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select date...</option>
        {startOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500 font-medium">for</span>
      <select
        value={duration}
        onChange={(e) => {
          const d = parseInt(e.target.value);
          setDuration(d);
          if (startDate) handleChange(startDate, d);
        }}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {durationOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Calendar Modal ────────────────────────────────────────────────────────

function CalendarModal({ value, onChange, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [temp, setTemp] = useState(value || { start: "", end: "" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handlePickerChange = (next) => {
    setTemp(next);
    if (next.start && next.end) {
      onChange(next);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
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
        <DateRangePicker value={temp} onChange={handlePickerChange} />
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function QuickDatePicker({ value, onChange, className = "" }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  // Define presets with their date calculations
  const presets = useMemo(
    () => [
      { id: "this-weekend", label: "This Weekend", getDates: getThisWeekend },
      { id: "next-weekend", label: "Next Weekend", getDates: getNextWeekend },
      { id: "1-week", label: "1 Week", getDates: () => getFromTomorrow(7) },
      { id: "2-weeks", label: "2 Weeks", getDates: () => getFromTomorrow(14) },
    ],
    []
  );

  // Check which preset matches current value
  const activePreset = useMemo(() => {
    if (!value?.start || !value?.end) return null;
    return (
      presets.find((p) => {
        const d = p.getDates();
        return d.start === value.start && d.end === value.end;
      })?.id || null
    );
  }, [value, presets]);

  // Format selected dates for display
  const selectedDisplay = useMemo(() => {
    if (!value?.start || !value?.end) return null;
    return `${formatShort(value.start)} – ${formatShort(value.end)}`;
  }, [value]);

  const handlePresetClick = (preset) => {
    const dates = preset.getDates();
    onChange?.({ mode: "dates", ...dates });
    setShowCustom(false);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Tier 1: Preset chips */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {presets.map((preset) => {
          const dates = preset.getDates();
          const hint = `${formatShort(dates.start)} – ${formatShort(dates.end)}`;
          return (
            <PresetChip
              key={preset.id}
              label={preset.label}
              dateHint={hint}
              active={activePreset === preset.id}
              onClick={() => handlePresetClick(preset)}
            />
          );
        })}
      </div>

      {/* Selected dates display */}
      {selectedDisplay && !activePreset && (
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {selectedDisplay}
          </span>
        </div>
      )}

      {/* Tier 2 & 3: Custom options toggle */}
      <div className="flex justify-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`text-gray-500 hover:text-blue-600 transition-colors ${showCustom ? "text-blue-600 font-medium" : ""}`}
        >
          {showCustom ? "Hide options" : "Custom dates"}
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={() => setShowCalendar(true)}
          className="text-gray-500 hover:text-blue-600 transition-colors"
        >
          Pick exact dates
        </button>
      </div>

      {/* Tier 2: Start + Duration selector */}
      {showCustom && (
        <div className="mt-4">
          <StartDurationSelector value={value} onChange={onChange} />
        </div>
      )}

      {/* Tier 3: Calendar modal */}
      {showCalendar && (
        <CalendarModal
          value={value}
          onChange={(dates) => {
            onChange?.({ mode: "dates", ...dates });
            setShowCalendar(false);
          }}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
