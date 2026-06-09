'use client';

import { ArrowDown, Sparkles } from 'lucide-react';

/**
 * A mid-page conversion band placed right after the reactive "wow" — catches
 * people at peak interest instead of only at the very bottom. Smooth-scrolls to
 * the existing waitlist form.
 */
export default function MidCta({ targetId = 'concierge-waitlist' }) {
  const jump = () => {
    const el = typeof document !== 'undefined' && document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector('input')?.focus({ preventScroll: true });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-7 text-center text-white sm:flex-row sm:text-left">
      <Sparkles className="h-6 w-6 shrink-0 text-white/80" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl font-bold">Want this on your real trips?</p>
        <p className="text-sm text-white/80">Olivier, every day, in your timezone — the moment your travel agent ships.</p>
      </div>
      <button
        type="button"
        onClick={jump}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
      >
        Get early access <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}
