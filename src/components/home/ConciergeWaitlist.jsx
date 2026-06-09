'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Early-access capture for the concierge ("Olivier"). Shared by the home-page
 * ConciergeTeaser and the per-trip concierge preview page.
 *
 * PLACEHOLDER: the concierge backend doesn't exist yet (see CONCIERGE_PLAN.md).
 * This form is intentionally client-only — it confirms locally and stores
 * nothing. Wire the `onJoin` handler to a real endpoint (Resend / Supabase)
 * once the service ships.
 */

const CHANNELS = [
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
];

export default function ConciergeWaitlist({ heading = 'Get early access', className = '' }) {
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
    <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-7 ${className}`}>
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
          <h3 className="font-bold text-gray-900 text-lg mb-4">{heading}</h3>

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
  );
}
