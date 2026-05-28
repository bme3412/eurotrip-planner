"use server";

import { NextResponse } from "next/server";
import { getCityData } from "../../../lib/data-utils.js";
import { buildItineraryWithRouting } from "../../../lib/planning/buildItinerary.js";
import { createTripWithDays, listTripsForUser } from "../../../lib/trips/tripsRepository.js";
import { getRequesterFromAuthHeader } from "../../../lib/supabase/requestAuth";

function normalizeTripPayload(input) {
  const errors = [];

  const city = typeof input.city === "string" ? input.city.trim() : "";
  const startDate = input.start_date;
  const endDate = input.end_date;
  const interests = Array.isArray(input.interests) ? input.interests : [];
  const pace = Number.isFinite(Number(input.pace)) ? Number(input.pace) : NaN;
  const budget = typeof input.budget === "string" ? input.budget.trim() : "";
  const hotelLocation =
    typeof input.hotel_location === "string" && input.hotel_location.trim().length > 0
      ? input.hotel_location.trim()
      : null;

  if (!city) errors.push("City is required.");
  if (!startDate) errors.push("Start date is required.");
  if (!endDate) errors.push("End date is required.");
  if (!Number.isFinite(pace)) errors.push("Pace must be a number.");
  if (!budget) errors.push("Budget is required.");

  if (errors.length > 0) {
    return { errors };
  }

  const prebookings =
    input.prebookings && typeof input.prebookings === "object" && !Array.isArray(input.prebookings)
      ? input.prebookings
      : {};

  const payload = {
    user_email: null,
    user_id: null,
    city,
    start_date: startDate,
    end_date: endDate,
    interests,
    pace,
    budget,
    hotel_location: hotelLocation,
    prebookings,
  };

  return { payload };
}

export async function GET(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  try {
    const trips = await listTripsForUser({
      userId: requester.userId,
      userEmail: requester.userEmail,
    });
    return NextResponse.json({ trips }, { status: 200 });
  } catch (error) {
    console.error("Failed to list trips", error);
    return NextResponse.json(
      { error: "Unable to load trips at this time." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { payload, errors } = normalizeTripPayload(body);

  if (errors?.length) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const citySlug = payload.city.toLowerCase();
    const cityData = await getCityData(citySlug);

    const itinerary = await buildItineraryWithRouting(payload, cityData);

    payload.user_id = requester.userId;
    payload.user_email = requester.userEmail;
    payload.initial_plan = itinerary;

    const trip = await createTripWithDays(payload, itinerary);
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Failed to create trip", error);

    const isConfigError = error?.message?.includes('Missing') && error?.message?.includes('environment variable');
    const userMessage = isConfigError
      ? "Trip storage requires Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to enable trip saving."
      : "Failed to create trip preferences. Please try again later.";

    return NextResponse.json(
      { error: userMessage },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
