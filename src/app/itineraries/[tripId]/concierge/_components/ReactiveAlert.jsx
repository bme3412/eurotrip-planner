'use client';

import { useState } from 'react';
import { CloudRain, Zap, ArrowRight } from 'lucide-react';
import OlivierMark from './OlivierMark';

/**
 * The reactive beat — the magic. Olivier only speaks up when something material
 * changes. A "simulate" toggle reveals the alert so users feel the proactivity.
 */
export default function ReactiveAlert({ reactive }) {
  const [fired, setFired] = useState(false);
  if (!reactive?.body) return null;

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-6 md:p-7">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
        <Zap className="h-3.5 w-3.5" /> Reactive · only when it matters
      </div>
      <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-gray-900">
        He speaks up when the day changes.
      </h3>
      <p className="mt-2 text-gray-600">
        The three daily messages are the rhythm. The real magic is the fourth — the one that only comes when
        something shifts. Watch what happens when the forecast turns.
      </p>

      {!fired ? (
        <button
          type="button"
          onClick={() => setFired(true)}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:shadow-md"
        >
          <CloudRain className="h-4 w-4" /> Simulate a rainy afternoon
        </button>
      ) : (
        <div className="mt-5 animate-fade-in rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100">
          <div className="flex items-start gap-3">
            <OlivierMark size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-900">{reactive.trigger}</span>
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-gray-700">{reactive.body}</p>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <span>{reactive.action}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
