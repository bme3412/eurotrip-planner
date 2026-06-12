import { getSupabaseAdmin } from '@/lib/supabase/server';

// Durable store for concierge day prose (concierge_day_briefs, migration 0015).
// Only Olivier's written voice lives here — the deterministic facts (schedule,
// depart-by, weather) are recomputed on every request by generateBrief. Rows
// are keyed (trip_id, day_number) with a content_hash of the prompt inputs so
// the caller can serve a stale row instantly and regenerate in the background.
//
// Service-role only: access control happens in the API routes
// (requireTripReadAccess), which also covers anonymous/public-share trips.

const l1 = new Map(); // `${tripId}:${dayNumber}` → row
const MAX_L1 = 100;

function l1Set(key, row) {
  if (l1.size >= MAX_L1) l1.delete(l1.keys().next().value);
  l1.set(key, row);
}

/**
 * Read the stored brief for a (trip, day) — regardless of content hash; the
 * caller compares hashes to decide fresh vs stale. Returns null on any failure
 * (including the table not existing yet, pre-migration) so behavior degrades
 * to plain generation.
 */
export async function getStoredBrief(tripId, dayNumber) {
  const key = `${tripId}:${dayNumber}`;
  const hit = l1.get(key);
  if (hit) return hit;
  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from('concierge_day_briefs')
      .select('content_hash, prose, model, generated_at')
      .eq('trip_id', tripId)
      .eq('day_number', dayNumber)
      .maybeSingle();
    if (error || !data) return null;
    const row = {
      contentHash: data.content_hash,
      prose: data.prose,
      model: data.model,
      generatedAt: data.generated_at,
    };
    l1Set(key, row);
    return row;
  } catch (err) {
    console.warn('[concierge] brief store read failed:', err?.message);
    return null;
  }
}

/**
 * Upsert a freshly generated brief. Never throws — a storage failure must not
 * break a successful generation (the payload is already in hand).
 */
export async function saveBrief({ tripId, dayNumber, contentHash, prose, model }) {
  const row = { contentHash, prose, model, generatedAt: new Date().toISOString() };
  l1Set(`${tripId}:${dayNumber}`, row);
  try {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from('concierge_day_briefs').upsert(
      {
        trip_id: tripId,
        day_number: dayNumber,
        content_hash: contentHash,
        prose,
        model,
        generated_at: row.generatedAt,
        updated_at: row.generatedAt,
      },
      { onConflict: 'trip_id,day_number' }
    );
    if (error) console.warn('[concierge] brief store write failed:', error.message);
  } catch (err) {
    console.warn('[concierge] brief store write failed:', err?.message);
  }
}
