"use client";

import { useState, useCallback, useMemo } from "react";
import { Fraunces, Inter } from "next/font/google";
import PromptBox from "./PromptBox";
import HeroMap from "./HeroMap";
import ScoreboardStrip from "./ScoreboardStrip";
import citiesData from "@/generated/cities.json";

// Fonts
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-hero",
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Hero V2 - Split layout with prompt box and interactive map.
 */
export default function HeroV2() {
  const [parsed, setParsed] = useState({
    cities: [],
    month: null,
    duration: null,
    themes: [],
  });

  // Prepare cities data for parser
  const cities = useMemo(() => citiesData, []);

  // Handle parsed changes from PromptBox
  const handleParsedChange = useCallback((newParsed) => {
    setParsed(newParsed);
  }, []);

  // Handle city click on map
  const handleCityClick = useCallback((city) => {
    // Could toggle city selection or show details
    console.log("City clicked:", city);
  }, []);

  return (
    <section
      className={`${fraunces.variable} ${inter.variable} min-h-screen bg-hero-paper`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        {/* Hero grid */}
        <div className="grid gap-12 lg:grid-cols-[minmax(480px,1fr)_minmax(520px,1.05fr)] items-start">
          {/* Left column - Prompt */}
          <div className="flex flex-col">
            {/* Eyebrow */}
            <p className="text-hero-accent font-semibold text-sm tracking-wide uppercase mb-4">
              AI-Powered Trip Planning
            </p>

            {/* Headline */}
            <h1 className="font-hero text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-hero-ink leading-[1.1] tracking-tight mb-6">
              Describe your perfect trip.{" "}
              <span className="text-hero-accent">We&apos;ll plan it.</span>
            </h1>

            {/* Subhead */}
            <p className="text-hero-ink-muted text-lg mb-8 max-w-xl">
              Tell us where you want to go, when, and what you love. Our AI ranks{" "}
              <strong className="font-semibold text-hero-ink">220 European cities</strong>{" "}
              by weather, crowds, events, and value for your dates.
            </p>

            {/* Prompt box */}
            <PromptBox cities={cities} onParsedChange={handleParsedChange} />
          </div>

          {/* Right column - Map */}
          <div className="lg:sticky lg:top-24">
            <HeroMap
              cities={parsed.cities.map((c) => ({
                id: c.id,
                name: c.name,
                lat: c.lat,
                lon: c.lon,
              }))}
              showRoute={parsed.cities.length > 1}
              onCityClick={handleCityClick}
            />

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <Stat value="220" label="Cities" />
              <Stat value="41" label="Countries" />
              <Stat value="6" label="Scoring factors" />
            </div>
          </div>
        </div>

        {/* Scoreboard section */}
        <div className="mt-20">
          <ScoreboardStrip />
        </div>
      </div>
    </section>
  );
}

/**
 * Stat component for the stats row.
 */
function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-hero-ink tabular-nums">{value}</div>
      <div className="text-sm text-hero-ink-muted">{label}</div>
    </div>
  );
}
