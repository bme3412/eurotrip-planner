// The agent thread — the canonical conversation per (trip, user). Scheduled
// beats post INTO it (notifications/push/email are receipts pointing here);
// user replies and Olivier's answers live here too.
//
// Pure validation is separated from DB calls (extract-and-inject) so the
// invariants are testable in plain Node. All writes go through the service
// role; clients only read (RLS) + subscribe (Realtime).

export const MESSAGE_ROLES = new Set(['user', 'olivier', 'system']);
export const MESSAGE_KINDS = new Set([
  'chat',
  'evening_brief',
  'morning_wakeup',
  'wind_down',
  'reactive',
  'action',
  'system',
]);
export const BEAT_KINDS = new Set(['evening_brief', 'morning_wakeup', 'wind_down', 'reactive']);
export const MESSAGE_CHANNELS = new Set(['app', 'push', 'email', 'telegram', 'whatsapp']);

const MAX_BODY_LENGTH = 8000;

/**
 * Normalize + validate a message before insert.
 * @returns {{ error: string } | { record: object }}
 */
export function normalizeMessage({ role, kind = 'chat', body, meta = {}, channel = 'app', dayNumber = null } = {}) {
  if (!MESSAGE_ROLES.has(role)) return { error: `invalid role: ${role}` };
  if (!MESSAGE_KINDS.has(kind)) return { error: `invalid kind: ${kind}` };
  if (!MESSAGE_CHANNELS.has(channel)) return { error: `invalid channel: ${channel}` };
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) return { error: 'empty body' };
  if (BEAT_KINDS.has(kind) && !Number.isFinite(dayNumber)) {
    return { error: `beat kind ${kind} requires a dayNumber` };
  }
  return {
    record: {
      role,
      kind,
      body: text.slice(0, MAX_BODY_LENGTH),
      meta: meta && typeof meta === 'object' ? meta : {},
      channel,
      day_number: Number.isFinite(dayNumber) ? dayNumber : null,
    },
  };
}

/** Find or create the thread for (trip, user). Service-role only. */
export async function getOrCreateThread(supabase, { tripId, userId, userEmail = null }) {
  if (!tripId || !userId) return { error: 'tripId and userId required' };

  const { data: existing, error: findErr } = await supabase
    .from('concierge_threads')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();
  if (findErr) return { error: findErr.message };
  if (existing) return { thread: existing };

  const { data: created, error: insErr } = await supabase
    .from('concierge_threads')
    .insert({ trip_id: tripId, user_id: userId, user_email: userEmail })
    .select('id')
    .single();
  // Unique (trip_id, user_id) race: another writer created it first — re-read.
  if (insErr) {
    const { data: raced } = await supabase
      .from('concierge_threads')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .maybeSingle();
    if (raced) return { thread: raced };
    return { error: insErr.message };
  }
  return { thread: created };
}

/**
 * Append a message. Beats are idempotent per (thread, day, kind): a re-send
 * updates the existing row in place instead of duplicating (the partial unique
 * index is the backstop against races).
 */
export async function appendThreadMessage(supabase, { threadId, userId, userEmail = null, ...msg }) {
  if (!threadId || !userId) return { error: 'threadId and userId required' };
  const { record, error } = normalizeMessage(msg);
  if (error) return { error };

  const row = { thread_id: threadId, user_id: userId, user_email: userEmail, ...record };

  if (BEAT_KINDS.has(record.kind)) {
    const { data: existing } = await supabase
      .from('concierge_messages')
      .select('id')
      .eq('thread_id', threadId)
      .eq('day_number', record.day_number)
      .eq('kind', record.kind)
      .maybeSingle();
    if (existing) {
      const { data, error: updErr } = await supabase
        .from('concierge_messages')
        .update({ body: row.body, meta: row.meta, channel: row.channel })
        .eq('id', existing.id)
        .select()
        .single();
      if (updErr) return { error: updErr.message };
      return { message: data, refreshed: true };
    }
  }

  const { data, error: insErr } = await supabase.from('concierge_messages').insert(row).select().single();
  if (insErr) return { error: insErr.message };

  // Thread freshness bump (drives "last activity" ordering later). Awaited —
  // serverless cuts off dangling promises — but never fails the append.
  try {
    await supabase.from('concierge_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
  } catch {
    /* best-effort */
  }

  return { message: data };
}

/** Last N messages, oldest-first, for prompt history and the initial UI load. */
export async function listThreadMessages(supabase, { threadId, limit = 50 }) {
  const { data, error } = await supabase
    .from('concierge_messages')
    .select('id, role, kind, day_number, body, meta, channel, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { messages: (data || []).reverse() };
}
