import { NextResponse } from "next/server";
import { buildMultiCityItinerary } from "@/lib/planning/buildMultiCityItinerary";
import { optimizeRoute } from "@/lib/planning/routeOptimizer";
import { getTripWithDetails, persistGeneratedItinerary } from "@/lib/trips/tripsRepository";
import { getAnchorCities, normalizeTripState } from "@/lib/trips/tripLifecycle";
import { requireTripWriteAccess } from "@/lib/trips/requireTripAccess";
import { deriveTripWindow, accommodationsByCity, getBookings } from "@/lib/planning/tripBookings";

/** Whole nights between two YYYY-MM-DD dates (UTC-safe component math). */
function nightsBetween(start, end) {
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return Math.round((e - s) / 86400000);
}

function deriveConcreteDates(tripState) {
  let startDate = tripState.dates.startDate;
  let endDate = tripState.dates.endDate;

  if (!startDate && tripState.dates.flexibleMonth && tripState.dates.totalNights) {
    const [year, month] = tripState.dates.flexibleMonth.split('-');
    if (year && month) {
      startDate = `${year}-${month}-01`;
    }
  }

  if (startDate && !endDate && tripState.dates.totalNights) {
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + tripState.dates.totalNights);
    endDate = date.toISOString().slice(0, 10);
  }

  return { startDate, endDate };
}

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
    const cities = getAnchorCities(tripState).map((city) => ({
      id: city.id,
      name: city.name,
      country: city.country,
    }));
    // Prefer the flight-derived window (constrain the trip to the booked flights),
    // falling back to the planner's dates when there are no bounding flights.
    const flightWindow = deriveTripWindow(tripState);
    const concrete = deriveConcreteDates(tripState);
    const startDate = flightWindow?.startDate || concrete.startDate;
    const endDate = flightWindow?.endDate || concrete.endDate;

    const errors = [];
    if (cities.length < 1) errors.push("At least 1 city is required.");
    if (!startDate) errors.push("A start date or flexible month is required.");
    if (!endDate) errors.push("An end date or total night count is required.");
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

    let dayAllocation = Object.fromEntries(
      tripState.route.cities
        .filter((city) => city.id && city.nights > 0)
        .map((city) => [city.id, city.nights])
    );

    // If the per-city nights don't fit the (flight-constrained) window, drop the
    // explicit allocation so the builder re-fits the real number of nights —
    // keeps day-count, dates, and flights in agreement.
    const windowNights = nightsBetween(startDate, endDate);
    const allocatedNights = Object.values(dayAllocation).reduce((a, b) => a + b, 0);
    if (windowNights != null && allocatedNights !== windowNights) {
      dayAllocation = null;
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
