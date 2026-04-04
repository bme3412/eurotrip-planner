-- Migration: City enrichment cache for real-time scoring data
-- Stores weather, events, crowds, pricing data with TTL-based expiration

-- Enrichment cache table
CREATE TABLE IF NOT EXISTS city_enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug TEXT NOT NULL,
  enrichment_type TEXT NOT NULL CHECK (enrichment_type IN ('weather', 'events', 'crowds', 'pricing')),
  date_range_start DATE,
  date_range_end DATE,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_slug, enrichment_type, date_range_start, date_range_end)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_enrichment_city_type ON city_enrichment_cache(city_slug, enrichment_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_expires ON city_enrichment_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_enrichment_date_range ON city_enrichment_cache(date_range_start, date_range_end);

-- User preferences table (for personalization in Phase 3)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  preference_type TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0,
  learned_from TEXT[] DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, preference_type)
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_email ON user_preferences(user_email);

-- Updated_at trigger for user_preferences
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- Cleanup function to remove expired cache entries (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_enrichment_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM city_enrichment_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
