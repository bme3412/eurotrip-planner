-- Migration: client-generated idempotency key for trip drafts
-- Prerequisite: 0005_trip_lifecycle.sql
--
-- The trips table had no natural/idempotency key, so the three create paths
-- (createDraftTrip, planner autosave, sign-in migration) each INSERTed a fresh
-- row. A single logical trip could fan out into many duplicate "Paris Trip"
-- drafts. This adds a stable client-minted key and a unique index so repeated
-- creates collapse to one row via UPSERT (onConflict: user_id,client_dedup_key).

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS client_dedup_key TEXT;

-- Plain (non-partial) unique index so it can serve as an ON CONFLICT target in
-- supabase-js .upsert({ onConflict: 'user_id,client_dedup_key' }). Postgres
-- treats NULLs as DISTINCT by default, so existing keyless rows (client_dedup_key
-- IS NULL) never collide with each other — no backfill required.
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_user_dedup
  ON trips(user_id, client_dedup_key);
