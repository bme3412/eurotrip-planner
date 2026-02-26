"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DateRangePicker from "./DateRangePicker";

function formatDisplay(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function DateRangePopover({ value, onChange, showSearchLabelOnSelection = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [temp, setTemp] = useState(value || { start: "", end: "" });
  const [mounted, setMounted] = useState(false);

  // createPortal requires browser DOM — only mount after hydration
  useEffect(() => { setMounted(true); }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    // Prevent body scroll while open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const display = useMemo(
    () => ({ start: formatDisplay(value?.start), end: formatDisplay(value?.end) }),
    [value?.start, value?.end]
  );

  const close = () => setIsOpen(false);

  const handlePickerChange = (next) => {
    setTemp(next);
    if (next.start && next.end) {
      onChange?.(next);
      close();
    }
  };

  const overlay = mounted && isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="relative w-full max-w-[620px] rounded-[2.5rem] border border-blue-50 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.3)] p-2">
            {/* Close button */}
            <button
              type="button"
              onClick={close}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <DateRangePicker
              value={temp}
              onChange={handlePickerChange}
            />

            <div className="mt-4 flex items-center justify-center gap-3 pb-4">
              <button
                type="button"
                className="px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                onClick={() => setTemp({ start: "", end: "" })}
              >
                Clear
              </button>
              <button
                type="button"
                className="px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                onClick={() => {
                  const start = new Date();
                  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 2);
                  setTemp({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
                }}
              >
                Weekend
              </button>
              <button
                type="button"
                className="px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                onClick={() => {
                  const start = new Date();
                  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
                  setTemp({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
                }}
              >
                1 week
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {/* Trigger row */}
      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => {
            setTemp(value || { start: "", end: "" });
            setIsOpen(true);
          }}
          className="flex flex-[2] items-center gap-2 md:gap-3 cursor-pointer border-none bg-transparent p-0 focus:outline-none min-w-0"
        >
          <div className="flex flex-1 items-center justify-between h-14 md:h-16 px-4 md:px-5 bg-gray-50/50 border border-gray-100 hover:border-blue-300 hover:bg-white rounded-2xl transition-all duration-200 group min-w-0">
            <span className="text-left overflow-hidden">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Check‑in</span>
              <span className="block text-sm md:text-base font-bold text-gray-900 truncate">{display.start || "Add date"}</span>
            </span>
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <div className="flex flex-1 items-center justify-between h-14 md:h-16 px-4 md:px-5 bg-gray-50/50 border border-gray-100 hover:border-blue-300 hover:bg-white rounded-2xl transition-all duration-200 group min-w-0">
            <span className="text-left overflow-hidden">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Check‑out</span>
              <span className="block text-sm md:text-base font-bold text-zinc-900 truncate">{display.end || "Add date"}</span>
            </span>
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
        </button>

        {/* Search / submit button */}
        <button
          type="button"
          onClick={() => {
            if (value?.start && value?.end) {
              // Propagate to page submit via custom event
              window.dispatchEvent(new CustomEvent("trip-dates-submit"));
            } else {
              setIsOpen(true);
            }
          }}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-xl active:scale-95 flex-none ${
            value?.start && value?.end
              ? "h-14 md:h-16 px-5 md:px-8 rounded-2xl flex items-center gap-2 md:gap-3"
              : "w-14 md:w-16 h-14 md:h-16 rounded-2xl flex items-center justify-center"
          }`}
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          {value?.start && value?.end && showSearchLabelOnSelection && (
            <span className="text-[10px] md:text-xs uppercase tracking-widest font-black whitespace-nowrap">Plan Trip</span>
          )}
        </button>
      </div>

      {overlay}
    </>
  );
}
