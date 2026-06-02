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
export async function createDraftTrip({ tripState, userId = null, userEmail = null, title = null }) {
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

  const { data, error } = await supabase
    .from('trips')
    .insert({
      ...payload,
      share_token: makeShareToken(),
      is_public: false,
    })
    .select()
    .single();

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
  let query = supabase
    .from('trips')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  else if (userEmail) query = query.eq('user_email', userEmail);
  else query = query.limit(0);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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

/**
 * Extract activities from buildItinerary output (day.timeBlocks shape).
 */
function extractActivities(day) {
  if (!day.timeBlocks) return [];
  const activities = [];
  for (const block of day.timeBlocks) {
    if (!block.activity) continue;
    activities.push({
      timeBlock: block.time || 'morning',
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

