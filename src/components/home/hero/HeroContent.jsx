"use client";

import Link from "next/link";
import HeroWidget from "../HeroWidget";

/**
 * The hero's content core — headline, date widget, proof line, browse link.
 *
 * Left-aligned to pair with SplitHero's cinematic photo panel. The widget and its
 * `submit` wiring are the conversion core; everything else is supporting copy.
 */
export default function HeroContent({
  dateSelectorRef,
  dates,
  setDates,
  onSubmit,
  submitting,
}) {
  return (
    <div className="relative w-full max-w-3xl mx-0 items-start text-left flex flex-col animate-fade-in">
      {/* Headline */}
      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] font-bold tracking-tight mb-4 text-gray-900">
        Pick your dates. We&apos;ll plan{" "}
        <span className="text-blue-600">the whole trip</span> around them.
      </h1>

      {/* Sub-headline — frames the breadth: not just a ranking */}
      <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed max-w-xl mb-7">
        The right cities for your season, day-by-day itineraries, and 327 in-depth
        guides across Europe — all built around when you actually go.
      </p>

      {/* Hero widget — date picker first, natural language second */}
      <div
        ref={dateSelectorRef}
        className="relative w-full max-w-xl animate-fade-in-safe transition-shadow duration-500"
      >
        <div className="relative z-10">
          <HeroWidget
            value={{ start: dates?.start, end: dates?.end }}
            onChange={(next) =>
              setDates({ mode: "dates", start: next.start, end: next.end })
            }
            onSubmit={onSubmit}
            submitting={submitting}
          />
        </div>
        {/* Background blob */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100/40 to-indigo-100/40 rounded-[2.5rem] -z-0 blur-2xl"></div>
      </div>

      {/* Single freshness / proof line */}
      <p className="mt-6 text-sm font-medium text-gray-500">
        Free · No signup ·{" "}
        <span className="font-semibold text-gray-700">327 city guides</span>{" "}
        across 40 countries, ranked for your exact dates on weather, crowds &amp; events.
      </p>

      {/* Tertiary: browse all */}
      <Link
        href="/city-guides"
        className="mt-3 text-sm font-medium transition-colors inline-flex items-center gap-1 text-gray-500 hover:text-blue-600"
      >
        Browse all 327 city guides
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
