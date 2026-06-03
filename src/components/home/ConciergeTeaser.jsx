'use client';

import { useState } from 'react';
import { Moon, Sunrise, Sparkles } from 'lucide-react';

/**
 * Concierge teaser — a "coming soon" CTA for the white-glove concierge described
 * in CONCIERGE_PLAN.md. The hero artifact of that product is the nightly
 * "Evening Brief", so this section dramatizes one (using the canonical voice from
 * the plan) and offers an early-access capture.
 *
 * PLACEHOLDER: the concierge backend doesn't exist yet. The waitlist form is
 * intentionally client-only — it confirms locally and stores nothing. Wire the
 * `onJoin` handler to a real endpoint (Resend / Supabase) once the service ships.
 */

// The three scheduled touches from CONCIERGE_PLAN.md §"The daily rhythm".
const RHYTHM = [
  { icon: Moon, label: 'Evening Brief', time: "tomorrow's plan, the night before" },
  { icon: Sunrise, label: 'Morning Wake-up', time: 'live conditions, ~90 min before you go' },
  { icon: Sparkles, label: 'Wind-down', time: 'a nod to the day, around 9pm' },
];

export default function ConciergeTeaser({ onScrollToDatePicker }) {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  // Placeholder: confirm locally, send nothing. Swap for a real endpoint later.
  const onJoin = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setJoined(true);
  };

  return (
    <section className="px-6 py-20 bg-gradient-to-b from-white via-blue-50/70 to-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-3">
            <span className="w-8 h-px bg-blue-600"></span>
            Coming soon · Your travel concierge
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Once you&apos;ve picked the city,{' '}
            <span className="text-blue-600">someone should sweat the details.</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            A concierge who already knows your itinerary — the depart-by time, the walkable
            route, the bakery on the way — and reaches out before you have to ask. Three quiet
            check-ins a day, in the voice of someone who lives there.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left: the daily rhythm + early-access capture */}
          <div>
            <ul className="flex flex-col gap-3 mb-8">
              {RHYTHM.map((r) => {
                const Icon = r.icon;
                return (
                  <li
                    key={r.label}
                    className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 p-4 shadow-sm"
                  >
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 shrink-0">
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

            {/* Early-access capture (placeholder) */}
            {joined ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-5 py-3.5 text-emerald-700 font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                You&apos;re on the list — we&apos;ll be in touch before your next trip.
              </div>
            ) : (
              <form onSubmit={onJoin} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  aria-label="Email for early access"
                  className="flex-1 rounded-full border border-gray-200 bg-white px-5 py-3.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 shrink-0"
                >
                  Get early access
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={onScrollToDatePicker}
              className="mt-5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
            >
              Or start with your dates →
            </button>
          </div>

          {/* Right: Evening Brief mockup — the product's hero artifact */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            {/* Brief header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold shrink-0">
                O
              </span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 leading-tight">Olivier · Evening Brief</p>
                <p className="text-xs text-gray-500">Paris · 8:00 PM, the night before</p>
              </div>
            </div>

            {/* Brief body — canonical voice from CONCIERGE_PLAN.md */}
            <div className="pt-4 space-y-3 text-[15px] leading-relaxed text-gray-700">
              <p>
                Tomorrow&apos;s Louvre slot is <strong className="text-gray-900">10am</strong> — I&apos;d
                leave the hotel by <strong className="text-gray-900">9:25</strong>.
              </p>
              <p>
                The walk over Pont des Arts is lovely in morning light; that&apos;s the route I&apos;d take.
              </p>
              <p className="text-blue-600">
                There&apos;s a Boulangerie Utopie a few doors down if you want a kouign-amann on the way.
              </p>
            </div>

            {/* Decision footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">Clear, 14°C at golden hour</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Nothing needs you tonight
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
