-- Migration: Agent thread (T1 of AGENT_APP_PLAN.md)
-- Prerequisites: 0008_concierge_notifications.sql (RLS + Realtime patterns)
--
-- Three tables for the two-way agent:
--   concierge_threads   — one conversation per (trip, user); summary for windowing
--   concierge_messages  — the canonical message log. Scheduled beats POST INTO
--                         this thread (notifications/push/email become receipts);
--                         user replies and agent answers live here too.
--   concierge_memories  — durable free-text facts ("hates crowds", "traveling
--                         with a toddler") written by the agent's `remember`
--                         tool; injected into every generation as a digest.
--
-- Ownership + RLS mirror concierge_notifications: reads with the user's session
-- (the thread UI + Realtime), writes via the service role only.

-- ── Threads ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.concierge_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT,
  summary     TEXT,                       -- rolling synopsis for history windowing
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

ALTER TABLE public.concierge_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own concierge threads" ON public.concierge_threads;
CREATE POLICY "Users read their own concierge threads"
  ON public.concierge_threads FOR SELECT
  USING (user_id = auth.uid() OR user_email = auth.email());

-- ── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.concierge_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.concierge_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT,
  role        TEXT NOT NULL CHECK (role IN ('user', 'olivier', 'system')),
  kind        TEXT NOT NULL DEFAULT 'chat'
                CHECK (kind IN ('chat', 'evening_brief', 'morning_wakeup', 'wind_down', 'reactive', 'action', 'system')),
  day_number  INTEGER,                              -- which trip day a beat refers to
  body        TEXT NOT NULL,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- beat payloads, tool receipts
  channel     TEXT NOT NULL DEFAULT 'app'
                CHECK (channel IN ('app', 'push', 'email', 'telegram', 'whatsapp')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concierge_messages_thread_created
  ON public.concierge_messages (thread_id, created_at);

-- Beats are idempotent per (thread, day, kind) — re-sends refresh in place.
-- Partial unique index (chat/action messages repeat freely); dedup is handled
-- in code (update-then-insert) because PostgREST upserts can't target partial
-- indexes — this index is the backstop against races.
CREATE UNIQUE INDEX IF NOT EXISTS idx_concierge_messages_beat_dedup
  ON public.concierge_messages (thread_id, day_number, kind)
  WHERE kind IN ('evening_brief', 'morning_wakeup', 'wind_down', 'reactive');

ALTER TABLE public.concierge_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own concierge messages" ON public.concierge_messages;
CREATE POLICY "Users read their own concierge messages"
  ON public.concierge_messages FOR SELECT
  USING (user_id = auth.uid() OR user_email = auth.email());

-- ── Memories ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.concierge_memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id     UUID REFERENCES public.trips(id) ON DELETE SET NULL,  -- null → applies to every trip
  fact        TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'inferred')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concierge_memories_user
  ON public.concierge_memories (user_id, created_at DESC);

ALTER TABLE public.concierge_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own concierge memories" ON public.concierge_memories;
CREATE POLICY "Users read their own concierge memories"
  ON public.concierge_memories FOR SELECT
  USING (user_id = auth.uid());

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- The thread UI appends incoming beats/replies live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'concierge_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_messages;
  END IF;
END $$;
