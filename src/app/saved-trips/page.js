"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthButton from "@/components/auth/AuthButton";
import { SavedTripsList } from "@/components/common/SaveToTrips";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { migrateLegacyWizardItineraries, readLocalTripDrafts, removeLocalTripDraft } from "@/lib/trips/localTripDrafts";
import { getFlagForCountry } from "@/utils/countryFlags";

const STATUS_LABELS = {
  draft: "Draft",
  planning: "Planning",
  itinerary_generated: "Itinerary ready",
  shared: "Shared",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
  cancelled: "Cancelled",
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function tripDateLabel(trip) {
  if (trip.start_date && trip.end_date) {
    return `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`;
  }

  const timeRange = trip.time_range || {};
  if (timeRange.flexibleMonth) return `Flexible in ${timeRange.flexibleMonth}`;
  if (timeRange.totalNights) return `${timeRange.totalNights} nights`;
  return "Dates not set";
}

function formatUpdatedAt(value) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not saved yet";
  return `Last edited ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function tripCitiesLabel(trip) {
  if (Array.isArray(trip.cities) && trip.cities.length > 0) {
    return trip.cities
      .map((city) => {
        const name = city.name || city.id;
        if (!name) return null;
        return city.country ? `${getFlagForCountry(city.country)} ${name}` : name;
      })
      .filter(Boolean)
      .join(" -> ");
  }

  if (trip.city) {
    return trip.country ? `${getFlagForCountry(trip.country)} ${trip.city}, ${trip.country}` : trip.city;
  }
  return "Route in progress";
}

function TripCard({ trip, isLocal = false, onRemove = null }) {
  const isGenerated = Boolean(trip.itinerary_generated_at || trip.generated_itinerary);
  const statusLabel = isLocal
    ? isGenerated ? "Generated locally" : "Saved locally"
    : STATUS_LABELS[trip.status] || "Trip";
  const primaryHref = isGenerated && !isLocal
    ? `/itineraries/${trip.id}`
    : `/plan?${isLocal ? "localTripId" : "tripId"}=${trip.id}`;

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${isLocal ? "border-amber-200 bg-amber-50/70" : "border-gray-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isLocal ? "text-amber-700" : "text-gray-400"}`}>
            {statusLabel}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">
            {trip.title || "Untitled Europe Trip"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">{formatUpdatedAt(trip.updated_at || trip.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isGenerated ? "bg-emerald-100 text-emerald-700" : isLocal ? "bg-white text-amber-700" : "bg-gray-100 text-gray-600"}`}>
          {isGenerated ? "Itinerary ready" : isLocal ? "Device only" : "Draft"}
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-700">{tripCitiesLabel(trip)}</p>
      <p className="mt-1 text-sm text-gray-500">{tripDateLabel(trip)}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={primaryHref}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {isGenerated && !isLocal ? "View itinerary" : "Continue planning"}
        </Link>
        {!isLocal && (
          <>
            <Link
              href={`/plan?tripId=${trip.id}`}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
            >
              Edit route
            </Link>
            {isGenerated && (
              <Link
                href={`/itineraries/${trip.id}`}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
              >
                Edit itinerary
              </Link>
            )}
          </>
        )}
        {isLocal && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(trip.id)}
            className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:border-amber-400"
          >
            Remove
          </button>
        )}
      </div>
    </article>
  );
}

function TripDraftsSection() {
  const { user, session, loading: authLoading, isSupabaseConfigured } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTrips = useCallback(async () => {
    if (!user || !session?.access_token) {
      setTrips([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trips", {
        headers: getSupabaseAuthHeaders(session),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTrips(Array.isArray(data.trips) ? data.trips : []);
    } catch (err) {
      console.error("[saved-trips] Failed to load trips:", err);
      setError("Unable to load your trip drafts right now.");
    } finally {
      setLoading(false);
    }
  }, [session, user]);

  useEffect(() => {
    if (authLoading) return;
    loadTrips();
  }, [authLoading, loadTrips]);

  if (authLoading || loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-44 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
        <h2 className="text-lg font-semibold text-amber-950">Sign in to sync trip drafts</h2>
        <p className="mt-1 text-sm text-amber-800">
          Planner drafts are saved to your account once you sign in. Local wishlists still appear below.
        </p>
        {isSupabaseConfigured && <div className="mt-4"><AuthButton /></div>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <button
          type="button"
          onClick={loadTrips}
          className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">No trip drafts yet</h2>
        <p className="mt-1 text-sm text-gray-600">
          Start a conversation with the planner and your route will appear here once it has a city and dates.
        </p>
        <Link
          href="/plan"
          className="mt-4 inline-flex rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Plan a trip
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}

function LocalTripDraftsSection() {
  const [drafts, setDrafts] = useState([]);

  const loadDrafts = useCallback(() => {
    migrateLegacyWizardItineraries();
    setDrafts(readLocalTripDrafts());
  }, []);

  useEffect(() => {
    loadDrafts();
    window.addEventListener("storage", loadDrafts);
    return () => window.removeEventListener("storage", loadDrafts);
  }, [loadDrafts]);

  const handleRemove = useCallback((id) => {
    removeLocalTripDraft(id);
    loadDrafts();
  }, [loadDrafts]);

  if (drafts.length === 0) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-950">Saved on this device</h2>
        <p className="text-sm text-gray-600">Local planner drafts you can reopen from this browser.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {drafts.map((trip) => (
          <TripCard key={trip.id} trip={trip} isLocal onRemove={handleRemove} />
        ))}
      </div>
    </section>
  );
}

export default function SavedTripsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Account</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">My Trips</h1>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Trip drafts</h2>
              <p className="text-sm text-gray-600">Routes and itineraries saved from the conversational planner.</p>
            </div>
            <Link href="/plan" className="text-sm font-semibold text-rose-600 hover:text-rose-700">
              New trip
            </Link>
          </div>
          <TripDraftsSection />
        </section>

        <LocalTripDraftsSection />

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-950">Wishlists</h2>
            <p className="text-sm text-gray-600">Cities and experiences saved while browsing guides.</p>
          </div>
          <SavedTripsList />
        </section>
      </main>
    </div>
  );
}
