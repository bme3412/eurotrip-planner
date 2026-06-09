/**
 * Trip CRUD with day/activity granularity.
 *
 * All functions use the admin Supabase client (server-side only).
 */

import { getSupabaseAdmin } from '../supabase/server';
import {
  buildTripDraftPayload,
  canPersistTripDraft,
  normalizeTripState,
  TRIP_LIFECYCLE_STATUSES,
} from './tripLifecycle';

function makeShareToken() {
  return `trip_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/**
 * Create a trip with normalized day and activity rows.
 *
 * @param {object} tripPayload — flat trip row (city, dates, interests, etc.)
 * @param {object} itinerary — output from buildItinerary
 * @returns {Promise<object>} created trip with id
 */
export async function createTripWithDays(tripPayload, itinerary) {
  const supabase = await getSupabaseAdmin();

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert({
      ...tripPayload,
      status: 'planning',
      title: `${(tripPayload.city || '').charAt(0).toUpperCase() + (tripPayload.city || '').slice(1)} Trip`,
    })
    .select()
    .single();

  if (tripErr) throw tripErr;

  const days = itinerary?.days || [];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const dayDate = computeDayDate(tripPayload.start_date, i);

    const { data: dayRow, error: dayErr } = await supabase
      .from('trip_days')
      .insert({
        trip_id: trip.id,
        day_number: i + 1,
        date: dayDate,
        theme: day.theme || null,
        notes: null,
      })
      .select()
      .single();

    if (dayErr) {
      console.error(`[tripState] Failed to insert day ${i + 1}:`, dayErr);
      continue;
    }

    const activities = extractActivities(day);
    if (activities.length > 0) {
      const rows = activities.map((act, j) => ({
        trip_day_id: dayRow.id,
        time_block: act.timeBlock || 'morning',
        sort_order: j,
        start_time: act.startTime || null,
        end_time: act.endTime || null,
        name: act.name,
        type: act.type || null,
        description: act.description || null,
        duration_minutes: act.durationMinutes || null,
        price_range: act.price || null,
        latitude: act.latitude || null,
        longitude: act.longitude || null,
        neighborhood: act.neighborhood || null,
        address: act.address || null,
        google_place_id: act.googlePlaceId || null,
        indoor: act.indoor ?? false,
        booking_required: !!act.bookingUrl,
        booking_url: act.bookingUrl || null,
        status: 'planned',
      }));

      const { error: actErr } = await supabase.from('trip_activities').insert(rows);
      if (actErr) console.error(`[tripState] Failed to insert activities for day ${i + 1}:`, actErr);
    }
  }

  return trip;
}

/**
 * Create a durable draft from the conversation planner's canonical tripState.
 */
export async function createDraftTrip({ tripState, userId = null, userEmail = null, title = null, clientDedupKey = null }) {
  if (!canPersistTripDraft(tripState)) {
    throw new Error('Draft trips require at least one anchor city and a time range.');
  }

  const supabase = await getSupabaseAdmin();
  const payload = buildTripDraftPayload(tripState, {
    userId,
    userEmail,
    title,
    status: TRIP_LIFECYCLE_STATUSES.DRAFT,
  });

  const key = clientDedupKey || tripState?.meta?.clientDedupKey || null;
  const row = {
    ...payload,
    share_token: makeShareToken(),
    is_public: false,
    ...(key ? { client_dedup_key: key } : {}),
  };

  // When we have both an owner and a key, UPSERT on (user_id, client_dedup_key)
  // so concurrent autosaves and re-run migrations collapse to a single row
  // instead of inserting duplicates. Fall back to a plain insert otherwise
  // (e.g. legacy email-only ownership, or a draft created before this change).
  const builder = key && userId
    ? supabase.from('trips').upsert(row, { onConflict: 'user_id,client_dedup_key' })
    : supabase.from('trips').insert(row);

  const { data, error } = await builder.select().single();

  if (error) throw error;
  return data;
}

/**
 * Persist the latest conversation planner state into an existing trip draft.
 */
export async function updateTripDraft(tripId, { tripState, title, isPublic, status } = {}) {
  const supabase = await getSupabaseAdmin();
  const updates = {};

  if (tripState) {
    Object.assign(updates, buildTripDraftPayload(tripState, {
      title,
      status,
    }));
    delete updates.user_id;
    delete updates.user_email;
  } else {
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
  }

  if (isPublic !== undefined) {
    updates.is_public = Boolean(isPublic);
    if (isPublic) updates.status = TRIP_LIFECYCLE_STATUSES.SHARED;
  }

  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrip(tripId) {
  const supabase = await getSupabaseAdmin();
  // trip_days / trip_activities (and other children) reference trips(id) with
  // ON DELETE CASCADE, so removing the trip row removes the whole itinerary.
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) throw error;
  return { id: tripId };
}

export async function listTripsForUser({ userId = null, userEmail = null } = {}) {
  const supabase = await getSupabaseAdmin();
  if (!userId && !userEmail) return [];

  // Ownership is stored as BOTH user_id and user_email. Match on EITHER so a
  // trip stays visible even when the same person's user_id changes (e.g. the
  // same email signs in via a different provider, or a new auth record is
  // created). Matching id-only silently hid trips that are clearly the user's.
  const select = () => supabase.from('trips').select('*');
  const collected = [];
  if (userId) {
    const { data, error } = await select().eq('user_id', userId);
    if (error) throw error;
    collected.push(...(data || []));
  }
  if (userEmail) {
    const { data, error } = await select().eq('user_email', userEmail);
    if (error) throw error;
    collected.push(...(data || []));
  }

  // Dedupe by id (a trip may match both filters) and sort newest-first.
  const byId = new Map();
  for (const trip of collected) byId.set(trip.id, trip);
  return [...byId.values()].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0),
  );
}

/**
 * Fetch a trip with full nested days → activities.
 */
export async function getTripWithDetails(tripId) {
  const supabase = await getSupabaseAdmin();

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripErr) {
    if (tripErr.code === 'PGRST116') return null;
    throw tripErr;
  }

  const { data: days, error: daysErr } = await supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true });

  if (daysErr) throw daysErr;

  if (days?.length) {
    const dayIds = days.map((d) => d.id);
    const { data: activities, error: actErr } = await supabase
      .from('trip_activities')
      .select('*')
      .in('trip_day_id', dayIds)
      .order('sort_order', { ascending: true });

    if (actErr) throw actErr;

    const actByDay = {};
    for (const act of activities || []) {
      if (!actByDay[act.trip_day_id]) actByDay[act.trip_day_id] = [];
      actByDay[act.trip_day_id].push(act);
    }

    for (const day of days) {
      day.activities = actByDay[day.id] || [];
    }
  }

  return { ...trip, days: days || [] };
}

export async function getTripByShareToken(shareToken) {
  const supabase = await getSupabaseAdmin();
  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return trip ? getTripWithDetails(trip.id) : null;
}

export async function persistGeneratedItinerary(tripId, itinerary, tripState) {
  const supabase = await getSupabaseAdmin();
  const normalized = normalizeTripState(tripState);
  const draftPayload = buildTripDraftPayload(normalized, {
    status: TRIP_LIFECYCLE_STATUSES.ITINERARY_GENERATED,
  });
  // CRITICAL: buildTripDraftPayload defaults owner fields to null when no
  // userId/userEmail is passed. Never let generating an itinerary overwrite the
  // trip's owner — that orphans the trip (invisible in "my trips", 403 on
  // future writes). Ownership is set at creation and must be preserved here.
  delete draftPayload.user_id;
  delete draftPayload.user_email;

  await supabase.from('trip_days').delete().eq('trip_id', tripId);

  const days = itinerary?.days || [];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const city = day.city || day.cityName || day.location || null;
    const dayDate = normalizeGeneratedDayDate(day.date) || computeDayDate(draftPayload.start_date, i);
    const { data: dayRow, error: dayErr } = await supabase
      .from('trip_days')
      .insert({
        trip_id: tripId,
        day_number: day.dayNumber || i + 1,
        date: dayDate,
        theme: day.theme || `Day ${i + 1}`,
        notes: day.notes || null,
        city,
        country: day.country || null,
        is_travel_day: Boolean(day.isTravelDay),
      })
      .select()
      .single();

    if (dayErr) throw dayErr;

    const activities = extractActivities(day);
    if (activities.length > 0) {
      const rows = activities.map((act, j) => ({
        trip_day_id: dayRow.id,
        time_block: act.timeBlock || 'morning',
        sort_order: j,
        start_time: act.startTime || null,
        end_time: act.endTime || null,
        name: act.name,
        type: act.type || null,
        description: act.description || null,
        duration_minutes: act.durationMinutes || null,
        price_range: act.price || null,
        latitude: act.latitude || null,
        longitude: act.longitude || null,
        neighborhood: act.neighborhood || null,
        address: act.address || null,
        google_place_id: act.googlePlaceId || null,
        indoor: act.indoor ?? false,
        booking_required: !!act.bookingUrl,
        booking_url: act.bookingUrl || null,
        status: 'planned',
      }));
      const { error: actErr } = await supabase.from('trip_activities').insert(rows);
      if (actErr) throw actErr;
    }
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      ...draftPayload,
      initial_plan: itinerary,
      status: TRIP_LIFECYCLE_STATUSES.ITINERARY_GENERATED,
      itinerary_generated_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Partial update on a single activity.
 */
export async function updateActivity(activityId, updates) {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from('trip_activities')
    .update(updates)
    .eq('id', activityId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Swap an activity (e.g. weather adaptation).
 * Marks original as swapped, inserts new activity in its place.
 */
export async function swapActivity(activityId, newActivityData, reason) {
  const supabase = await getSupabaseAdmin();

  const { data: original, error: origErr } = await supabase
    .from('trip_activities')
    .update({ status: 'weather_swapped' })
    .eq('id', activityId)
    .select()
    .single();

  if (origErr) throw origErr;

  const { data: replacement, error: repErr } = await supabase
    .from('trip_activities')
    .insert({
      trip_day_id: original.trip_day_id,
      time_block: original.time_block,
      sort_order: original.sort_order,
      ...newActivityData,
      original_activity_id: activityId,
      swap_reason: reason,
      status: 'planned',
    })
    .select()
    .single();

  if (repErr) throw repErr;
  return replacement;
}

/**
 * Get active trips (status=active, current dates) for nightly briefing.
 */
export async function getActiveTrips() {
  const supabase = await getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today);

  if (error) throw error;

  const results = [];
  for (const trip of trips || []) {
    const full = await getTripWithDetails(trip.id);
    if (full) results.push(full);
  }
  return results;
}

/**
 * Trips the concierge scheduler should consider this tick: those currently active
 * OR starting tomorrow (so the arrival-eve brief fires), whose owner has the
 * concierge enabled. Returns [{ trip (full details), prefs }].
 */
export async function getConciergeWindowTrips() {
  const supabase = await getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Active today, or starting tomorrow.
  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .or(`and(status.eq.active,start_date.lte.${today},end_date.gte.${today}),start_date.eq.${tomorrow}`);
  if (error) throw error;
  if (!trips?.length) return [];

  // Only owners who have opted in.
  const { data: prefRows } = await supabase
    .from('concierge_preferences')
    .select('*')
    .eq('enabled', true);
  const byUserId = new Map();
  const byEmail = new Map();
  for (const p of prefRows || []) {
    if (p.user_id) byUserId.set(p.user_id, p);
    if (p.user_email) byEmail.set(p.user_email, p);
  }

  const out = [];
  for (const trip of trips) {
    const prefs = (trip.user_id && byUserId.get(trip.user_id)) || (trip.user_email && byEmail.get(trip.user_email)) || null;
    if (!prefs) continue;
    const full = await getTripWithDetails(trip.id);
    if (full) out.push({ trip: full, prefs });
  }
  return out;
}

// ── Internal helpers ─────────────────────────────────────────────────

function computeDayDate(startDate, dayIndex) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().slice(0, 10);
}

function normalizeGeneratedDayDate(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

// The trip_activities.time_block column only permits these values (see
// supabase/migrations/0002_trip_activities.sql). The itinerary builder uses a
// finer-grained set (early_morning / late_morning / late_afternoon) for display
// and ordering, so collapse those to the persisted enum here. start_time keeps
// the precise ordering, so nothing is lost on read-back.
const TIME_BLOCK_TO_DB = {
  early_morning: 'morning',
  morning: 'morning',
  late_morning: 'morning',
  lunch: 'lunch',
  noon: 'lunch',
  afternoon: 'afternoon',
  late_afternoon: 'evening',
  evening: 'evening',
  night: 'night',
};

// The values permitted by the trip_activities.time_block CHECK constraint.
export const DB_TIME_BLOCKS = Object.freeze(['morning', 'lunch', 'afternoon', 'evening', 'night']);

export function toDbTimeBlock(time) {
  return TIME_BLOCK_TO_DB[(time || '').toLowerCase()] || 'morning';
}

/**
 * Extract activities from buildItinerary output (day.timeBlocks shape).
 */
function extractActivities(day) {
  if (!day.timeBlocks) return [];
  const activities = [];
  for (const block of day.timeBlocks) {
    if (!block.activity) continue;
    activities.push({
      timeBlock: toDbTimeBlock(block.time),
      startTime: block.startTime || null,
      endTime: block.endTime || null,
      name: block.activity.name,
      type: block.activity.type || null,
      description: block.activity.description || null,
      durationMinutes: block.activity.duration ? parseDurationMinutes(block.activity.duration) : null,
      price: block.activity.price || null,
      latitude: block.activity.latitude || null,
      longitude: block.activity.longitude || null,
      neighborhood: block.activity.neighborhood || null,
      bookingUrl: block.activity.bookingUrl || null,
      indoor: block.activity.indoor ?? false,
    });
  }
  return activities;
}

function parseDurationMinutes(str) {
  if (!str) return null;
  const match = str.match(/(\d+\.?\d*)\s*(h|hr|hour|min)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].startsWith('h') ? Math.round(val * 60) : Math.round(val);
}

