"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityData, getCityVisitCalendar, getCityExperiences } from "@/lib/data-utils";
import { buildItineraryWithRouting } from "@/lib/planning/buildItinerary";
import { getTripWithDetails } from "@/lib/trips/tripsRepository";
import { buildPlanFromNormalizedDays, formatDateRange, extractWeather } from "./_lib/buildPlan";
import ItineraryClient from "./ItineraryClient";

// ─── Server-side helpers ────────────────────────────────────────────────

/**
 * Build a normalized name → { score, pricingTier } lookup from experiences data.
 */
function buildExperienceScoreMap(experiences) {
  if (!experiences?.categories) return {};
  const map = {};
  for (const items of Object.values(experiences.categories)) {
    for (const item of items || []) {
      if (!item.name || !item.scores?.total_score) continue;
      map[item.name.toLowerCase().trim()] = {
        score: item.scores.total_score,
        pricingTier: item.pricing_tier || null,
      };
    }
  }
  return map;
}

async function fetchTrip(tripId) {
  try {
    return await getTripWithDetails(tripId);
  } catch (error) {
    console.error("Failed to load trip", error);
    throw error;
  }
}

// ─── Page ───────────────────────────────────────────────────────────────

export default async function ItineraryPage({ params }) {
  const { tripId } = await params;

  let trip;
  try {
    trip = await fetchTrip(tripId);
  } catch {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 text-slate-700">
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-6 shadow-sm">
            <h1 className="text-xl font-semibold text-red-800">We couldn&apos;t load this itinerary yet</h1>
            <p className="mt-2 text-sm text-red-700">
              Something went wrong while connecting to Supabase. Double-check that your environment variables are set and try again.
            </p>
            <Link
              href="/city-guides"
              className="mt-4 inline-flex w-max items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
            >
              &larr; Back to city guides
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) notFound();

  const citySlug = trip.city || 'paris';
  const country = trip.country || 'France';
  const hasNormalizedDays = trip.days?.length > 0 && trip.days[0].activities?.length > 0;

  // When hasNormalizedDays is true, skip heavy data fetches — let client hydrate on demand
  if (hasNormalizedDays) {
    // Only fetch slim city data for display purposes
    const cityData = await getCityData(citySlug);
    const plan = buildPlanFromNormalizedDays(trip);
    const cityDisplay = cityData?.cityName || cityData?.name || citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
    const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
    const interestsList = trip.interests?.length ? trip.interests.join(' · ') : `${cityDisplay} essentials`;

    return (
      <ItineraryClient
        plan={plan}
        tripState={trip.trip_state || null}
        tripId={tripId}
        cityDisplay={cityDisplay}
        citySlug={citySlug}
        country={country}
        thumbnail={cityData?.thumbnail}
        coordinates={cityData?.coordinates || null}
        dateRangeLabel={dateRangeLabel}
        interestsList={interestsList}
        hasNormalizedDays={true}
        weather={null}
        experienceScores={null}
      />
    );
  }

  // Legacy path: no normalized days, fetch all data server-side
  const [cityData, visitCalendar, experiences] = await Promise.all([
    getCityData(citySlug),
    getCityVisitCalendar(citySlug),
    getCityExperiences(citySlug),
  ]);

  const plan = await buildItineraryWithRouting(trip, cityData);
  const cityDisplay = cityData?.cityName || cityData?.name || citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
  const interestsList = trip.interests?.length ? trip.interests.join(' · ') : `${cityDisplay} essentials`;
  const weather = extractWeather(visitCalendar, trip.start_date);
  const experienceScores = buildExperienceScoreMap(experiences);

  return (
    <ItineraryClient
      plan={plan}
      tripState={trip.trip_state || null}
      tripId={tripId}
      cityDisplay={cityDisplay}
      citySlug={citySlug}
      country={country}
      thumbnail={cityData?.thumbnail}
      coordinates={cityData?.coordinates || null}
      dateRangeLabel={dateRangeLabel}
      interestsList={interestsList}
      hasNormalizedDays={false}
      weather={weather}
      experienceScores={experienceScores}
    />
  );
}
