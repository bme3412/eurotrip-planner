"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ResultsGrid from "../ResultsGrid";
import { formatDateRange, getNights } from "@/lib/utils/dates";

function LoadingState() {
  const cards = Array.from({ length: 6 });
  return (
    <div className="pt-6">
      <div className="h-14 bg-amber-50 border border-amber-100 rounded-2xl animate-pulse mb-6" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden border border-gray-100 animate-pulse"
          >
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

export default function ResultsModal({
  results,
  loading,
  error,
  dates,
  sortBy,
  setSortBy,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus management: move focus into the dialog on open, restore it on close.
  useEffect(() => {
    const previouslyFocused = typeof document !== "undefined" ? document.activeElement : null;
    const id = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (loading || results.length > 0) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [mounted, loading, results.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
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

  const dateRange = formatDateRange(dates?.start, dates?.end);
  const nights = getNights(dates?.start, dates?.end);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-modal-title"
      className={`fixed inset-0 z-[8000] flex flex-col transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet — slides up from bottom */}
      <div
        className={`relative mt-auto w-full bg-white rounded-t-[2rem] shadow-[0_-20px_60px_rgba(0,0,0,0.2)] flex flex-col transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "92vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-sm font-semibold text-gray-600">
                  Finding your best matches…
                </span>
              </div>
            ) : (
              <>
                <h2 id="results-modal-title" className="text-base font-bold text-gray-900 truncate">
                  {results.length} best cities
                  {dateRange && (
                    <span className="text-gray-500 font-normal"> for {dateRange}</span>
                  )}
                  {nights != null && (
                    <span className="text-gray-400 font-normal"> · {nights} nights</span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  Ranked by season, crowds & events for your exact dates
                </p>
              </>
            )}
          </div>
          <button
            ref={closeBtnRef}
            onClick={handleClose}
            aria-label="Close results"
            className="shrink-0 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 md:px-6 pb-10"
        >
          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">😕</div>
              <p className="text-gray-700 font-medium mb-2">{error}</p>
              <button
                onClick={handleClose}
                className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
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
