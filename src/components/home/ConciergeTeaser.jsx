'use client';

import { useState } from 'react';
import { Moon, Sunrise, Check } from 'lucide-react';

/**
 * Concierge teaser — a "coming soon" CTA for the white-glove concierge described
 * in CONCIERGE_PLAN.md. Olivier already knows your itinerary and reaches out
 * three times a day in the voice of someone who lives there. This section pitches
 * that and captures early-access signups (with a contact-channel preference).
 *
 * PLACEHOLDER: the concierge backend doesn't exist yet. The waitlist form is
 * intentionally client-only — it confirms locally and stores nothing. Wire the
 * `onJoin` handler to a real endpoint (Resend / Supabase) once the service ships.
 */

// The three scheduled touches from CONCIERGE_PLAN.md §"The daily rhythm".
const RHYTHM = [
  { icon: Moon, label: 'Evening brief', time: "tomorrow's plan, the night before" },
  { icon: Sunrise, label: 'Morning wake-up', time: 'live conditions, ~90 min before you go' },
  { icon: Moon, label: 'Wind-down', time: 'a nod to sleep, around 9pm' },
];

const CHANNELS = [
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
];

export default function ConciergeTeaser() {
  const [email, setEmail] = useState('');
  const [channels, setChannels] = useState({ push: true, email: true });
  const [joined, setJoined] = useState(false);

  const toggleChannel = (id) =>
    setChannels((prev) => ({ ...prev, [id]: !prev[id] }));

  // Placeholder: confirm locally, send nothing. Swap for a real endpoint later.
  const onJoin = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setJoined(true);
  };

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
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-7">
            {joined ? (
              <div className="flex flex-col items-center text-center gap-3 py-8">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="w-6 h-6" />
                </span>
                <p className="font-bold text-gray-900 text-lg">You&apos;re on the list</p>
                <p className="text-sm text-gray-500">
                  Olivier will be in touch before your next trip.
                </p>
              </div>
            ) : (
              <form onSubmit={onJoin}>
                <h3 className="font-bold text-gray-900 text-lg mb-4">Get early access</h3>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  aria-label="Email for early access"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />

                <p className="text-sm font-medium text-gray-700 mt-5 mb-2.5">
                  How should Olivier reach you?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {CHANNELS.map((c) => {
                    const on = channels[c.id];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleChannel(c.id)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold transition ${
                          on
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {on && <Check className="w-4 h-4" />}
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  className="mt-5 w-full inline-flex items-center justify-center px-7 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Join the early list
                </button>

                <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                  We&apos;ll only message you about your own trips. Unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
