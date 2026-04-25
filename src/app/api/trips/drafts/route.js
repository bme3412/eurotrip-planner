"use server";

import { NextResponse } from "next/server";
import { createDraftTrip } from "@/lib/trips/tripsRepository";
import { canPersistTripDraft } from "@/lib/trips/tripLifecycle";

function draftSaveErrorResponse(error) {
  const message = error?.message || "";
  const details = error?.details || "";
  const hint = error?.hint || "";
  const combined = `${message} ${details} ${hint}`.toLowerCase();

  const isConfigError = message.includes("Missing") && message.includes("environment variable");
  if (isConfigError) {
    return NextResponse.json(
      {
        error: "Trip autosave requires Supabase server configuration.",
        ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
      },
      { status: 503 }
    );
  }

  const isLifecycleSchemaError =
    combined.includes("trip_state") ||
    combined.includes("time_range") ||
    combined.includes("share_token") ||
    combined.includes("is_public") ||
    combined.includes("itinerary_generated_at") ||
    combined.includes("null value in column") ||
    combined.includes("trips_status_check");

  if (isLifecycleSchemaError) {
    return NextResponse.json(
      {
        error: "Trip autosave needs the trip lifecycle database migration. Apply supabase/migrations/0005_trip_lifecycle.sql.",
        ...(process.env.NODE_ENV !== "production" ? { detail: message || details || hint } : {}),
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: "Unable to save this trip draft right now." },
    { status: 500 }
  );
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tripState = body?.tripState || body?.trip_state;
  if (!canPersistTripDraft(tripState)) {
    return NextResponse.json(
      { error: "A draft trip needs at least one anchor city and a time range." },
      { status: 400 }
    );
  }

  try {
    const trip = await createDraftTrip({
      tripState,
      title: body?.title || null,
      userId: body?.userId || body?.user_id || null,
      userEmail: body?.userEmail || body?.user_email || null,
    });
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Failed to create trip draft", error);
    return draftSaveErrorResponse(error);
  }
}
