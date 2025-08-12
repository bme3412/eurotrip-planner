"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import DateRangePicker from "./DateRangePicker";

function formatDisplay(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
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
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            <Popover.Button className="input flex items-center justify-between h-11 px-3" style={{ width: 220 }}>
              <span className="text-left">
                <span className="block text-xs text-zinc-500">Check‑in</span>
                <span className="block">{display.start || "Select date"}</span>
              </span>
              <span className="text-zinc-400">📅</span>
            </Popover.Button>
            <Popover.Button className="input flex items-center justify-between h-11 px-3" style={{ width: 220 }}>
              <span className="text-left">
                <span className="block text-xs text-zinc-500">Check‑out</span>
                <span className="block">{display.end || "Select date"}</span>
              </span>
              <span className="text-zinc-400">📅</span>
            </Popover.Button>
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
            <Popover.Panel className="absolute z-30 mt-2 w-[min(92vw,740px)]">
              <div className="rounded-xl border border-black/10 bg-white/95 backdrop-blur shadow-2xl p-4">
                <DateRangePicker
                  value={open && !initialLoaded.current ? value : temp}
                  onChange={(next) => {
                    if (!initialLoaded.current) initialLoaded.current = true;
                    setTemp(next);
                  }}
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex gap-2 text-xs">
                    <button
                      className="tab bg-white/70 ring-1 ring-black/5"
                      onClick={() => setTemp({ start: "", end: "" })}
                    >
                      Clear
                    </button>
                    <button
                      className="tab bg-white/70 ring-1 ring-black/5"
                      onClick={() => {
                        const start = new Date();
                        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 2);
                        setTemp({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
                      }}
                    >
                      Weekend
                    </button>
                    <button
                      className="tab bg-white/70 ring-1 ring-black/5"
                      onClick={() => {
                        const start = new Date();
                        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
                        setTemp({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
                      }}
                    >
                      1 week
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setTemp(value || { start: "", end: "" });
                        close();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        onChange?.(temp);
                        initialLoaded.current = false;
                        close();
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}


