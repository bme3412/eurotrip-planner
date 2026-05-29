"use client";

import React, { useMemo } from "react";
import Link from "next/link";

/**
 * ShortlistTray
 *
 * Phase 5 (lovely-baking-piglet.md): persistent floating tray at the
 * bottom of the Explore map that turns "browsing" into "planning" in
 * one click. Shows the count of shortlisted cities, the running list
 * as removable chips, and a primary CTA that hands off to
 * `/plan?cities=a,b,c`.
 *
 * Layout note: when the SelectedCityCard is open in the bottom-left,
 * the tray sits centered along the bottom edge so the two never
 * overlap on desktop. On mobile (phase 6) this will become a true
 * bottom-sheet; for now it gracefully wraps.
 */
function ShortlistTray({ items, onRemove, onClear, liftAboveCard = false }) {
  const planHref = useMemo(() => {
    const ids = items.map((it) => it.id).filter(Boolean);
    if (ids.length === 0) return "/plan";
    return `/plan?cities=${ids.map((id) => encodeURIComponent(id)).join(",")}`;
  }, [items]);

  if (!items || items.length === 0) return null;

  const count = items.length;

  return (
    <div
      // Phase 6: on mobile, when the SelectedCityCard is open we lift
      // the tray above it (bottom-[19rem] ~= card height) so it stays
      // visible. On desktop both share the canvas without collision.
      className={`pointer-events-auto absolute inset-x-0 z-30 mx-auto flex w-[min(720px,calc(100%-2rem))] flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:p-3 md:bottom-4 ${
        liftAboveCard ? "bottom-[19rem]" : "bottom-4"
      }`}
      role="region"
      aria-label="Shortlist"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {count}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your shortlist
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {items.map((it) => (
              <span
                key={it.id || it.title}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {it.title}
                <button
                  type="button"
                  onClick={() => onRemove(it)}
                  aria-label={`Remove ${it.title}`}
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Clear
          </button>
        )}
        <Link
          href={planHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Start planning
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 110-2h10.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default ShortlistTray;
