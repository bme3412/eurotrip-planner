-- Migration: Add day/activity granularity to trips
-- Prerequisite: 0001_paris_mvp.sql must be applied first

-- Add missing columns to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning'
    CHECK (status IN ('planning', 'confirmed', 'active', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS collaborator_emails TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weather_adaptation_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Trip days: one row per day of the trip
CREATE TABLE IF NOT EXISTS trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  theme TEXT,
  notes TEXT,
  weather_forecast JSONB,
  adapted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_id, day_number)
);

-- Trip activities: individual items within a day
CREATE TABLE IF NOT EXISTS trip_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  time_block TEXT NOT NULL CHECK (time_block IN ('morning', 'lunch', 'afternoon', 'evening', 'night')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_time TIME,
  end_time TIME,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  duration_minutes INTEGER,
  price_range TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  neighborhood TEXT,
  address TEXT,
  google_place_id TEXT,
  google_rating DOUBLE PRECISION,
  google_photo_name TEXT,
  indoor BOOLEAN DEFAULT false,
  booking_required BOOLEAN DEFAULT false,
  booking_url TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'skipped', 'completed', 'weather_swapped')),
  original_activity_id UUID REFERENCES trip_activities(id),
  swap_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_day_id ON trip_activities(trip_day_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- Updated_at triggers (reuse the function from 0001)
CREATE TRIGGER trip_days_updated_at BEFORE UPDATE ON trip_days
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();
CREATE TRIGGER trip_activities_updated_at BEFORE UPDATE ON trip_activities
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- RLS policies
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own trip days"
  ON trip_days FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid() OR user_email = auth.email()));

CREATE POLICY "Users can manage their own trip activities"
  ON trip_activities FOR ALL
  USING (trip_day_id IN (
    SELECT td.id FROM trip_days td
    JOIN trips t ON td.trip_id = t.id
    WHERE t.user_id = auth.uid() OR t.user_email = auth.email()
  ));
