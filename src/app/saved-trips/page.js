"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLongRightIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import AuthButton from "@/components/auth/AuthButton";
import { SavedTripsList } from "@/components/common/SaveToTrips";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
import { migrateLegacyWizardItineraries, readLocalTripDrafts, removeLocalTripDraft } from "@/lib/trips/localTripDrafts";
import { migrateLocalDraftsToAccount } from "@/lib/trips/migrateLocalDrafts";
import { getFlagForCountry } from "@/utils/countryFlags";

function isGeneratedTrip(trip) {
  return Boolean(trip.itinerary_generated_at || trip.generated_itinerary);
}

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

function tripDateInfo(trip) {
  if (trip.start_date && trip.end_date) {
    return { kind: "range", label: `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}` };
  }
  const timeRange = trip.time_range || {};
  // Local drafts carry exact dates in time_range (Supabase trips use the
  // top-level start_date/end_date handled above).
  if (timeRange.startDate && timeRange.endDate) {
    return { kind: "range", label: `${formatDate(timeRange.startDate)} – ${formatDate(timeRange.endDate)}` };
  }
  if (timeRange.flexibleMonth) return { kind: "soft", label: `Flexible in ${timeRange.flexibleMonth}` };
  if (timeRange.totalNights) return { kind: "soft", label: `${timeRange.totalNights} nights` };
  return { kind: "empty", label: "Dates not set" };
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

function tripCityChips(trip) {
  if (Array.isArray(trip.cities) && trip.cities.length > 0) {
    return trip.cities
      .map((city) => {
        const name = city.name || city.id;
        if (!name) return null;
        return { name, flag: city.country ? getFlagForCountry(city.country) : null };
      })
      .filter(Boolean);
  }
  if (trip.city) {
    return [{ name: trip.city, flag: trip.country ? getFlagForCountry(trip.country) : null }];
  }
  return [];
}

function CityChips({ chips }) {
  if (chips.length === 0) {
    return <p className="text-sm italic text-gray-500">Route in progress</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip, idx) => (
        <span key={`${chip.name}-${idx}`} className="contents">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-800 ring-1 ring-gray-200">
            {chip.flag && <span aria-hidden="true">{chip.flag}</span>}
            <span>{chip.name}</span>
          </span>
          {idx < chips.length - 1 && (
            <ArrowLongRightIcon className="size-3.5 text-gray-300" aria-hidden="true" />
          )}
        </span>
      ))}
    </div>
  );
}

function StatusDot({ tone = "gray" }) {
  const map = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    gray: "bg-gray-400",
  };
  return <span className={`size-1.5 rounded-full ${map[tone] || map.gray}`} aria-hidden="true" />;
}

function StatPill({ count, label, tone = "rose" }) {
  const dotTone = tone === "amber" ? "bg-amber-500" : tone === "emerald" ? "bg-emerald-500" : "bg-rose-400";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200/80 backdrop-blur-sm">
      <span className={`size-1.5 rounded-full ${dotTone}`} aria-hidden="true" />
      <span className="font-semibold text-gray-900">{count}</span>
      <span className="text-gray-500">{label}</span>
    </span>
  );
}

function SectionHeader({ eyebrow, title, subtitle, action, dotTone = "rose" }) {
  const dotMap = {
    rose: "bg-rose-400",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  };
  return (
    <div className="mb-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500/80">
            <span className={`size-1.5 rounded-full ${dotMap[dotTone] || dotMap.rose}`} aria-hidden="true" />
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-2xl text-gray-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4 h-px bg-gradient-to-r from-gray-200 via-gray-200/40 to-transparent" />
    </div>
  );
}

function EmptyCard({ icon: Icon, tone = "rose", title, body, cta }) {
  const toneMap = {
    rose: { wrap: "ring-gray-200 bg-white", badge: "bg-rose-50 text-rose-500" },
    amber: { wrap: "ring-amber-200 bg-amber-50/70", badge: "bg-amber-100 text-amber-700" },
    red: { wrap: "ring-red-200 bg-red-50/70", badge: "bg-red-100 text-red-600" },
  };
  const styles = toneMap[tone] || toneMap.rose;
  return (
    <div className={`rounded-2xl border border-dashed px-6 py-10 text-center ring-1 ${styles.wrap}`} style={{ borderColor: "transparent" }}>
      <div className={`mx-auto flex size-12 items-center justify-center rounded-full ${styles.badge}`}>
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-xl text-gray-950">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">{body}</p>}
      {cta && <div className="mt-5 flex justify-center">{cta}</div>}
    </div>
  );
}

