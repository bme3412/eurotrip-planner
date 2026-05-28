"use client";

import DescribeTripInput from "./DescribeTripInput";

/**
 * HeroWidget — single-input version.
 *
 * The previous two-tab UI ("Describe your trip" / "Pick dates & route") was
 * collapsed into one input. The structured date-picker flow now lives in
 * deeper surfaces (BestCitiesNow, /plan), and the hero focuses on the
 * natural-language entry point that routes through the agent at /plan.
 *
 * Removing the lazy-loaded TripSearchBar tab also eliminates the
 * `h-14` → ~220px skeleton swap that was the main source of hero CLS.
 */
export default function HeroWidget() {
  return (
    <div className="bg-white rounded-3xl p-4 md:p-5 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100">
      <DescribeTripInput />
    </div>
  );
}
