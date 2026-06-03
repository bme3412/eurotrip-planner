"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { CINEMATIC } from "./heroImages";
import heroPhotos from "./heroPhotos.json";

// Only show hero stops that have a real Google Places photo. The home hero
// never displays a bundled placeholder/AI image — if a stop has no curated
// photo it is simply left out of the rotation.
const SLIDES = CINEMATIC
  .map((c) => ({ ...c, google: heroPhotos[c.key] || null }))
  .filter((c) => c.google);

/**
 * One stacked slide showing only the real Google Places photo, loaded via the
 * /api/google-photos proxy and faded in over a neutral gradient. While it loads
 * (or on the rare proxy failure) a plain slate gradient is shown — never an AI
 * image. Google attribution is shown only while the photo is actually visible
 * (required by the Places API terms).
 */
function HeroSlide({ slide, isActive, priority, reduce }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const google = slide.google;
  const proxyUrl = google && !failed
    ? `/api/google-photos?name=${encodeURIComponent(google.photoName)}&w=1400`
    : null;
  const showAttribution = google && loaded && !failed && google.attribution;

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: isActive ? 1 : 0,
        transform: reduce ? "none" : `scale(${isActive ? 1.07 : 1})`,
        transition: reduce ? "none" : "opacity 1400ms ease-out, transform 6400ms ease-out",
      }}
    >
      {/* Neutral placeholder shown until the real photo loads (never an AI image) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />

      {/* Real Google Places photo — the only image the hero ever shows */}
      {proxyUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxyUrl}
          alt={slide.city}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="absolute inset-0 w-full h-full object-cover saturate-[1.05] contrast-[1.03] transition-opacity duration-700"
          style={{ opacity: loaded ? 1 : 0, objectPosition: slide.pos }}
        />
      )}

      {/* bottom gradient so caption + credit read on any photo */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />

      {/* city caption + Google attribution */}
      <div className="absolute bottom-3 left-4 leading-tight">
        <span className="block text-sm font-semibold text-white drop-shadow">{slide.city}</span>
        {showAttribution && (
          <a
            href={google.attribution.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[10px] text-white/70 hover:text-white transition-colors"
          >
            Photo: {google.attribution.name} · Google
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * SplitHero — editorial two-column layout with a cinematic photo panel.
 *
 * Left: the left-aligned content core on the light background. Right: a framed panel
 * that slowly crossfades through the hero shots with a gentle push-in. Real Google
 * Places photos are used where available (with attribution); the bundled images
 * remain as the base/fallback. Reduced motion → a single static frame.
 */
export default function SplitHero({ children }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setActive((n) => (n + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [reduce]);

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
              reduce={reduce}
            />
          ))}

          {/* soft inner vignette for cinematic depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 90px rgba(0,0,0,0.28)" }}
          />

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
