"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import DateRangePicker from "./DateRangePicker";

function formatDisplay(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return iso;
  }
}

export default function DateRangePopover({ value, onChange }) {
  const [temp, setTemp] = useState(value || { start: "", end: "" });
  const initialLoaded = useRef(false);

  const display = useMemo(
    () => ({ start: formatDisplay(value?.start), end: formatDisplay(value?.end) }),
    [value?.start, value?.end]
  );

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <Popover.Button as="div" className="flex items-center gap-3 md:gap-4 cursor-pointer select-none">
              <div className="input flex items-center justify-between h-12 px-4 bg-white border-2 border-zinc-200 hover:border-indigo-300 focus-within:border-indigo-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-200" style={{ width: 240 }}>
                <span className="text-left">
                  <span className="block text-xs font-semibold text-zinc-600">Check‑in</span>
                  <span className="block text-sm font-medium text-zinc-900">{display.start || "Add date"}</span>
                </span>
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                </svg>
              </div>
              <div className="input flex items-center justify-between h-12 px-4 bg-white border-2 border-zinc-200 hover:border-indigo-300 focus-within:border-indigo-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-200" style={{ width: 240 }}>
                <span className="text-left">
                  <span className="block text-xs font-semibold text-zinc-600">Check‑out</span>
                  <span className="block text-sm font-medium text-zinc-900">{display.end || "Add date"}</span>
                </span>
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                </svg>
              </div>
            </Popover.Button>
            <button 
              onClick={() => {
                if (value?.start && value?.end) {
                  // Trigger the search functionality
                  console.log('Search triggered with dates:', value);
                }
              }}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-300 ${
                value?.start && value?.end 
                  ? 'h-12 px-6 rounded-full flex items-center gap-2' 
                  : 'w-12 h-12 rounded-full flex items-center justify-center shrink-0 flex-shrink-0'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {value?.start && value?.end && <span>Search</span>}
            </button>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
                        <Popover.Panel className="absolute z-30 mt-2 w-[min(92vw,640px)] max-h-[80vh] overflow-y-auto">
              <div className="rounded-xl border border-black/10 bg-white/95 backdrop-blur shadow-2xl p-1">
                <DateRangePicker
                  value={open && !initialLoaded.current ? value : temp}
                  onChange={(next) => {
                    if (!initialLoaded.current) initialLoaded.current = true;
                    setTemp(next);
                    // Auto-apply when both dates are selected
                    if (next.start && next.end) {
                      onChange?.(next);
                      initialLoaded.current = false;
                      close();
                    }
                  }}
                />
                            <div className="mt-3 flex items-center justify-center gap-1">
                              <button
                                className="px-2 py-1 text-xs font-medium rounded bg-white/70 ring-1 ring-black/5 hover:bg-white/90 transition-colors"
                                onClick={() => setTemp({ start: "", end: "" })}
                              >
                                Clear
                              </button>
                              <button
                                className="px-2 py-1 text-xs font-medium rounded bg-white/70 ring-1 ring-black/5 hover:bg-white/90 transition-colors"
                                onClick={() => {
                                  const start = new Date();
                                  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 2);
                                  setTemp({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
                                }}
                              >
                                Weekend
                              </button>
                              <button
                                className="px-2 py-1 text-xs font-medium rounded bg-white/70 ring-1 ring-black/5 hover:bg-white/90 transition-colors"
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
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}


