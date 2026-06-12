'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import ActivityImage from '@/components/itinerary/ActivityImage';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist, useWishlistList } from '@/hooks/useWishlist';
import { setPending } from '@/lib/savedItems/pendingSave';
import { getFlagForCountry } from '@/utils/countryFlags';

const GUEST_NUDGE_SESSION_KEY = 'eurotrip.wishlist.guestNudgeShown';

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
}

function shouldShowGuestNudge() {
  const storage = getSessionStorage();
  if (!storage) return false;
  try { return storage.getItem(GUEST_NUDGE_SESSION_KEY) !== '1'; } catch { return false; }
}

function markGuestNudgeShown() {
  const storage = getSessionStorage();
  if (!storage) return;
  try { storage.setItem(GUEST_NUDGE_SESSION_KEY, '1'); } catch {}
}

export default function SaveToTrips({
  cityName,
  cityData,
  className = '',
  showLabel = true,
  variant = 'default', // 'default' | 'hero'
}) {
  const { isSaved, loading, toggle, isGuest } = useWishlist(cityName, cityData);
  const { signInWithGoogle } = useAuth();
  const [notification, setNotification] = useState(null);

  const showNotificationMessage = useCallback((value) => {
    setNotification(value);
    setTimeout(() => setNotification(null), value?.cta ? 6000 : 3000);
  }, []);

  const handleSaveToggle = useCallback(async () => {
    const { action } = await toggle();
    if (action === 'added') {
      if (isGuest && shouldShowGuestNudge()) {
        markGuestNudgeShown();
        // Soft gate: the city is already saved locally; record intent so the
        // post-sign-in committer knows to surface it, then nudge to sign in.
        setPending('city', { cityName });
        showNotificationMessage({
          text: 'Saved — sign in to keep these across devices',
          cta: 'signIn',
        });
      } else {
        showNotificationMessage('Added to wishlists!');
      }
    } else if (action === 'removed') {
      showNotificationMessage('Removed from wishlists');
    } else if (action === 'noop') {
      showNotificationMessage('Error saving');
    }
  }, [toggle, showNotificationMessage, isGuest, cityName]);

  const handleNudgeSignIn = useCallback(async () => {
    setNotification(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('[SaveToTrips] sign-in failed', err);
    }
  }, [signInWithGoogle]);

  // Style variants
  const getButtonStyles = () => {
    if (variant === 'hero') {
      return isSaved
        ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg'
        : 'bg-white/20 backdrop-blur-sm text-white border border-white/40 hover:bg-white/30 hover:border-white/60';
    }
    return isSaved
      ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-rose-300';
  };

  const iconSize = variant === 'hero' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <>
      <button
        onClick={handleSaveToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${getButtonStyles()} ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {isSaved ? (
          <HeartSolid className={iconSize} />
        ) : (
          <HeartOutline className={iconSize} />
        )}
        {showLabel && (
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        )}
      </button>

      {notification && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            {isSaved ? (
              <HeartSolid className="w-5 h-5 text-rose-400" />
            ) : (
              <HeartOutline className="w-5 h-5 text-gray-400" />
            )}
            <span>{typeof notification === 'string' ? notification : notification.text}</span>
            {typeof notification === 'object' && notification.cta === 'signIn' && (
              <button
                type="button"
                onClick={handleNudgeSignIn}
                className="ml-2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Component to view saved trips - works with both Supabase and localStorage
export function SavedTripsList({ onCount }) {
  const { user } = useAuth();
  const { savedTrips, loading, remove } = useWishlistList();

  useEffect(() => {
    if (typeof onCount === 'function') onCount(savedTrips.length);
  }, [savedTrips.length, onCount]);

  if (loading) {
    return <p className="py-6 text-sm text-gray-400">Loading saved cities…</p>;
  }

  if (savedTrips.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-gray-200">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <HeartOutline className="size-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-display text-xl text-gray-950">No saved cities yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
          {user
            ? 'Tap the heart on any city guide to save it here for trip planning.'
            : 'Sign in to sync your wishlists across devices — or save cities as a guest and we will remember them on this browser.'}
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {savedTrips.map((trip) => {
        const flag = trip.country ? getFlagForCountry(trip.country) : null;
        const guideHref = `/city-guides/${trip.cityName.toLowerCase()}`;
        return (
          <article
            key={trip.cityName}
            className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Link href={guideHref} className="absolute inset-0 z-10" aria-label={`View guide for ${trip.displayName}`} />

            <div className="relative h-52 overflow-hidden bg-gray-100">
              {trip.image ? (
                <Image
                  src={trip.image}
                  alt={trip.displayName}
                  width={600}
                  height={400}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                // No baked image → resolve a real city photo (degrades to a
                // city-tinted gradient), never a gray placeholder icon. Query the
                // locality ("Paris, France"), not "<city> skyline" — the latter
                // text-matches venues like "Skyline Bar".
                <ActivityImage
                  q={trip.country ? `${trip.displayName || trip.cityName}, ${trip.country}` : (trip.displayName || trip.cityName)}
                  citySlug={trip.cityName.toLowerCase()}
                  w={600}
                  alt={trip.displayName}
                  className="absolute inset-0 size-full"
                />
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {flag && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-gray-800 ring-1 ring-white/60 backdrop-blur-sm">
                  <span aria-hidden="true">{flag}</span>
                  <span>{trip.country}</span>
                </span>
              )}

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(trip); }}
                className="absolute top-3 right-3 z-20 inline-flex size-9 items-center justify-center rounded-full bg-white/85 ring-1 ring-white/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                title="Remove from wishlists"
                aria-label={`Remove ${trip.displayName} from wishlists`}
              >
                <HeartSolid className="size-5 text-rose-500" />
              </button>

              <h3 className="absolute left-4 right-4 bottom-3 font-display text-2xl text-white drop-shadow-sm">
                {trip.displayName}
              </h3>
            </div>

            <div className="p-5">
              {trip.description ? (
                <p className="text-sm text-gray-600 line-clamp-2">{trip.description}</p>
              ) : (
                <p className="text-sm italic text-gray-400">Saved for a future trip.</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                  Saved {new Date(trip.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 transition-colors group-hover:text-rose-700">
                  View guide
                  <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
