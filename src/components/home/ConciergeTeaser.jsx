'use client';

import { Moon, Sunrise } from 'lucide-react';
import ConciergeWaitlist from './ConciergeWaitlist';

/**
 * Concierge teaser — a "coming soon" CTA for the white-glove concierge described
 * in CONCIERGE_PLAN.md. Olivier already knows your itinerary and reaches out
 * three times a day in the voice of someone who lives there. This section pitches
 * that and captures early-access signups (via the shared ConciergeWaitlist form).
 */

// The three scheduled touches from CONCIERGE_PLAN.md §"The daily rhythm".
const RHYTHM = [
  { icon: Moon, label: 'Evening brief', time: "tomorrow's plan, the night before" },
  { icon: Sunrise, label: 'Morning wake-up', time: 'live conditions, ~90 min before you go' },
  { icon: Moon, label: 'Wind-down', time: 'a nod to sleep, around 9pm' },
];

export default function ConciergeTeaser() {
  return (
    <section className="px-6 py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-5xl mx-auto rounded-3xl border border-amber-100/80 bg-[#faf8f3] p-8 md:p-12 shadow-sm">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left: the pitch + daily rhythm */}
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-4">
              Coming soon · Olivier, your concierge
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-[1.1]">
              Like knowing someone in every city.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Olivier already has your itinerary. He knows when the rain&apos;s coming, which
              entrance has the shorter line, and the café just off the tourist drag — and he
              tells you the night before, not when you finally think to ask.
            </p>

            <ul className="flex flex-col gap-5">
              {RHYTHM.map((r) => {
                const Icon = r.icon;
                return (
                  <li key={r.label} className="flex items-start gap-4">
                    <span className="flex items-center justify-center text-blue-600 shrink-0 mt-0.5 border-b-2 border-blue-200 pb-1">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 leading-tight">{r.label}</p>
                      <p className="text-sm text-gray-500">{r.time}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right: early-access capture (placeholder) */}
          <ConciergeWaitlist />
        </div>
      </div>
    </section>
  );
}
