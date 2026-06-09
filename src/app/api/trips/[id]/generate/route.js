import { NextResponse } from "next/server";
import { buildMultiCityItinerary } from "@/lib/planning/buildMultiCityItinerary";
import { optimizeRoute } from "@/lib/planning/routeOptimizer";
import { persistGeneratedItinerary } from "@/lib/trips/tripsRepository";
import { normalizeTripState } from "@/lib/trips/tripLifecycle";
import { requireTripWriteAccess } from "@/lib/trips/requireTripAccess";
import { resolveGenerationWindow } from "@/lib/trips/generationWindow";
import { accommodationsByCity, getBookings } from "@/lib/planning/tripBookings";

export async function POST(request, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  const { trip, response } = await requireTripWriteAccess(request, id);
  if (response) return response;

  let body = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  try {

    const tripState = normalizeTripState(body.tripState || body.trip_state || trip.trip_state);
    const { cities, startDate, endDate, dayAllocation, errors } = resolveGenerationWindow(tripState);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    let orderedCities = cities;
    if (cities.length >= 3) {
      try {
        const result = optimizeRoute(cities, {
          startCity: cities[0].id,
          endCity: cities[cities.length - 1].id,
        });
        if (result?.routes?.[0]?.cities) {
          orderedCities = result.routes[0].cities;
        }
      } catch (error) {
        console.warn("[trip-generate] Route optimization failed:", error.message);
      }
    }

    const accommodations = accommodationsByCity(tripState);
    const flights = getBookings(tripState);

    const itinerary = await buildMultiCityItinerary({
      start_date: startDate,
      end_date: endDate,
      interests: tripState.preferences.interests,
      pace: tripState.preferences.pace || 'balanced',
      budget: tripState.budget.style || 'moderate',
      // Previously-dormant preferences — now flow into seasonal/adaptive generation.
      weather_tolerance: tripState.preferences.weatherTolerance || null,
      travelers: {
        groupType: tripState.travelers.groupType || null,
        count: tripState.travelers.count || null,
        hasChildren: tripState.travelers.hasChildren || false,
        hasElderly: tripState.travelers.hasElderly || false,
      },
      dietary: tripState.travelers.dietaryRestrictions || [],
      mobility: tripState.travelers.mobilityNeeds || null,
    }, orderedCities, {
      dayAllocation,
      includeTransfers: true,
      accommodations,
      flights,
    });

    const updatedTrip = await persistGeneratedItinerary(id, itinerary, {
      ...tripState,
      dates: {
        ...tripState.dates,
        startDate,
        endDate,
      },
    });

    return NextResponse.json({ itinerary, trip: updatedTrip }, { status: 200 });
  } catch (error) {
    console.error("Failed to generate saved trip itinerary", error);
    return NextResponse.json(
      { error: "Failed to generate itinerary. Please try again." },
      { status: 500 }
    );
  }
}
