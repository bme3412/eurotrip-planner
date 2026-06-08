'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, MapPinIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { useSavedExperiencesList } from '@/hooks/useSavedExperiencesList';
import { getFlagForCountry } from '@/utils/countryFlags';

/**
 * "Saved experiences" collection for the My Trips page — saved attractions
 * grouped by city. Brings attractions to parity with saved cities (which always
 * had a collection view here). Reads via the shared useSavedCollection lifecycle.
 */
export default function SavedExperiencesList({ onCount }) {
  const { byCity, total, loading, remove } = useSavedExperiencesList();

  useEffect(() => {
    if (typeof onCount === 'function') onCount(total);
  }, [total, onCount]);

  if (loading) {
    return <p className="py-6 text-sm text-gray-400">Loading saved experiences…</p>;
  }

  if (total === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-gray-200">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <BookmarkIcon className="size-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-display text-xl text-gray-950">No saved experiences yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
          Tap the heart on any attraction in a city guide to shortlist it for your trip.
        </p>
        <div className="mt-5 flex justify-center">
          <Link
            href="/city-guides"
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Browse city guides
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {byCity.map(({ cityName, items }) => {
        const country = items.find((it) => it.country)?.country || null;
        const flag = country ? getFlagForCountry(country) : null;
        return (
          <div key={cityName}>
            <div className="mb-3 flex items-center gap-2">
              {flag && <span aria-hidden="true">{flag}</span>}
              <Link
                href={`/city-guides/${String(cityName).toLowerCase()}`}
                className="font-display text-lg capitalize text-gray-950 hover:text-rose-600"
              >
                {cityName}
              </Link>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                {items.length} {items.length === 1 ? 'experience' : 'experiences'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const name = item.name || item.activity || item.title || 'Saved experience';
                return (
                  <article
                    key={`${cityName}:${name}`}
                    className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200/80 transition-shadow hover:shadow-soft"
                  >
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-gray-900">{name}</h4>
                      {item.category && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                          <MapPinIcon className="size-3.5" aria-hidden="true" />
                          <span className="truncate">{item.category}</span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 ring-1 ring-gray-200 transition-colors hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200"
                      aria-label={`Remove ${name}`}
                    >
                      Remove
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
