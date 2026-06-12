// Durable agent memory ("hates crowds", "traveling with a toddler"). Written
// by the agent's `remember` tool, injected into every generation as a digest.
// Pure formatting is separated from DB access for plain-Node tests.

const MAX_FACT_LENGTH = 280;
const DIGEST_LIMIT = 20;

/** Validate + trim a fact before insert. */
export function normalizeFact(fact) {
  const text = typeof fact === 'string' ? fact.trim() : '';
  if (!text) return { error: 'empty fact' };
  return { fact: text.slice(0, MAX_FACT_LENGTH) };
}

/** Render memory rows as prompt lines. Pure. */
export function formatMemoryDigest(rows) {
  const lines = (rows || [])
    .map((r) => (typeof r?.fact === 'string' ? r.fact.trim() : ''))
    .filter(Boolean)
    .slice(0, DIGEST_LIMIT)
    .map((f) => `- ${f}`);
  return lines.length ? lines.join('\n') : null;
}

/** Store a fact. scope 'trip' pins it to this trip; 'always' carries across trips. */
export async function rememberFact(supabase, { userId, tripId, fact, scope = 'trip', source = 'user' }) {
  const { fact: clean, error } = normalizeFact(fact);
  if (error) return { error };
  const { error: insErr } = await supabase.from('concierge_memories').insert({
    user_id: userId,
    trip_id: scope === 'always' ? null : tripId,
    fact: clean,
    source,
  });
  if (insErr) return { error: insErr.message };
  return { ok: true, fact: clean };
}

/** Facts that apply to this trip: trip-scoped + user-wide, newest first. */
export async function loadMemories(supabase, { userId, tripId }) {
  const { data, error } = await supabase
    .from('concierge_memories')
    .select('fact, trip_id, created_at')
    .eq('user_id', userId)
    .or(`trip_id.eq.${tripId},trip_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(DIGEST_LIMIT);
  if (error) {
    console.error('[concierge/memories] load failed:', error.message);
    return [];
  }
  return data || [];
}
