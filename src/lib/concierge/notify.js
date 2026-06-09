import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { generateConciergeDay } from '@/lib/concierge/generateBrief';
import { pushToUser } from '@/lib/concierge/webpush';
import { sendBriefEmail } from '@/lib/concierge/email';

// Channel-agnostic concierge send pipeline. Today it delivers in-app by inserting
// a row into concierge_notifications (Supabase Realtime fans it out to the live
// bell). Web Push (Phase 3) and email (Phase 4) hook in here as extra steps after
// the insert; the in-app row stays the durable record.

/**
 * Generate a brief for one trip-day and deliver it as a notification.
 * Idempotent on (user_id, trip_id, day_number, type) — re-sending updates in place.
 *
 * @param {object} args
 * @param {string} args.tripId
 * @param {number|null} [args.dayNumber]  null → first real day
 * @param {string} [args.type]            'evening_brief' (default)
 * @returns {Promise<{ ok: boolean, notification?: object, reason?: string }>}
 */
export async function sendConciergeBrief({ tripId, dayNumber = null, type = 'evening_brief' }) {
  const trip = await getTripWithDetails(tripId);
  if (!trip) return { ok: false, reason: 'trip_not_found' };
  if (!trip.user_id && !trip.user_email) return { ok: false, reason: 'trip_unowned' };

  const payload = await generateConciergeDay(trip, dayNumber);
  const day = payload?.day;
  if (!day) return { ok: false, reason: 'generation_failed' };

  const title = `Tonight’s brief · ${day.cityName || trip.city || 'your trip'}`;
  const bodyText = day.pushLine || day.briefs?.eveningBrief?.body || 'Tomorrow’s plan is ready.';

  const row = {
    user_id: trip.user_id,
    user_email: trip.user_email,
    trip_id: tripId,
    day_number: day.dayNumber ?? null,
    type,
    title,
    body: bodyText,
    // Stash the full brief so the inbox can render the rich detail without re-generating.
    meta: {
      day,
      cityName: day.cityName,
      dateLabel: day.dateLabel,
    },
  };

  const supabase = await getSupabaseAdmin();
  // Upsert on the dedup key so re-sends refresh content instead of duplicating.
  const { data, error } = await supabase
    .from('concierge_notifications')
    .upsert(row, { onConflict: 'user_id,trip_id,day_number,type' })
    .select()
    .single();

  if (error) {
    console.error('[concierge/notify] insert failed:', error.message);
    return { ok: false, reason: 'insert_failed' };
  }

  // The user's channel preferences (best-effort — defaults are safe).
  let prefs = {};
  try {
    const { data: pref } = await supabase
      .from('concierge_preferences')
      .select('email_enabled')
      .eq('user_id', trip.user_id)
      .maybeSingle();
    prefs = pref || {};
  } catch { /* table/row may be absent — treat as no email */ }

  // Web Push (best-effort) — the in-app row above is the durable record.
  let push = { sent: 0 };
  try {
    push = await pushToUser(trip.user_id, {
      title,
      body: bodyText,
      url: `/itineraries/${tripId}/concierge`,
    });
  } catch (err) {
    console.error('[concierge/notify] push failed:', err?.message);
  }

  // Email — only the evening brief (don't email all three beats), only if opted in.
  let email = { sent: false, skipped: type !== 'evening_brief' ? 'not_evening' : !prefs.email_enabled ? 'not_opted_in' : 'no_email' };
  if (type === 'evening_brief' && prefs.email_enabled && trip.user_email) {
    try {
      email = await sendBriefEmail({ to: trip.user_email, day, cityName: day.cityName });
    } catch (err) {
      console.error('[concierge/notify] email failed:', err?.message);
      email = { sent: false, skipped: 'error' };
    }
  }

  return { ok: true, notification: data, push, email };
}
