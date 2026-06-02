"use client";

import { useState } from "react";
import { Calendar, Pencil } from "lucide-react";
import DateRangePopover from "@/components/common/DateRangePopover";
import DescribeTripInput from "./DescribeTripInput";

/**
 * HeroWidget — date-first version.
 *
 * The headline promises "pick your dates", so the primary input is now the
 * date-range picker. Selecting a range feeds `onChange` (wired to the page's
 * trip-dates state) and the picker's own "Plan Trip" button dispatches the
 * `trip-dates-submit` event that HomeClient listens for — so the ranking is
 * scored against the user's real dates.
 *
 * Natural-language planning still lives here as a secondary mode that routes
 * through the agent at /plan.
 */
export default function HeroWidget({ value, onChange, onSubmit, submitting }) {
  const [mode, setMode] = useState("dates");

  return (
    <div className="bg-white rounded-3xl p-4 md:p-5 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100">
      {mode === "dates" ? (
        <>
          <DateRangePopover
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
          />
          <button
            type="button"
            onClick={() => setMode("describe")}
            className="mt-3.5 mx-auto flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            or describe your trip in words
            <span aria-hidden>→</span>
          </button>
        </>
      ) : (
        <>
          <DescribeTripInput />
          <button
            type="button"
            onClick={() => setMode("dates")}
            className="mt-3.5 mx-auto flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors"
          >
            <span aria-hidden>←</span>
            <Calendar className="w-3 h-3" />
            back to picking dates
          </button>
        </>
      )}
    </div>
  );
}
