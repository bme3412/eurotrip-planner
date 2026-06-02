'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Error boundary for the /results route. Replaces the old in-modal error state
 * ("Something went wrong scoring cities") with a route-level fallback.
 */
export default function Error({ error, reset }) {
  // redirect()/notFound() work by throwing a special error. Without this, this
  // boundary would swallow the page's redirect('/') for missing/invalid dates
  // and render the error UI instead — so re-throw those framework signals.
  const digest = typeof error?.digest === 'string' ? error.digest : '';
  const isFrameworkSignal = digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND';

  useEffect(() => {
    if (!isFrameworkSignal) console.error('Results route error:', error);
  }, [error, isFrameworkSignal]);

  if (isFrameworkSignal) {
    throw error;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong scoring cities
        </h1>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t rank cities for those dates. Please try again.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 border border-gray-200 bg-white text-sm font-semibold text-gray-700 rounded-full hover:border-gray-300 transition-colors"
          >
            ← Pick new dates
          </Link>
        </div>
      </div>
    </div>
  );
}
