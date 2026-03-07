-- Migration: Add multi-city and multi-country trip support
-- Prerequisite: 0001_paris_mvp.sql and 0002_trip_activities.sql must be applied first

-- ============================================
-- 1. EXTEND TRIPS TABLE
-- ============================================
-- Add multi-city support columns to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS cities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS route_type TEXT DEFAULT 'single'
    CHECK (route_type IN ('single', 'multi-city', 'multi-country')),
  ADD COLUMN IF NOT EXISTS route_template TEXT,
  ADD COLUMN IF NOT EXISTS city_sequence INTEGER[] DEFAULT ARRAY[]::integer[];

COMMENT ON COLUMN trips.cities IS 'Array of city objects for multi-city trips. Structure: [{"id": "paris", "name": "Paris", "country": "France", "days": 4, "arrival_date": "2026-06-01", "departure_date": "2026-06-04"}]';
COMMENT ON COLUMN trips.route_type IS 'Type of trip: single (one city), multi-city (multiple cities in one country), multi-country (cities across countries)';
COMMENT ON COLUMN trips.route_template IS 'Template ID if trip was created from a route template (e.g., "spanish-mediterranean")';
COMMENT ON COLUMN trips.city_sequence IS 'Array of city indexes indicating the optimal route order';

-- ============================================
-- 2. CREATE TRIP_TRANSFERS TABLE
-- ============================================
-- Track transport between cities (travel days)
CREATE TABLE IF NOT EXISTS trip_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  from_country TEXT NOT NULL,
  to_country TEXT NOT NULL,
  travel_date DATE NOT NULL,
  sort_order INTEGER NOT NULL,

  -- Transport options
  transport_type TEXT CHECK (transport_type IN ('train', 'flight', 'bus', 'ferry', 'car')),
  journey_time TEXT,
  price_range TEXT,
  frequency TEXT,
  train_type TEXT,

  -- Booking information
  booking_url TEXT,
  carrier TEXT,
  booked BOOLEAN DEFAULT false,
  booking_confirmation TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(trip_id, sort_order)
);

COMMENT ON TABLE trip_transfers IS 'Stores transport information between cities in multi-city trips';
COMMENT ON COLUMN trip_transfers.sort_order IS 'Position in trip sequence (0-indexed). First transfer = 0, second = 1, etc.';
COMMENT ON COLUMN trip_transfers.journey_time IS 'Human-readable duration (e.g., "2h", "1h30m")';
COMMENT ON COLUMN trip_transfers.price_range IS 'Price range in local currency (e.g., "€25-80", "£50-120")';
COMMENT ON COLUMN trip_transfers.frequency IS 'How often this route runs (e.g., "Hourly", "Daily", "3x daily")';

-- Indexes for trip_transfers
CREATE INDEX IF NOT EXISTS idx_trip_transfers_trip_id ON trip_transfers(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_transfers_date ON trip_transfers(travel_date);
CREATE INDEX IF NOT EXISTS idx_trip_transfers_from_city ON trip_transfers(from_city);
CREATE INDEX IF NOT EXISTS idx_trip_transfers_to_city ON trip_transfers(to_city);

-- Updated_at trigger for trip_transfers
CREATE TRIGGER trip_transfers_updated_at BEFORE UPDATE ON trip_transfers
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- ============================================
-- 3. EXTEND TRIP_DAYS TABLE
-- ============================================
-- Add city association to each day for multi-city support
ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS is_travel_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES trip_transfers(id) ON DELETE SET NULL;

COMMENT ON COLUMN trip_days.city IS 'Which city is this day in? NULL for travel days between cities';
COMMENT ON COLUMN trip_days.country IS 'Which country is this day in?';
COMMENT ON COLUMN trip_days.is_travel_day IS 'True if this day is dedicated to traveling between cities';
COMMENT ON COLUMN trip_days.transfer_id IS 'Links to trip_transfers record for travel days';

-- Index for filtering by city
CREATE INDEX IF NOT EXISTS idx_trip_days_city ON trip_days(city);
CREATE INDEX IF NOT EXISTS idx_trip_days_is_travel_day ON trip_days(is_travel_day);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
-- Enable RLS on trip_transfers
ALTER TABLE trip_transfers ENABLE ROW LEVEL SECURITY;

-- RLS policy for trip_transfers
CREATE POLICY "Users can manage their own trip transfers"
  ON trip_transfers FOR ALL
  USING (trip_id IN (
    SELECT id FROM trips
    WHERE user_id = auth.uid() OR user_email = auth.email()
  ))
  WITH CHECK (trip_id IN (
    SELECT id FROM trips
    WHERE user_id = auth.uid() OR user_email = auth.email()
  ));

-- ============================================
-- 5. BACKWARD COMPATIBILITY
-- ============================================
-- For existing single-city trips, populate route_type as 'single'
UPDATE trips
SET route_type = 'single'
WHERE route_type IS NULL OR route_type = 'single';

-- For existing trips, populate city in trip_days from trips.city
UPDATE trip_days td
SET city = t.city,
    country = t.country
FROM trips t
WHERE td.trip_id = t.id
  AND td.city IS NULL
  AND t.route_type = 'single';
