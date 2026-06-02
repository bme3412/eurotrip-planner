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
      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] font-bold tracking-tight mb-5 text-gray-900">
        Pick your dates. We&apos;ll rank{" "}
        <span className="text-blue-600">220 European cities</span> for them.
      </h1>

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
        Free · No signup · Scoring{" "}
        <span className="font-semibold text-gray-700">220 cities</span>{" "}
        across 41 countries on weather, crowds &amp; events — updated hourly.
      </p>

      {/* Tertiary: browse all */}
      <Link
        href="/city-guides"
        className="mt-3 text-sm font-medium transition-colors inline-flex items-center gap-1 text-gray-500 hover:text-blue-600"
      >
        Browse all cities
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
