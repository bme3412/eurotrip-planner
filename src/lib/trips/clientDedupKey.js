/**
 * Stable, client-generated idempotency key for trip drafts.
 *
 * The `trips` table has no natural key, so every create path (createDraftTrip,
 * planner autosave, sign-in migration) used to INSERT a fresh row — which is why
 * a single logical trip could fan out into a dozen "Paris Trip" duplicates.
 *
 * A `clientDedupKey` is minted once when a draft first comes into existence on
 * the client and then carried forever inside `trip_state.meta.clientDedupKey`
 * (which survives normalizeTripState and the POST body, both of which only
 * forward `tripState`). The server mirrors it into the `client_dedup_key`
 * column, which has a UNIQUE(user_id, client_dedup_key) index, so repeated
 * creates with the same key collapse to one row via UPSERT.
 *
 * It is a RANDOM TOKEN, not a content hash: titles auto-derive to "{City} Trip"
 * and dates change as the user edits, so a content hash would both collide
 * across distinct trips and drift for a single trip. A random token bound to
 * "this draft" gives exactly one server row regardless of edits or re-migration.
 */

export function makeClientDedupKey() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // fall through to the entropy fallback below
  }
  return `cdk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientDedupKey(tripState) {
  return tripState?.meta?.clientDedupKey || null;
}

/**
 * Return `{ key, tripState }` where tripState carries `meta.clientDedupKey`.
 * Reuses an existing key when present so the identity is stable across edits;
 * mints one otherwise. Never mutates the input.
 */
export function ensureClientDedupKey(tripState) {
  const key = getClientDedupKey(tripState) || makeClientDedupKey();
  return {
    key,
    tripState: {
      ...(tripState || {}),
      meta: { ...(tripState?.meta || {}), clientDedupKey: key },
    },
  };
}
