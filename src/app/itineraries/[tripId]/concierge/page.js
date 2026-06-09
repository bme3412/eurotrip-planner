"use server";

import { notFound } from "next/navigation";
import { getCityData } from "@/lib/data-utils";
import { getTripWithDetails } from "@/lib/trips/tripsRepository";
import { formatDateRange } from "../_lib/buildPlan";
import ConciergeClient from "./ConciergeClient";

/**
 * Concierge preview page — `/itineraries/[tripId]/concierge`.
 *
 * Stays deliberately slim: it only resolves display props (city name, dates,
 * hero image) and hands off to the client, which fetches the LLM-written briefs
 * from /api/trips/[tripId]/concierge-brief. The heavy lifting (context + Claude)
 * lives in that route so this page renders instantly.
 */
export default async function ConciergePage({ params }) {
  const { tripId } = await params;

  let trip;
  try {
    trip = await getTripWithDetails(tripId);
  } catch {
    notFound();
  }
  if (!trip) notFound();

  const citySlug = trip.city || "paris";
  const cityData = await getCityData(citySlug);
  const cityDisplay =
    cityData?.cityName ||
    cityData?.name ||
    citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
  const thumbnail = cityData?.thumbnail;
  const hasHero = thumbnail && thumbnail !== "/images/city-placeholder.svg";

  return (
    <ConciergeClient
      tripId={tripId}
      cityDisplay={cityDisplay}
      dateRangeLabel={dateRangeLabel}
      heroImage={hasHero ? thumbnail : null}
    />
  );
}
