"use server";

import { NextResponse } from "next/server";
import { listTripsForUser, deleteTrip } from "@/lib/trips/tripsRepository";
import { tripSignature } from "@/lib/trips/tripLifecycle";
import { getRequesterFromAuthHeader } from "@/lib/supabase/requestAuth";

/**
 * Score a trip for "richness" so that when collapsing a duplicate group we keep
 * the most valuable row: a generated itinerary beats a bare draft, then the most
 * recently updated, then the oldest-created (the original).
 */
function richnessScore(trip) {
  const generated = trip.itinerary_generated_at ? 1 : 0;
  const updated = new Date(trip.updated_at || trip.created_at || 0).getTime() || 0;
  return generated * 1e15 + updated;
}

/**
 * POST /api/trips/dedupe
 *
 * One-shot cleanup of EXISTING duplicate trips created before the
 * client_dedup_key idempotency key existed. Groups the caller's trips by a
 * coarse signature (title + cities + dates), keeps the richest/newest row in
 * each group, and deletes the rest (cascade removes their days/activities).
 *
 * Idempotent: once duplicates are gone, every group has size 1 and nothing is
 * removed. The client guards repeat calls with a localStorage flag anyway.
 */
export async function POST(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  let trips;
  try {
    trips = await listTripsForUser({
      userId: requester.userId,
      userEmail: requester.userEmail,
    });
  } catch (error) {
    console.error("[dedupe] Failed to list trips", error);
    return NextResponse.json({ error: "Unable to load trips." }, { status: 500 });
  }

  // Group by signature; only collapse groups with a real (non-empty) signature
  // so we never merge unrelated incomplete trips that share an empty fingerprint.
  const groups = new Map();
  for (const trip of trips) {
    const sig = tripSignature(trip);
    if (!sig || sig === "||") continue;
    const bucket = groups.get(sig) || [];
    bucket.push(trip);
    groups.set(sig, bucket);
  }

  const toRemove = [];
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    bucket.sort((a, b) => richnessScore(b) - richnessScore(a));
    // Keep bucket[0]; remove the rest.
    toRemove.push(...bucket.slice(1));
  }

  // Delete in parallel — independent rows, no ordering dependency.
  const outcomes = await Promise.allSettled(toRemove.map((trip) => deleteTrip(trip.id)));
  let removed = 0;
  outcomes.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") removed += 1;
    else console.warn("[dedupe] Failed to delete duplicate trip", toRemove[i].id, outcome.reason);
  });

  return NextResponse.json({ removed, groups: groups.size }, { status: 200 });
}
