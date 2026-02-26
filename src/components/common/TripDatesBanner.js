'use client';

import { useState } from 'react';
import Link from 'next/link';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Renders a slim contextual banner when the user arrives at a city guide
 * (or other page) with trip dates in the URL query params.
 *
 * Usage: pass { start, end } from searchParams.
 */
export default function TripDatesBanner({ start, end }) {
  const [dismissed, setDismissed] = useState(false);

  if (!start || !end || dismissed) return null;

  const nights = Math.ceil(
    (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="w-full bg-blue-600 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-medium truncate">
            Viewing for your dates:{' '}
            <span className="font-bold">
              {formatDate(start)} – {formatDate(end)}
            </span>
            {nights > 0 && (
              <span className="opacity-75"> · {nights} {nights === 1 ? 'night' : 'nights'}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/?mode=dates&start=${start}&end=${end}#results`}
            className="text-white/80 hover:text-white underline underline-offset-2 text-xs font-medium transition-colors"
          >
            Change dates
          </Link>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-white/60 hover:text-white transition-colors p-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