function TripCard({ trip, isLocal = false, onRemove = null, onDelete = null }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isGenerated = isGeneratedTrip(trip);
  const statusLabel = isLocal
    ? isGenerated ? "Generated · not synced" : "Draft · not synced"
    : isGenerated ? "Itinerary ready" : "Draft";
  const primaryHref = isGenerated && !isLocal
    ? `/itineraries/${trip.id}`
    : `/plan?${isLocal ? "localTripId" : "tripId"}=${trip.id}`;

  const dotTone = isGenerated ? "emerald" : isLocal ? "amber" : "gray";
  const badgeTone = isGenerated
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : isLocal
      ? "bg-white text-amber-700 ring-amber-200"
      : "bg-gray-50 text-gray-600 ring-gray-200";
  const badgeLabel = isGenerated ? "Itinerary ready" : isLocal ? "Not synced" : "Draft";

  const chips = tripCityChips(trip);
  const dateInfo = tripDateInfo(trip);

  const containerBase = "group rounded-2xl p-5 md:p-6 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ring-1";
  const containerVariant = isLocal
    ? "bg-gradient-to-br from-amber-50/80 to-white ring-amber-200"
    : "bg-white ring-gray-200/80";

  return (
    <article className={`${containerBase} ${containerVariant}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${isLocal ? "text-amber-700" : "text-gray-400"}`}>
            <StatusDot tone={dotTone} />
            {statusLabel}
          </p>
          <h3 className="mt-2 font-display text-xl md:text-2xl text-gray-950 transition-colors group-hover:text-rose-600">
            {trip.title || "Untitled Europe Trip"}
          </h3>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-gray-500">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {formatUpdatedAt(trip.updated_at || trip.created_at)}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeTone}`}>
          <StatusDot tone={dotTone} />
          {badgeLabel}
        </span>
      </div>

      <div className="mt-4">
        <CityChips chips={chips} />
      </div>

      <div className="mt-3">
        {dateInfo.kind === "range" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
            <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
            {dateInfo.label}
          </span>
        ) : dateInfo.kind === "soft" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
            <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
            {dateInfo.label}
          </span>
        ) : (
          <p className="text-xs italic text-gray-400">{dateInfo.label}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          {isGenerated && !isLocal ? "View itinerary" : "Continue planning"}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
        {!isLocal && (
          <>
            <Link
              href={`/plan?tripId=${trip.id}`}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:ring-gray-300"
            >
              Edit route
            </Link>
            {isGenerated && (
              <Link
                href={`/itineraries/${trip.id}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:ring-gray-300"
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
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition-all hover:text-amber-900 hover:ring-amber-300"
          >
            Remove
          </button>
        )}
        {!isLocal && onDelete && (
          confirmingDelete ? (
            <span className="ml-auto inline-flex items-center gap-2">
              <span className="text-xs text-gray-500">Delete this trip?</span>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await onDelete(trip.id);
                }}
                className="rounded-full bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmingDelete(false)}
                className="rounded-full px-3 py-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-gray-400 transition-colors hover:text-red-600"
            >
              <TrashIcon className="size-4" aria-hidden="true" />
              Delete
            </button>
          )
        )}
      </div>
    </article>
  );
}

function TripsSection({ eyebrow, title, subtitle, dotTone, trips, isLocal, onRemove, onDelete }) {
  if (trips.length === 0) return null;
  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} dotTone={dotTone} />
      <div className="grid gap-4 md:grid-cols-2">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} isLocal={isLocal} onRemove={onRemove} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function TripsLoading() {
  return <p className="py-6 text-sm text-gray-400">Loading your trips…</p>;
}

export default function SavedTripsPage() {
  const { user, session, loading: authLoading, isSupabaseConfigured } = useAuth();

  const [trips, setTrips] = useState([]);
  const [localDrafts, setLocalDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const migrationAttempted = useRef(false);

  const loadTrips = useCallback(async () => {
    if (!user || !session?.access_token) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", { headers: getSupabaseAuthHeaders(session) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTrips(Array.isArray(data.trips) ? data.trips : []);
    } catch (err) {
      console.error("[saved-trips] Failed to load trips:", err);
      setError("Unable to load your trips right now.");
    } finally {
      setLoading(false);
    }
  }, [session, user]);

  // Keep local drafts in sync for the signed-out experience (and as the source
  // for one-time migration once the user signs in).
  const reloadLocalDrafts = useCallback(() => {
    migrateLegacyWizardItineraries();
    setLocalDrafts(readLocalTripDrafts());
  }, []);

  useEffect(() => {
    reloadLocalDrafts();
    window.addEventListener("storage", reloadLocalDrafts);
    return () => window.removeEventListener("storage", reloadLocalDrafts);
  }, [reloadLocalDrafts]);

  useEffect(() => {
    if (authLoading) return;
    loadTrips();
  }, [authLoading, loadTrips]);

  // One-time bulk migration of local drafts into the account. Runs after the
  // account's trips have loaded so we can de-duplicate against them.
  useEffect(() => {
    if (authLoading || loading) return;
    if (!user || !session?.access_token) return;
    if (migrationAttempted.current) return;
    if (readLocalTripDrafts().length === 0) return;

    migrationAttempted.current = true;
    migrateLocalDraftsToAccount({ session, userId: user.id, existingTrips: trips }).then((res) => {
      reloadLocalDrafts();
      if (res.migrated > 0) loadTrips();
    });
  }, [authLoading, loading, user, session, trips, loadTrips, reloadLocalDrafts]);

  const handleRemoveLocal = useCallback((id) => {
    removeLocalTripDraft(id);
    reloadLocalDrafts();
  }, [reloadLocalDrafts]);

  const handleDeleteTrip = useCallback(async (id) => {
    if (!session?.access_token) return;
    const snapshot = trips;
    setError(null);
    setTrips((current) => current.filter((trip) => trip.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: "DELETE",
        headers: getSupabaseAuthHeaders(session),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error("[saved-trips] Failed to delete trip:", err);
      setTrips(snapshot); // rollback
      setError("Unable to delete that trip. Please try again.");
    }
  }, [session, trips]);

  // Signed in → account trips; signed out → local drafts (rendered as unsynced).
  const isLocalMode = !user;
  const displayTrips = isLocalMode ? localDrafts : trips;

  const { ready, inProgress } = useMemo(() => {
    const readyTrips = [];
    const inProgressTrips = [];
    for (const trip of displayTrips) {
      (isGeneratedTrip(trip) ? readyTrips : inProgressTrips).push(trip);
    }
    return { ready: readyTrips, inProgress: inProgressTrips };
  }, [displayTrips]);

  const showLoading = authLoading || (user && loading);
  const showEmptyState = !showLoading && !error && displayTrips.length === 0;

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <header className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-b from-rose-50/60 via-white to-[#fafaf7]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-500/80">Account</p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-gray-950 md:text-5xl">
                My Trips
              </h1>
              <p className="mt-3 max-w-xl text-sm text-gray-600">
                Your itineraries, planner drafts, and saved cities — all in one place.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatPill count={ready.length} label={ready.length === 1 ? "ready" : "ready"} tone="emerald" />
                <StatPill count={inProgress.length} label="in progress" tone="rose" />
                <StatPill count={wishlistCount} label={wishlistCount === 1 ? "saved city" : "saved cities"} tone="emerald" />
              </div>
            </div>
            <div className="shrink-0">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        {/* Trips lifecycle: Ready to go → In progress */}
        <div className="space-y-12">
          <div className="flex items-center justify-end">
            <Link
              href="/plan"
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
            >
              <PlusIcon className="size-3.5" aria-hidden="true" />
              New trip
            </Link>
          </div>

          {isLocalMode && displayTrips.length > 0 && (
            <div className="rounded-2xl bg-amber-50/70 px-5 py-4 ring-1 ring-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-amber-800">
                  These trips are saved on this browser only. Sign in to sync them to your account.
                </p>
                {isSupabaseConfigured && <AuthButton />}
              </div>
            </div>
          )}

          {showLoading ? (
            <TripsLoading />
          ) : error ? (
            <EmptyCard
              icon={ExclamationTriangleIcon}
              tone="red"
              title="Something went wrong"
              body={error}
              cta={
                <button
                  type="button"
                  onClick={loadTrips}
                  className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Try again
                </button>
              }
            />
          ) : showEmptyState ? (
            isLocalMode ? (
              <EmptyCard
                icon={UserCircleIcon}
                tone="amber"
                title="Sign in to sync your trips"
                body="Planner drafts are saved to your account once you sign in. Saved cities still appear below."
                cta={isSupabaseConfigured ? <AuthButton /> : null}
              />
            ) : (
              <EmptyCard
                icon={SparklesIcon}
                tone="rose"
                title="No trips yet"
                body="Start a conversation with the planner and your route will appear here once it has a city and dates."
                cta={
                  <Link
                    href="/plan"
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Plan a trip
                    <ArrowRightIcon className="size-4" aria-hidden="true" />
                  </Link>
                }
              />
            )
          ) : (
            <>
              <TripsSection
                eyebrow="01 · Ready to go"
                title="Ready to go"
                subtitle="Generated itineraries you can open and refine."
                dotTone="emerald"
                trips={ready}
                isLocal={isLocalMode}
                onRemove={isLocalMode ? handleRemoveLocal : null}
                onDelete={isLocalMode ? null : handleDeleteTrip}
              />
              <TripsSection
                eyebrow="02 · In progress"
                title="In progress"
                subtitle="Routes still being planned in the conversational planner."
                dotTone="rose"
                trips={inProgress}
                isLocal={isLocalMode}
                onRemove={isLocalMode ? handleRemoveLocal : null}
                onDelete={isLocalMode ? null : handleDeleteTrip}
              />
            </>
          )}
        </div>

        <section>
          <SectionHeader
            eyebrow="03 · Wishlist"
            title="Wishlist"
            subtitle="Cities and experiences saved while browsing guides."
            dotTone="emerald"
            action={
              <Link
                href="/city-guides"
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700"
              >
                Browse guides
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
          <SavedTripsList onCount={setWishlistCount} />
        </section>
      </main>
    </div>
  );
}
