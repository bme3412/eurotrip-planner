'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import ActivityImage from '@/components/itinerary/ActivityImage';
import { useSavedExperiencesList } from '@/hooks/useSavedExperiencesList';
import { getFlagForCountry } from '@/utils/countryFlags';

/**
 * "Saved experiences" collection for the My Trips page — saved attractions
 * grouped by city. Brings attractions to parity with saved cities (which always
 * had a collection view here). Reads via the shared useSavedCollection lifecycle.
 *
 * Cards are photo-first: experience_data carries the whole attraction object,
 * so a Google place id / coords resolve an exact photo when present, falling
 * back to name+city lookup (ActivityImage degrades to a city gradient).
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
        const citySlug = String(cityName).toLowerCase();
        return (
          <div key={cityName}>
            <div className="mb-3 flex items-center gap-2">
              {flag && <span aria-hidden="true">{flag}</span>}
              <Link
                href={`/city-guides/${citySlug}`}
                className="font-display text-lg capitalize text-gray-950 hover:text-rose-600"
              >
                {cityName}
              </Link>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                {items.length} {items.length === 1 ? 'experience' : 'experiences'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const name = item.name || item.activity || item.title || 'Saved experience';
                const placeId = item.google_place_id || item.placeId || item.place_id || null;
                const coords = item.coordinates || {};
                const lat = [item.lat, item.latitude, coords.lat].find((v) => typeof v === 'number');
                const lng = [item.lng, item.longitude, coords.lng].find((v) => typeof v === 'number');
                return (
                  <article
                    key={`${cityName}:${name}`}
                    className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative h-36 overflow-hidden">
                      <ActivityImage
                        placeId={placeId}
                        q={`${name} ${cityName}`}
                        lat={lat}
                        lng={lng}
                        citySlug={citySlug}
                        w={480}
                        alt={name}
                        className="absolute inset-0 size-full"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                      <h4 className="absolute bottom-3 left-4 right-12 font-display text-lg leading-snug text-white drop-shadow-sm">
                        {name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-white/85 ring-1 ring-white/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                        title="Remove from saved experiences"
                        aria-label={`Remove ${name}`}
                      >
                        <HeartSolid className="size-4 text-rose-500" />
                      </button>
                    </div>
                    {(item.category || item.description) && (
                      <div className="px-4 py-3">
                        {item.category && (
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                            {item.category}
                          </p>
                        )}
                        {item.description && (
                          <p className={`text-sm text-gray-600 line-clamp-2 ${item.category ? 'mt-1' : ''}`}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    )}
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
