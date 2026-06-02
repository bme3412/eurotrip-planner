"use server";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { deleteTrip, getTripWithDetails, updateTripDraft } from "@/lib/trips/tripsRepository";
import { forbiddenResponse, getRequesterFromAuthHeader } from "@/lib/supabase/requestAuth";

const ALLOWED_UPDATE_FIELDS = new Set([
  "start_date",
  "end_date",
  "interests",
  "pace",
  "budget",
  "hotel_location",
  "prebookings",
  "initial_plan",
  "title",
  "country",
  "cities",
  "route_type",
  "city_sequence",
  "trip_state",
  "brief",
  "time_range",
  "status",
  "is_public",
  "share_token",
  "itinerary_generated_at",
]);

function sanitizeUpdatePayload(input) {
  const update = {};

  for (const key of Object.keys(input || {})) {
    if (!ALLOWED_UPDATE_FIELDS.has(key)) continue;

    const value = input[key];
    if (value === undefined) continue;

    if (key === "interests") {
      if (value == null) {
        update[key] = [];
      } else if (Array.isArray(value)) {
        update[key] = value;
      }
      continue;
    }

    if (key === "prebookings") {
      if (value == null) {
        update[key] = {};
      } else if (typeof value === "object" && !Array.isArray(value)) {
        update[key] = value;
      }
      continue;
    }

    if (key === "cities" || key === "city_sequence") {
      if (Array.isArray(value)) update[key] = value;
      continue;
    }

    if (key === "trip_state" || key === "brief" || key === "time_range" || key === "initial_plan") {
      if (value == null || (typeof value === "object" && !Array.isArray(value))) {
        update[key] = value || {};
      }
      continue;
    }

    if (key === "is_public") {
      update[key] = Boolean(value);
      continue;
    }

    if (key === "pace") {
      const pace = Number(value);
      if (!Number.isFinite(pace)) continue;
      update[key] = pace;
      continue;
    }

    if (key === "hotel_location" || key === "budget" || key === "title" || key === "country" || key === "route_type" || key === "status" || key === "share_token") {
      update[key] = typeof value === "string" ? value.trim() || null : null;
      continue;
    }

    update[key] = value;
  }

  return update;
}

function notFoundResponse() {
  return NextResponse.json({ error: "Trip not found." }, { status: 404 });
}

function canAccessTrip(trip, requester, { write = false } = {}) {
  if (!trip) return false;
  const ownerId = trip.user_id || null;
  const ownerEmail = trip.user_email || null;
  const hasOwner = Boolean(ownerId || ownerEmail);

  if (!write && trip.is_public === true) return true;
  if (!hasOwner || !requester) return false;
  if (ownerId && requester.userId === ownerId) return true;
  if (ownerEmail && requester.userEmail === ownerEmail) return true;
  return false;
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  try {
    const trip = await getTripWithDetails(id);
    if (!trip) return notFoundResponse();
    if (canAccessTrip(trip, null)) return NextResponse.json(trip, { status: 200 });

    const { requester, response } = await getRequesterFromAuthHeader(request);
    if (response) return response;
    if (!canAccessTrip(trip, requester)) return forbiddenResponse("You do not have access to this trip.");
    return NextResponse.json(trip, { status: 200 });
  } catch (error) {
    console.error("Failed to load trip", error);
    return NextResponse.json(
      { error: "Unable to load trip at this time." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body?.tripState || body?.trip_state) {
    try {
      const existing = await getTripWithDetails(id);
      if (!existing) return notFoundResponse();
      if (!canAccessTrip(existing, requester, { write: true })) {
        return forbiddenResponse("You do not have access to this trip.");
      }
      const data = await updateTripDraft(id, {
        tripState: body.tripState || body.trip_state,
        title: body.title,
        isPublic: body.is_public,
        status: body.status,
      });
      return NextResponse.json(data, { status: 200 });
    } catch (error) {
      console.error("Failed to update trip draft", error);
      return NextResponse.json(
        { error: "Unable to update trip at this time." },
        { status: 500 }
      );
    }
  }

  const updates = sanitizeUpdatePayload(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields supplied for update." }, { status: 400 });
  }

  try {
    const existing = await getTripWithDetails(id);
    if (!existing) return notFoundResponse();
    if (!canAccessTrip(existing, requester, { write: true })) {
      return forbiddenResponse("You do not have access to this trip.");
    }
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from("trips")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return notFoundResponse();
      }
      throw error;
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to update trip", error);
    return NextResponse.json(
      { error: "Unable to update trip at this time." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  try {
    const existing = await getTripWithDetails(id);
    if (!existing) return notFoundResponse();
    if (!canAccessTrip(existing, requester, { write: true })) {
      return forbiddenResponse("You do not have access to this trip.");
    }
    await deleteTrip(id);
    return NextResponse.json({ id, deleted: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete trip", error);
    return NextResponse.json(
      { error: "Unable to delete trip at this time." },
      { status: 500 }
    );
  }
}
