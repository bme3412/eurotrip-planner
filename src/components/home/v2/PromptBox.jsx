"use client";

import { useState, useRef, useEffect, useCallback, useDeferredValue, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil } from "lucide-react";
import { parsePrompt, buildPlanUrl } from "@/lib/prompt-parser";
import ChipTray from "./ChipTray";

const EXAMPLES = [
  "5 days in Paris over Christmas",
  "Lisbon to Rome by train in late April",
  "Family trip with kids 8 and 11, Amsterdam area",
  "10 nights in Spain, beach + tapas, no cities I have already been",
  "2 weeks exploring the Balkans on a budget",
];

const ROTATE_INTERVAL_MS = 3800;

/**
 * PromptBox - Natural language input with real-time parsing.
 *
 * @param {Object} props
 * @param {Array} props.cities - City data for parsing
 * @param {Function} props.onParsedChange - Called with parsed result on each change
 */
export default function PromptBox({ cities = [], onParsedChange }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const taRef = useRef(null);

  // Use deferred value for smooth typing
  const deferredText = useDeferredValue(text);

  // Parse the input
  const parsed = useMemo(() => {
    return parsePrompt(deferredText, { cities });
  }, [deferredText, cities]);

  // Track manual overrides (user dismissed a chip)
  const [overrides, setOverrides] = useState({
    removedCities: new Set(),
    removedMonth: false,
    removedDuration: false,
    removedThemes: new Set(),
  });

  // Apply overrides to parsed result
  const filteredParsed = useMemo(() => {
    return {
      ...parsed,
      cities: parsed.cities.filter(c => !overrides.removedCities.has(c.id)),
      month: overrides.removedMonth ? null : parsed.month,
      duration: overrides.removedDuration ? null : parsed.duration,
      themes: parsed.themes.filter(t => !overrides.removedThemes.has(t.key)),
    };
  }, [parsed, overrides]);

  // Notify parent of parsed changes
  useEffect(() => {
    onParsedChange?.(filteredParsed);
  }, [filteredParsed, onParsedChange]);

  // Auto-resize textarea
  const autoSize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  useEffect(() => {
    autoSize();
  }, [text, autoSize]);

  // Rotating placeholder
  useEffect(() => {
    // Skip rotation if focused, has content, or prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isFocused || text.length > 0 || prefersReducedMotion) return;

    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % EXAMPLES.length);
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isFocused, text.length]);

  // Reset overrides when text changes significantly
  useEffect(() => {
    setOverrides({
      removedCities: new Set(),
      removedMonth: false,
      removedDuration: false,
      removedThemes: new Set(),
    });
  }, [deferredText]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const trimmed = text.trim();
    if (trimmed) {
      const url = buildPlanUrl(trimmed, filteredParsed);
      router.push(url);
    } else {
      router.push("/plan");
    }
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl + Enter to submit
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
      return;
    }

    // Backspace on empty position removes last chip
    if (e.key === "Backspace" && taRef.current?.selectionStart === 0 && taRef.current?.selectionEnd === 0) {
      // Remove in reverse order: themes, duration, month, cities
      if (filteredParsed.themes.length > 0) {
        const lastTheme = filteredParsed.themes[filteredParsed.themes.length - 1];
        handleRemoveTheme(lastTheme.key);
        e.preventDefault();
      } else if (filteredParsed.duration) {
        handleRemoveDuration();
        e.preventDefault();
      } else if (filteredParsed.month) {
        handleRemoveMonth();
        e.preventDefault();
      } else if (filteredParsed.cities.length > 0) {
        const lastCity = filteredParsed.cities[filteredParsed.cities.length - 1];
        handleRemoveCity(lastCity.id);
        e.preventDefault();
      }
    }
  };

  const applyExample = (example) => {
    setText(example);
    setOverrides({
      removedCities: new Set(),
      removedMonth: false,
      removedDuration: false,
      removedThemes: new Set(),
    });
    requestAnimationFrame(() => taRef.current?.focus());
  };

  // Chip removal handlers
  const handleRemoveCity = (cityId) => {
    setOverrides((prev) => ({
      ...prev,
      removedCities: new Set([...prev.removedCities, cityId]),
    }));
  };

  const handleRemoveMonth = () => {
    setOverrides((prev) => ({ ...prev, removedMonth: true }));
  };

  const handleRemoveDuration = () => {
    setOverrides((prev) => ({ ...prev, removedDuration: true }));
  };

  const handleRemoveTheme = (themeKey) => {
    setOverrides((prev) => ({
      ...prev,
      removedThemes: new Set([...prev.removedThemes, themeKey]),
    }));
  };

  const currentPlaceholder = EXAMPLES[placeholderIndex];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Main input card */}
      <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:border-hero-accent focus-within:ring-2 focus-within:ring-hero-accent/20 transition-all">
        {/* Textarea */}
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={2}
          placeholder={currentPlaceholder}
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-hero-ink placeholder:text-gray-400 focus:outline-none"
          style={{ maxHeight: "180px" }}
          aria-label="Describe your trip"
        />

        {/* Chip tray */}
        <div className="px-4">
          <ChipTray
            cities={filteredParsed.cities}
            month={filteredParsed.month}
            duration={filteredParsed.duration}
            themes={filteredParsed.themes}
            onRemoveCity={handleRemoveCity}
            onRemoveMonth={handleRemoveMonth}
            onRemoveDuration={handleRemoveDuration}
            onRemoveTheme={handleRemoveTheme}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Pencil className="w-3 h-3" />
            Cities, dates, who you are going with — anything goes
          </span>
          <span className="sm:hidden" />
          <span className="text-[10px] text-gray-400 hidden md:inline">
            <kbd className="px-1 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500">
              ⌘ ↵
            </kbd>{" "}
            to send
          </span>
        </div>
      </div>

      {/* Example chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 self-center mr-1">
          Try
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => applyExample(ex)}
            className="px-2.5 py-1 rounded-full text-xs text-gray-600 bg-gray-50 border border-gray-200 hover:bg-hero-accent-soft hover:border-hero-accent/30 hover:text-hero-accent transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-4 bg-hero-accent text-white text-base font-bold rounded-xl hover:bg-hero-accent/90 transition-all shadow-lg shadow-hero-accent/25 hover:shadow-xl hover:shadow-hero-accent/30 hover:-translate-y-0.5 active:translate-y-0"
      >
        {text.trim() ? "Plan this trip" : "Start a conversation"}
        <ArrowRight className="w-5 h-5" />
      </button>

      <p className="mt-3 text-center text-xs text-gray-500">
        Free · No signup · 220 cities across 41 countries
      </p>
    </form>
  );
}
