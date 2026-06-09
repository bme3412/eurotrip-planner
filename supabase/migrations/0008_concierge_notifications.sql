-- Migration: Concierge notification system (Phase 1 — in-app)
-- Prerequisites: 0001_paris_mvp.sql (trips), 0006_enable_rls_core_trip_tables.sql (RLS pattern)
--
-- Two tables for the real concierge notification loop:
--   concierge_preferences  — per-user opt-in, channels, quiet hours, timezone
--   concierge_notifications — the in-app inbox + delivery/dedup log
--
-- Ownership + RLS mirror the trips pattern (user_id = auth.uid() OR user_email =
-- auth.email()). All WRITES from the app go through the service-role client
-- (src/lib/supabase/server.js → getSupabaseAdmin), which BYPASSES RLS; these
-- policies grant correct per-user access for direct anon-key reads (the live bell
-- reads the inbox with the user's session) and close public access.

-- ── Preferences ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.concierge_preferences (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email       TEXT,
  enabled          BOOLEAN NOT NULL DEFAULT false,
  in_app_enabled   BOOLEAN NOT NULL DEFAULT true,
  push_enabled     BOOLEAN NOT NULL DEFAULT false,   -- Phase 3
  email_enabled    BOOLEAN NOT NULL DEFAULT false,   -- Phase 4
  quiet_start      TIME NOT NULL DEFAULT '21:30',     -- no sends after this local time…
  quiet_end        TIME NOT NULL DEFAULT '07:30',     -- …until this local time
  timezone         TEXT,                              -- IANA; null → derived from trip
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.concierge_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own concierge preferences" ON public.concierge_preferences;
CREATE POLICY "Users manage their own concierge preferences"
  ON public.concierge_preferences FOR ALL
  USING (user_id = auth.uid() OR user_email = auth.email())
  WITH CHECK (user_id = auth.uid() OR user_email = auth.email());

-- ── Notifications (inbox + log) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.concierge_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email   TEXT,
  trip_id      UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number   INTEGER,
  type         TEXT NOT NULL DEFAULT 'evening_brief'
                 CHECK (type IN ('evening_brief', 'morning_wakeup', 'wind_down', 'reactive')),
  title        TEXT,
  body         TEXT,
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,    -- full brief payload for the inbox detail
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One notification per (user, trip, day, type) — idempotent re-sends.
  UNIQUE (user_id, trip_id, day_number, type)
);

CREATE INDEX IF NOT EXISTS idx_concierge_notif_user_created
  ON public.concierge_notifications (user_id, created_at DESC);

ALTER TABLE public.concierge_notifications ENABLE ROW LEVEL SECURITY;

-- Read + update (mark-as-read) own rows. Inserts are server-side (service role).
DROP POLICY IF EXISTS "Users read their own concierge notifications" ON public.concierge_notifications;
CREATE POLICY "Users read their own concierge notifications"
  ON public.concierge_notifications FOR SELECT
  USING (user_id = auth.uid() OR user_email = auth.email());

DROP POLICY IF EXISTS "Users update their own concierge notifications" ON public.concierge_notifications;
CREATE POLICY "Users update their own concierge notifications"
  ON public.concierge_notifications FOR UPDATE
  USING (user_id = auth.uid() OR user_email = auth.email())
  WITH CHECK (user_id = auth.uid() OR user_email = auth.email());

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Lets the in-app bell receive INSERTs live. Guarded so re-running is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'concierge_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_notifications;
  END IF;
END $$;
