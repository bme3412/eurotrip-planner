'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Early-access capture for the travel agent ("Olivier"). Shared by the
 * home-page ConciergeTeaser and the per-trip travel-agent preview page.
 * Signups land in concierge_waitlist via POST /api/concierge/waitlist.
 */

const CHANNELS = [
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
];

export default function ConciergeWaitlist({ heading = 'Get early access', className = '' }) {
  const [email, setEmail] = useState('');
  const [channels, setChannels] = useState({ push: true, email: true });
  const [status, setStatus] = useState('idle'); // idle | sending | joined
  const [error, setError] = useState(null);
  const joined = status === 'joined';

  const toggleChannel = (id) =>
    setChannels((prev) => ({ ...prev, [id]: !prev[id] }));

  const onJoin = async (e) => {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const source = window.location.pathname.includes('/concierge') ? 'concierge-preview' : 'home';
      const res = await fetch('/api/concierge/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, channels, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not save your signup — try again in a moment.');
      setStatus('joined');
    } catch (err) {
      setStatus('idle');
      setError(err?.message || 'Something went wrong — try again in a moment.');
    }
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
            disabled={status === 'sending'}
            className="mt-5 w-full inline-flex items-center justify-center px-7 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:hover:bg-blue-600"
          >
            {status === 'sending' ? 'Joining…' : 'Join the early list'}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>
          )}

          <p className="text-sm text-gray-400 mt-4 leading-relaxed">
            We&apos;ll only message you about your own trips and early access — see our{' '}
            <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>. Unsubscribe anytime.
          </p>
        </form>
      )}
    </div>
  );
}
