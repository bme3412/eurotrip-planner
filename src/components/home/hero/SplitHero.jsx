"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { CINEMATIC } from "./heroImages";

/**
 * SplitHero — editorial two-column layout with a *cinematic* photo panel.
 *
 * Left: the left-aligned content core on the light background (fully legible, no
 * scrim needed since text never sits over the photo). Right: a framed panel that
 * slowly crossfades through the hero photos with a gentle push-in — the Cinematic
 * treatment, contained.
 *
 * The first frame renders fully visible from SSR (stacked CSS-opacity layers, no
 * JS-dependent reveal). Reduced motion → a single static frame, no zoom, no cycle.
 */
export default function SplitHero({ children }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setActive((n) => (n + 1) % CINEMATIC.length), 6000);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <section className="relative px-6 pt-8 md:pt-14 pb-12 md:pb-16 overflow-hidden">
      {/* calm brand glow behind the content column */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-10 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        {/* Left: content */}
        <div className="flex justify-center lg:justify-start">{children}</div>

        {/* Right: cinematic photo panel */}
        <div className="relative aspect-[4/3] rounded-[1.75rem] overflow-hidden bg-slate-900 ring-1 ring-black/5 shadow-[0_24px_70px_rgba(30,99,233,0.18)]">
          {CINEMATIC.map((img, i) => {
            const isActive = i === active;
            return (
              <div
                key={img.src}
                className="absolute inset-0"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: reduce ? "none" : `scale(${isActive ? 1.07 : 1})`,
                  transition: reduce
                    ? "none"
                    : "opacity 1400ms ease-out, transform 6400ms ease-out",
                }}
              >
                <Image
                  src={img.src}
                  alt={img.city}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
            );
          })}

          {/* gentle bottom gradient so the caption + dots read on any photo */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />

          {/* caption */}
          <span className="absolute bottom-3 left-4 text-sm font-semibold text-white drop-shadow">
            {CINEMATIC[active].city}
          </span>

          {/* position dots */}
          <span className="absolute bottom-4 right-4 flex gap-1.5">
            {CINEMATIC.map((img, i) => (
              <span
                key={img.src}
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
