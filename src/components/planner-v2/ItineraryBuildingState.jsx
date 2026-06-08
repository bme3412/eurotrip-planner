'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { getFlagForCountry } from '@/utils/countryFlags';
import { buildBuildSteps } from '@/lib/planning/buildSteps';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Calm, route-aware loading state shown while an itinerary generates. Replaces
 * the generic pulsing skeleton: it walks the user's actual route (map → each
 * city → transfers → polish) on a smooth timed sequence and holds on the last
 * step until the request resolves and the parent swaps to the result.
 */
export default function ItineraryBuildingState({ tripState }) {
  const steps = useMemo(() => buildBuildSteps(tripState), [tripState]);
  const reduced = useMemo(prefersReducedMotion, []);
  const lastIndex = steps.length - 1;
  const [active, setActive] = useState(0);

  // Advance through the steps, then hold on the final "Polishing" step until the
  // response lands (the parent unmounts this on completion).
  useEffect(() => {
    if (reduced || active >= lastIndex) return undefined;
    const id = setTimeout(() => setActive((i) => Math.min(i + 1, lastIndex)), 1100);
    return () => clearTimeout(id);
  }, [active, lastIndex, reduced]);

  // 0 → ~92% across the steps; the final snap to 100% happens when this unmounts.
  const pct = reduced ? 60 : Math.min(92, Math.round((active / Math.max(1, lastIndex)) * 92));

  return (
    <div className="rounded-2xl border border-[#e5e0d8] bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6f18]">
        Designing your trip
      </p>
      <h3 className="mt-1 font-display text-lg font-semibold text-[#2a2520]">
        Building your day-by-day itinerary
      </h3>

      {/* Smooth determinate-feeling progress bar (no pulsing). */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#f0ece2]">
        <div
          className="h-full rounded-full bg-[#c9a227] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {steps.map((step, i) => {
          const done = !reduced && i < active;
          const current = !reduced && i === active;
          const flag = step.city?.country ? getFlagForCountry(step.city.country) : null;
          const nights = Number.isFinite(step.city?.nights) ? step.city.nights : null;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  done
                    ? 'border-[#c9a227] bg-[#c9a227] text-white'
                    : current
                      ? 'border-[#c9a227] bg-[#fbf3da] text-[#8a6f18]'
                      : 'border-[#e5e0d8] bg-white text-transparent'
                }`}
                aria-hidden="true"
              >
                {done ? <Check className="h-3 w-3" /> : current ? '•' : ''}
              </span>
              <span
                className={`min-w-0 text-sm ${
                  done ? 'text-[#8a8578]' : current ? 'font-medium text-[#2a2520]' : 'text-[#b5b0a8]'
                }`}
              >
                {flag && <span className="mr-1.5" aria-hidden="true">{flag}</span>}
                {step.label}
                {nights != null && (
                  <span className="ml-1.5 text-xs text-[#b5b0a8]">
                    · {nights} {nights === 1 ? 'night' : 'nights'}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
