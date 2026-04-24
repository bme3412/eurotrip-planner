'use client';

import Link from 'next/link';

export default function ItineraryError({ error, reset }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Couldn&apos;t load this itinerary
        </h2>
        <p className="text-gray-600 mb-6">
          The itinerary may have been deleted or there was a problem loading it.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-full hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/plan"
            className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold text-sm rounded-full hover:bg-gray-200 transition-colors"
          >
            Plan a new trip
          </Link>
        </div>
      </div>
    </div>
  );
}
