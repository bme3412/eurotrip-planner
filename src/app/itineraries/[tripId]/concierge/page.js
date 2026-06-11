import { notFound } from "next/navigation";
import { getCityData } from "@/lib/data-utils";
import { getTripWithDetails } from "@/lib/trips/tripsRepository";
import { isTripPubliclyReadable } from "@/lib/trips/tripAccess";
import { buildConciergeContext } from "@/lib/concierge/buildContext";
import { formatDateRange } from "../_lib/buildPlan";
import ConciergeClient from "./ConciergeClient";

export default async function ConciergePage({ params, searchParams }) {
  const { tripId } = await params;
  const resolvedSearch = await searchParams;
  const shareToken = typeof resolvedSearch?.share === "string" ? resolvedSearch.share : null;

  let trip;
  try {
    trip = await getTripWithDetails(tripId);
  } catch {
    notFound();
  }
  if (!trip) notFound();

  // Private trips: render the client shell only — no trip facts in SSR HTML.
  // ConciergeClient loads briefs via the authenticated API.
  if (!isTripPubliclyReadable(trip, shareToken)) {
    return <ConciergeClient tripId={tripId} />;
  }

  const citySlug = trip.city || "paris";
  const cityData = await getCityData(citySlug);
  const cityDisplay =
    cityData?.cityName ||
    cityData?.name ||
    citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
  const thumbnail = cityData?.thumbnail;
  const hasHero = thumbnail && thumbnail !== "/images/city-placeholder.svg";

  // The deterministic scaffold (day tabs, schedule, meta) is pure computation
  // over the trip we already loaded — SSR it so the page paints instantly and
  // only the prose waits on the (cached) LLM payload.
  const ctx = buildConciergeContext(trip);

  return (
    <ConciergeClient
      tripId={tripId}
      shareToken={shareToken}
      cityDisplay={cityDisplay}
      dateRangeLabel={dateRangeLabel}
      heroImage={hasHero ? thumbnail : null}
      initialBundle={{ meta: ctx.meta, days: ctx.days, personalization: ctx.personalization }}
      initialDayNumber={ctx.selectedDay?.dayNumber ?? null}
    />
  );
}
