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

export default function DateRangePopover({ value, onChange, showSearchLabelOnSelection = true }) {
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
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2 md:gap-3">
            <Popover.Button className="flex flex-[2] items-center gap-2 md:gap-3 cursor-pointer select-none border-none bg-transparent p-0 focus:outline-none min-w-0">
              <div className="flex flex-1 items-center justify-between h-14 md:h-16 px-4 md:px-5 bg-gray-50/50 border border-gray-100 hover:border-blue-300 hover:bg-white focus-within:border-blue-500 rounded-2xl transition-all duration-200 group min-w-0">
                <span className="text-left overflow-hidden">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Check‑in</span>
                  <span className="block text-sm md:text-base font-bold text-gray-900 truncate">{display.start || "Add date"}</span>
                </span>
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div className="flex flex-1 items-center justify-between h-14 md:h-16 px-4 md:px-5 bg-gray-50/50 border border-gray-100 hover:border-blue-300 hover:bg-white focus-within:border-blue-500 rounded-2xl transition-all duration-200 group min-w-0">
                <span className="text-left overflow-hidden">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Check‑out</span>
                  <span className="block text-sm md:text-base font-bold text-zinc-900 truncate">{display.end || "Add date"}</span>
                </span>
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            </Popover.Button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (value?.start && value?.end) {
                  const submitBtn = document.querySelector('button[onClick*="submit"]');
                  if (submitBtn) submitBtn.click();
                }
              }}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-xl active:scale-95 flex-none ${
                value?.start && value?.end 
                  ? 'h-14 md:h-16 px-5 md:px-8 rounded-2xl flex items-center gap-2 md:gap-3' 
                  : 'w-14 md:w-16 h-14 md:h-16 rounded-2xl flex items-center justify-center'
              }`}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {value?.start && value?.end && showSearchLabelOnSelection && <span className="text-[10px] md:text-xs uppercase tracking-widest font-black whitespace-nowrap">Plan Trip</span>}
            </button>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Popover.Panel className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-[600px] animate-in fade-in zoom-in duration-300">
                <div className="rounded-[2.5rem] border border-blue-50 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.3)] p-2 relative">
                  {/* Close button in top right */}
                  <button 
                    onClick={() => close()}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all z-20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

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
                  
                  <div className="mt-6 flex items-center justify-center gap-3 pb-4">
                    <button
                      className="px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                      onClick={() => setTemp({ start: "", end: "" })}
                    >
                      Clear
                    </button>
                    <button
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
              </div>
              <div className="fixed inset-0 -z-10" onClick={() => close()} />
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
