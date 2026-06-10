import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { generateConciergeDay } from '@/lib/concierge/generateBrief';
import { buildConciergeContext } from '@/lib/concierge/buildContext';
import { generateReactiveAlert } from '@/lib/concierge/generateReactive';
import { pushToUser } from '@/lib/concierge/webpush';
import { sendBriefEmail } from '@/lib/concierge/email';
import { getOrCreateThread, appendThreadMessage } from '@/lib/concierge/thread';
import { hoursAlertBody } from '@/lib/concierge/hoursCheck';
import { buildProposal } from '@/lib/concierge/tripActions';

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

  // The thread is the canonical conversation — beats post into it so the user
  // can reply. Best-effort: the notification row above stays the durable
  // delivery record even if the thread tables aren't migrated yet.
  if (trip.user_id) {
    try {
      const { thread } = await getOrCreateThread(supabase, {
        tripId,
        userId: trip.user_id,
        userEmail: trip.user_email,
      });
      if (thread) {
        await appendThreadMessage(supabase, {
          threadId: thread.id,
          userId: trip.user_id,
          userEmail: trip.user_email,
          role: 'olivier',
          kind: type,
          dayNumber: day.dayNumber ?? null,
          body: bodyText,
          meta: { day, cityName: day.cityName, dateLabel: day.dateLabel },
        });
      }
    } catch (err) {
      console.error('[concierge/notify] thread append failed:', err?.message);
    }
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

  // Web Push (best-effort) — a receipt that deep-links into Trip Home's thread.
  let push = { sent: 0 };
  try {
    push = await pushToUser(trip.user_id, {
      title,
      body: bodyText,
      url: `/trips/${tripId}/today`,
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

/**
 * Deliver a proactive reactive alert (the v3 "the day changed" beat) for a real
 * detected signal. In-app + push (urgent); no email. Idempotent per
 * (user, trip, day, 'reactive') — re-detecting refreshes in place.
 *
 * @param {object} args
 * @param {string} args.tripId
 * @param {number} args.dayNumber  the affected day
 * @param {object} args.signal     materiality signal from assessWeatherChange
 */
export async function sendReactiveAlert({ tripId, dayNumber, signal }) {
  const trip = await getTripWithDetails(tripId);
  if (!trip) return { ok: false, reason: 'trip_not_found' };
  if (!trip.user_id && !trip.user_email) return { ok: false, reason: 'trip_unowned' };

  const ctx = buildConciergeContext(trip, { dayNumber });
  const d = ctx.selectedDay;
  if (!d) return { ok: false, reason: 'no_day' };

  const alert = await generateReactiveAlert(
    { cityName: d.cityName, dateLabel: d.dateLabel, schedule: d.schedule, country: d.country, city: d.city },
    signal
  );

  const title = `Heads up · ${d.cityName || trip.city || 'your trip'}`;
  const row = {
    user_id: trip.user_id,
    user_email: trip.user_email,
    trip_id: tripId,
    day_number: d.dayNumber ?? dayNumber ?? null,
    type: 'reactive',
    title,
    body: alert.body,
    meta: { reactive: alert, signal, cityName: d.cityName, dateLabel: d.dateLabel },
  };

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from('concierge_notifications')
    .upsert(row, { onConflict: 'user_id,trip_id,day_number,type' })
    .select()
    .single();
  if (error) {
    console.error('[concierge/notify] reactive insert failed:', error.message);
    return { ok: false, reason: 'insert_failed' };
  }

  if (trip.user_id) {
    try {
      const { thread } = await getOrCreateThread(supabase, {
        tripId,
        userId: trip.user_id,
        userEmail: trip.user_email,
      });
      if (thread) {
        await appendThreadMessage(supabase, {
          threadId: thread.id,
          userId: trip.user_id,
          userEmail: trip.user_email,
          role: 'olivier',
          kind: 'reactive',
          dayNumber: d.dayNumber ?? dayNumber ?? null,
          body: alert.body,
          meta: { reactive: alert, signal, cityName: d.cityName, dateLabel: d.dateLabel },
        });
      }
    } catch (err) {
      console.error('[concierge/notify] reactive thread append failed:', err?.message);
    }
  }

  let push = { sent: 0 };
  try {
    push = await pushToUser(trip.user_id, { title, body: alert.body, url: `/trips/${tripId}/today` });
  } catch (err) {
    console.error('[concierge/notify] reactive push failed:', err?.message);
  }

  return { ok: true, notification: data, push };
}

/**
 * Deliver the night-before opening-hours alert (T3 watcher). Deterministic
 * copy — code owns these facts — and, when there's exactly one unambiguous
 * issue, the fix ships WITH the alert as a pending proposal (the same
 * Apply/Skip card the thread agent uses): closed → skip it; opens later →
 * move it to opening time.
 *
 * @param {object} args { tripId, dayNumber, issues: [{ name, time, status, opensAt? }] }
 */
export async function sendHoursAlert({ tripId, dayNumber, issues }) {
  const trip = await getTripWithDetails(tripId);
  if (!trip) return { ok: false, reason: 'trip_not_found' };
  if (!trip.user_id && !trip.user_email) return { ok: false, reason: 'trip_unowned' };

  const ctx = buildConciergeContext(trip, { dayNumber });
  const d = ctx.selectedDay;
  const body = hoursAlertBody(issues, { cityName: d?.cityName || trip.city || null });

  // One clear issue → attach the obvious fix as a proposal.
  let proposal = null;
  if (issues.length === 1) {
    const issue = issues[0];
    const intent =
      issue.status === 'opens_later'
        ? { action: 'move_activity', dayNumber, activityName: issue.name, toTime: issue.opensAt }
        : { action: 'remove_activity', dayNumber, activityName: issue.name };
    const built = buildProposal(trip, intent);
    if (built.proposal) proposal = { ...built.proposal, status: 'pending' };
  }

  const title = `Heads up · ${d?.cityName || trip.city || 'your trip'}`;
  const supabase = await getSupabaseAdmin();
  const row = {
    user_id: trip.user_id,
    user_email: trip.user_email,
    trip_id: tripId,
    day_number: dayNumber ?? null,
    type: 'hours_alert',
    title,
    body,
    meta: { issues, cityName: d?.cityName || null, dateLabel: d?.dateLabel || null },
  };
  const { data, error } = await supabase
    .from('concierge_notifications')
    .upsert(row, { onConflict: 'user_id,trip_id,day_number,type' })
    .select()
    .single();
  if (error) {
    console.error('[concierge/notify] hours insert failed:', error.message);
    return { ok: false, reason: 'insert_failed' };
  }

  if (trip.user_id) {
    try {
      const { thread } = await getOrCreateThread(supabase, {
        tripId,
        userId: trip.user_id,
        userEmail: trip.user_email,
      });
      if (thread) {
        await appendThreadMessage(supabase, {
          threadId: thread.id,
          userId: trip.user_id,
          userEmail: trip.user_email,
          role: 'olivier',
          kind: 'hours_alert',
          dayNumber: dayNumber ?? null,
          body,
          meta: { issues, ...(proposal ? { proposal } : {}) },
        });
      }
    } catch (err) {
      console.error('[concierge/notify] hours thread append failed:', err?.message);
    }
  }

  let push = { sent: 0 };
  try {
    push = await pushToUser(trip.user_id, { title, body, url: `/trips/${tripId}/today` });
  } catch (err) {
    console.error('[concierge/notify] hours push failed:', err?.message);
  }

  return { ok: true, notification: data, push, proposed: !!proposal };
}
