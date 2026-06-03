"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { CINEMATIC } from "./heroImages";
import heroPhotos from "./heroPhotos.json";

// Only show hero stops that have a baked local photo (see heroPhotos.json,
// produced by scripts/fetchHomeHeroPhotos.mjs). The home hero never displays a
// bundled placeholder/AI image — a stop with no curated photo is left out.
const SLIDES = CINEMATIC
  .map((c) => ({ ...c, google: heroPhotos[c.key] || null }))
  .filter((c) => c.google?.local);

/**
 * One stacked photo layer — a curated city photo from a LOCAL static file
 * (baked from Google Places), cross-faded in/out by opacity only. There is no
 * zoom/Ken-Burns push-in (it read as unsettling), and crucially nothing in this
 * layer is transformed, so the panel-level caption never gets pushed past the
 * clipped bottom edge. Local files load instantly and cache cleanly, so the
 * neutral placeholder is only ever a brief first-paint state.
 */
function HeroSlide({ slide, isActive, priority }) {
  const [loaded, setLoaded] = useState(false);
  const google = slide.google;

  return (
    <div
      className="absolute inset-0 transition-opacity duration-[1200ms] ease-out"
      style={{ opacity: isActive ? 1 : 0 }}
    >
      {/* Neutral placeholder shown until the real photo loads (never an AI image) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />

      {/* Curated city photo — local static file, optimized + cached by next/image */}
      {google?.local && (
        <Image
          src={google.local}
          alt={slide.city}
          fill
          sizes="(min-width: 1024px) 560px, 90vw"
          onLoad={() => setLoaded(true)}
          priority={priority}
          className="object-cover saturate-[1.05] contrast-[1.03] transition-opacity duration-700"
          style={{ opacity: loaded ? 1 : 0, objectPosition: slide.pos }}
        />
      )}
    </div>
  );
}

/**
 * SplitHero — editorial two-column layout with a cinematic photo panel.
 *
 * Left: the left-aligned content core. Right: a framed panel that gently
 * crossfades through curated city photos (no zoom). The caption + Google
 * attribution and the bottom scrim live at the PANEL level (outside the fading
 * photo layers) so they stay fixed, fully legible, and never clipped by the
 * panel's rounded/overflow-hidden edge. Reduced motion → a single static frame.
 */
export default function SplitHero({ children }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce || SLIDES.length <= 1) return undefined;
    const id = setInterval(() => setActive((n) => (n + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [reduce]);

  const activeSlide = SLIDES[active];
  const attribution = activeSlide?.google?.attribution;

  return (
    <section className="relative px-6 pt-8 md:pt-14 pb-12 md:pb-16 overflow-hidden">
      {/* calm cool-tone glows behind the content column */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 left-4 w-80 h-80 bg-sky-200/35 rounded-full blur-3xl" />
        <div className="absolute top-40 left-44 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        {/* Left: content */}
        <div className="flex justify-center lg:justify-start">{children}</div>

        {/* Right: cinematic photo panel */}
        <div className="relative aspect-[4/3] rounded-[1.75rem] overflow-hidden bg-slate-900 ring-1 ring-black/5 shadow-[0_24px_70px_rgba(30,99,233,0.18)]">
          {SLIDES.map((slide, i) => (
            <HeroSlide
              key={slide.key}
              slide={slide}
              isActive={i === active}
              priority={i === 0}
            />
          ))}

          {/* soft inner vignette for cinematic depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 90px rgba(0,0,0,0.28)" }}
          />

          {/* bottom scrim so the caption + credit read on any photo (panel-level) */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

          {/* caption + Google attribution — panel-level so they never clip or
              shift with the crossfade; reflects the active slide */}
          {activeSlide && (
            <div className="absolute bottom-4 left-5 right-20 leading-snug">
              <span className="block text-sm font-semibold text-white drop-shadow">{activeSlide.city}</span>
              {attribution && (
                <a
                  href={attribution.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[10px] text-white/75 hover:text-white transition-colors"
                >
                  Photo: {attribution.name} · Google
                </a>
              )}
            </div>
          )}

          {/* position dots */}
          <span className="absolute bottom-4 right-4 flex gap-1.5">
            {SLIDES.map((slide, i) => (
              <span
                key={slide.key}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === active ? "w-4 bg-white/90" : "w-1.5 bg-white/45"
                }`}
              />
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
