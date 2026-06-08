/**
 * Unified saved-items engine.
 *
 * The app persists three saved-item collections — trips, saved cities
 * (saved_trips) and saved attractions (saved_experiences) — that historically
 * each grew their own copy of "read local, sync to Supabase on sign-in,
 * de-duplicate" logic (and attractions never got a migration at all). This
 * module centralizes the shared mechanics so every collection migrates the same
 * idempotent way and there is one place to reason about it.
 *
 * Kept React-free so it can be unit-tested with a stub supabase client. The
 * React lifecycle lives in useSavedCollection / the per-type hooks.
 */

/**
 * Insert `rows` into `table` for `userId`, skipping any whose dedup key already
 * exists on the server. Idempotent: re-running inserts nothing new.
 *
 * `keyOf` runs on BOTH the existing server rows (which expose the key columns)
 * and the insert payloads (which include the same columns), so the comparison
 * is apples-to-apples regardless of source.
 *
 * @param {object}   params
 * @param {object}   params.supabase     Supabase client (browser).
 * @param {string}   params.table        Table name.
 * @param {string}   params.userId       Owner id.
 * @param {Array}    params.rows         Insert payloads (already include user_id).
 * @param {string[]} params.keyColumns   Columns to select for the dedup check.
 * @param {(r:object)=>string|null} params.keyOf  Dedup key extractor.
 * @returns {Promise<{inserted:number, skipped:number, error:any}>}
 */
export async function migrateRows({ supabase, table, userId, rows, keyColumns, keyOf }) {
  if (!supabase || !userId) return { inserted: 0, skipped: 0, error: null };
  if (!Array.isArray(rows) || rows.length === 0) return { inserted: 0, skipped: 0, error: null };

  const { data: existing, error: readErr } = await supabase
    .from(table)
    .select(keyColumns.join(','))
    .eq('user_id', userId);
  if (readErr) return { inserted: 0, skipped: 0, error: readErr };

  const taken = new Set((existing || []).map(keyOf).filter(Boolean));
  const toInsert = rows.filter((r) => {
    const k = keyOf(r);
    return k && !taken.has(k);
  });

  if (toInsert.length === 0) {
    return { inserted: 0, skipped: rows.length, error: null };
  }

  // The real unique constraints are (user_id, ...keyColumns); include user_id in
  // the conflict target. ignoreDuplicates so a race against it is harmless.
  const conflictTarget = ['user_id', ...keyColumns].join(',');
  const { error: insertErr } = await supabase
    .from(table)
    .upsert(toInsert, { onConflict: conflictTarget, ignoreDuplicates: true });
  if (insertErr) return { inserted: 0, skipped: 0, error: insertErr };

  return {
    inserted: toInsert.length,
    skipped: rows.length - toInsert.length,
    error: null,
  };
}

/** Per-user migration guard helpers shared by every collection. */
export function wasMigratedFor(migrationKey, userId, storage) {
  if (!storage || !userId || !migrationKey) return false;
  try {
    return storage.getItem(migrationKey) === userId;
  } catch {
    return false;
  }
}

export function markMigratedFor(migrationKey, userId, storage) {
  if (!storage || !userId || !migrationKey) return;
  try {
    storage.setItem(migrationKey, userId);
  } catch {
    // fail quietly
  }
}
