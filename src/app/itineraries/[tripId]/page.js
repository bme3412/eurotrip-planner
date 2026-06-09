import Link from "next/link";
import { notFound } from "next/navigation";
import { getTripWithDetails } from "@/lib/trips/tripsRepository";
import { isTripPubliclyReadable } from "@/lib/trips/tripAccess";
import { prepareItineraryViewProps } from "./_lib/prepareItineraryView";
import ItineraryClient from "./ItineraryClient";
import ItineraryPrivateLoader from "./ItineraryPrivateLoader";

async function fetchTrip(tripId) {
  try {
    return await getTripWithDetails(tripId);
  } catch (error) {
    console.error("Failed to load trip", error);
    throw error;
  }
}

export default async function ItineraryPage({ params, searchParams }) {
  const { tripId } = await params;
  const resolvedSearch = await searchParams;
  const shareToken = typeof resolvedSearch?.share === "string" ? resolvedSearch.share : null;

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

  if (!isTripPubliclyReadable(trip, shareToken)) {
    return <ItineraryPrivateLoader tripId={tripId} />;
  }

  const viewProps = await prepareItineraryViewProps(trip, tripId);
  return <ItineraryClient {...viewProps} shareToken={shareToken} />;
}
