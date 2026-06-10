// Early-access invite checks for the concierge closed beta. A user is invited
// when their email is on the CONCIERGE_ALLOWLIST env var (comma-separated,
// the operator escape hatch) or their concierge_waitlist row has invited_at
// set (flipped by scripts/concierge-invite.mjs).
//
// Enforcement lives at send time — getConciergeWindowTrips() for the scheduler
// and /api/concierge/send-now for the button — because the opt-in toggle
// writes concierge_preferences straight from the client under RLS. Flipping
// the toggle without an invite is harmless: nothing ever sends.
//
// DB access goes through an injected Supabase client so the logic is testable
// in plain Node. Query failures fail CLOSED (treated as not invited) except
// for the allowlist, which never touches the database.

export function parseAllowlist(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

/** Pure index over invited waitlist rows + the allowlist. */
export function buildInviteIndex(rows, allowlistRaw) {
  const emails = parseAllowlist(allowlistRaw);
  const userIds = new Set();
  for (const row of rows || []) {
    const email = normalizeEmail(row?.email);
    if (email) emails.add(email);
    if (row?.user_id) userIds.add(row.user_id);
  }
  return { emails, userIds };
}

/** Pure membership check against a built index. */
export function indexHasInvite(index, { email = null, userId = null } = {}) {
  const normalized = normalizeEmail(email);
  if (normalized && index.emails.has(normalized)) return true;
  if (userId && index.userIds.has(userId)) return true;
  return false;
}

/**
 * Load all invited waitlist rows into an index. The waitlist is small by
 * definition (closed beta), so one query beats per-user lookups. On query
 * failure only the allowlist survives.
 */
export async function loadInviteIndex(supabase, allowlistRaw = process.env.CONCIERGE_ALLOWLIST) {
  let rows = [];
  if (supabase) {
    const { data, error } = await supabase
      .from('concierge_waitlist')
      .select('email, user_id')
      .not('invited_at', 'is', null);
    if (error) {
      console.error('[concierge/invites] waitlist query failed:', error.message);
    } else {
      rows = data || [];
    }
  }
  return buildInviteIndex(rows, allowlistRaw);
}

/**
 * Is this user invited to the early-access concierge?
 * @returns {Promise<boolean>}
 */
export async function isInvited({ supabase, email = null, userId = null, allowlistRaw = process.env.CONCIERGE_ALLOWLIST }) {
  const allowlist = parseAllowlist(allowlistRaw);
  const normalized = normalizeEmail(email);
  if (normalized && allowlist.has(normalized)) return true;
  if (!supabase || (!normalized && !userId)) return false;
  const index = await loadInviteIndex(supabase, allowlistRaw);
  return indexHasInvite(index, { email: normalized, userId });
}
