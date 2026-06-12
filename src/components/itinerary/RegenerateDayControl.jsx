'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';

/**
 * "Redo this day" — per-day regeneration with free-text steering, on the saved
 * itinerary page. Two-phase: preview the proposed day (grounded server-side in
 * the city's real candidate pool, no duplicates with other days), then Apply.
 * Nothing changes until Apply succeeds; the page reloads to pick up the new day.
 */
export default function RegenerateDayControl({ tripId, dayNumber, authHeaders }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | previewing | preview | applying
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  const preview = async () => {
    setPhase('previewing');
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/regenerate-day`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ dayNumber, direction: direction.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.plan) throw new Error(data.error || 'Couldn’t redo this day right now.');
      setPlan(data.plan);
      setPhase('preview');
    } catch (err) {
      setError(err.message);
      setPhase('idle');
    }
  };

  const apply = async () => {
    setPhase('applying');
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/regenerate-day`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ dayNumber, apply: true, plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Couldn’t apply the new day.');
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setPhase('preview');
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
        title="Regenerate this day"
      >
        <RefreshCw className="h-3 w-3" /> Redo day
      </button>
    );
  }

  return (
    <div className="w-64 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-left shadow-sm sm:w-72">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Redo day {dayNumber}</p>
        <button
          type="button"
          aria-label="Close"
          onClick={() => { setOpen(false); setPhase('idle'); setPlan(null); setError(null); }}
          className="text-gray-400 transition hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {phase !== 'preview' && phase !== 'applying' && (
        <>
          <textarea
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            rows={2}
            placeholder="Optional: how should it change? (“slower morning, more food, keep Sainte-Chapelle”)"
            className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none"
          />
          <button
            type="button"
            disabled={phase === 'previewing'}
            onClick={preview}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {phase === 'previewing' ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Planning a new day…</>
            ) : (
              'Preview new day'
            )}
          </button>
        </>
      )}

      {(phase === 'preview' || phase === 'applying') && plan && (
        <div className="mt-2">
          {plan.theme && <p className="text-sm font-semibold text-gray-900">{plan.theme}</p>}
          {plan.summary && <p className="mt-0.5 text-xs leading-snug text-gray-600">{plan.summary}</p>}
          <ul className="mt-2 space-y-1">
            {plan.blocks.map((b, i) => (
              <li key={i} className="flex items-baseline gap-2 text-xs text-gray-700">
                <span className="w-10 shrink-0 font-semibold tabular-nums text-blue-600">{b.startTime || '—'}</span>
                <span className="min-w-0">{b.name}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={phase === 'applying'}
              onClick={apply}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {phase === 'applying' ? <><Loader2 className="h-3 w-3 animate-spin" /> Applying…</> : 'Apply'}
            </button>
            <button
              type="button"
              disabled={phase === 'applying'}
              onClick={() => { setPlan(null); setPhase('idle'); }}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 transition hover:border-gray-300"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-medium text-amber-700">{error}</p>}
    </div>
  );
}
