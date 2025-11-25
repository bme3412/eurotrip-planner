"use server";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase/server";

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
  const userEmail =
    typeof input.user_email === "string" && input.user_email.trim().length > 0
      ? input.user_email.trim()
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
    user_email: userEmail,
    city,
    start_date: startDate,
    end_date: endDate,
    interests,
    pace,
    budget,
    hotel_location: hotelLocation,
    prebookings,
    initial_plan: input.initial_plan ?? null,
  };

  return { payload };
}

export async function POST(request) {
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
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from("trips")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Failed to create trip", error);
    return NextResponse.json(
      { error: "Failed to create trip preferences. Please try again later." },
      { status: 500 }
    );
  }
}
