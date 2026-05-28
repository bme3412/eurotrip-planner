-- Migration: First-class trip lifecycle drafts
-- Prerequisite: 0001_paris_mvp.sql, 0002_trip_activities.sql, 0003_multi_city_support.sql

-- Draft trips may start before exact dates or final itinerary generation.
ALTER TABLE trips
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL,
  ALTER COLUMN pace DROP NOT NULL,
  ALTER COLUMN budget DROP NOT NULL;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS trip_state JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS brief JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS time_range JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS share_token TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS itinerary_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Replace the older status check with the trip lifecycle states.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trips_status_check'
  ) THEN
    ALTER TABLE trips DROP CONSTRAINT trips_status_check;
  END IF;
END $$;

-- Existing rows may still use the old lifecycle value from 0002.
UPDATE trips
SET status = 'planning'
WHERE status = 'confirmed';

ALTER TABLE trips
  ADD CONSTRAINT trips_status_check
  CHECK (status IN ('draft', 'planning', 'itinerary_generated', 'shared', 'active', 'completed', 'archived', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_updated_at ON trips(updated_at);
CREATE INDEX IF NOT EXISTS idx_trips_lifecycle_status ON trips(status);

DROP TRIGGER IF EXISTS trips_updated_at ON trips;
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();
