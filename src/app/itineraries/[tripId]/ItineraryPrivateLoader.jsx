'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import { buildPlanFromNormalizedDays, formatDateRange } from './_lib/buildPlan';
import ItineraryClient from './ItineraryClient';

/**
 * Loads a private itinerary client-side (session lives in localStorage, not SSR
 * cookies). No trip data is embedded in the server HTML for non-public trips.
 */
export default function ItineraryPrivateLoader({ tripId }) {
  const { session, loading: authLoading, signInWithGoogle, isSupabaseConfigured } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | ready | forbidden | error | signin
  const [viewProps, setViewProps] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!session?.access_token) {
      setStatus(isSupabaseConfigured ? 'signin' : 'forbidden');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const tripRes = await fetch(`/api/trips/${tripId}`, {
          headers: getSupabaseAuthHeaders(session),
        });
        if (tripRes.status === 401 || tripRes.status === 403) {
          if (!cancelled) setStatus('forbidden');
          return;
        }
        if (!tripRes.ok) throw new Error(await tripRes.text());
        const trip = await tripRes.json();

        const hasNormalizedDays = trip.days?.length > 0 && trip.days[0].activities?.length > 0;
        if (!hasNormalizedDays) {
          if (!cancelled) setStatus('error');
          return;
        }

        const citySlug = trip.city || 'paris';
        const country = trip.country || 'France';
        let thumbnail = null;
        let coordinates = null;
        let cityDisplay = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

        try {
          const cityRes = await fetch(`/api/cities/${citySlug}`);
          if (cityRes.ok) {
            const cityData = await cityRes.json();
            cityDisplay = cityData?.cityName || cityData?.name || cityDisplay;
            thumbnail = cityData?.thumbnail || null;
            coordinates = cityData?.coordinates || null;
          }
        } catch {
          // city metadata is optional for the view
        }

        const plan = buildPlanFromNormalizedDays(trip);
        const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
        const interestsList = trip.interests?.length ? trip.interests.join(' · ') : `${cityDisplay} essentials`;

        if (!cancelled) {
          setViewProps({
            plan,
            tripState: trip.trip_state || null,
            tripId,
            cityDisplay,
            citySlug,
            country,
            thumbnail,
            coordinates,
            dateRangeLabel,
            interestsList,
            hasNormalizedDays: true,
            weather: null,
            experienceScores: null,
          });
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, session, tripId, isSupabaseConfigured]);

  if (status === 'ready' && viewProps) {
    return <ItineraryClient {...viewProps} />;
  }

  if (status === 'signin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Sign in to view this itinerary</h1>
          <p className="mt-2 text-sm text-slate-600">This trip is private. Sign in with the account that saved it.</p>
          <button
            type="button"
            onClick={() => signInWithGoogle({ next: `/itineraries/${tripId}` })}
            className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">This itinerary isn&apos;t available</h1>
          <p className="mt-2 text-sm text-slate-600">You don&apos;t have access to this trip, or it may have been removed.</p>
          <Link href="/saved-trips" className="mt-6 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            &larr; My trips
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-800">Couldn&apos;t load this itinerary</h1>
          <p className="mt-2 text-sm text-red-700">Try again from My Trips, or regenerate the itinerary from the planner.</p>
          <Link href="/saved-trips" className="mt-6 inline-flex text-sm font-semibold text-red-700 hover:text-red-800">
            &larr; My trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Loading itinerary…</p>
    </div>
  );
}
