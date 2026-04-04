"use server";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";

const ALLOWED_UPDATE_FIELDS = new Set([
  "user_email",
  "start_date",
  "end_date",
  "interests",
  "pace",
  "budget",
  "hotel_location",
  "prebookings",
  "initial_plan",
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

    if (key === "pace") {
      const pace = Number(value);
      if (!Number.isFinite(pace)) continue;
      update[key] = pace;
      continue;
    }

    if (key === "user_email" || key === "hotel_location" || key === "budget") {
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

export async function GET(_request, { params }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        return notFoundResponse();
      }
      throw error;
    }

    if (!data) {
      return notFoundResponse();
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to load trip", error);
    return NextResponse.json(
      { error: "Unable to load trip at this time." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updates = sanitizeUpdatePayload(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields supplied for update." }, { status: 400 });
  }

  try {
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
