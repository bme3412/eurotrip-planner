-- Supabase Schema for Saved Trips & Experiences
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- ============================================
-- TABLE: saved_trips (for saving cities)
-- ============================================
CREATE TABLE IF NOT EXISTS saved_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_name TEXT NOT NULL,
  display_name TEXT,
  country TEXT,
  image TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only save a city once
  UNIQUE(user_id, city_name)
);

CREATE INDEX IF NOT EXISTS idx_saved_trips_user_id ON saved_trips(user_id);

ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved trips" ON saved_trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved trips" ON saved_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved trips" ON saved_trips
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own saved trips" ON saved_trips
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================
-- TABLE: saved_experiences (for saving attractions/experiences)
-- ============================================
CREATE TABLE IF NOT EXISTS saved_experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_name TEXT NOT NULL,
  experience_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  image TEXT,
  location TEXT,
  duration TEXT,
  price_level TEXT,
  rating NUMERIC,
  tags TEXT[],
  experience_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only save an experience once per city
  UNIQUE(user_id, city_name, experience_name)
);

CREATE INDEX IF NOT EXISTS idx_saved_experiences_user_id ON saved_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_experiences_city ON saved_experiences(city_name);

ALTER TABLE saved_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved experiences" ON saved_experiences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved experiences" ON saved_experiences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved experiences" ON saved_experiences
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own saved experiences" ON saved_experiences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

