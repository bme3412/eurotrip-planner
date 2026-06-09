-- Migration: Web Push subscriptions (concierge v2b)
-- Prerequisite: 0008_concierge_notifications.sql
--
-- Stores a user's Web Push endpoints (one per browser/device). The send pipeline
-- (src/lib/concierge/webpush.js, via getSupabaseAdmin) reads these to deliver push
-- notifications; dead endpoints (404/410) are pruned on send. RLS mirrors the
-- per-user ownership pattern so the client can manage its own subscriptions.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT,
  endpoint    TEXT NOT NULL UNIQUE,        -- the push service URL (identity of a sub)
  p256dh      TEXT NOT NULL,               -- client public key (encryption)
  auth        TEXT NOT NULL,               -- client auth secret
  platform    TEXT,                        -- 'web' | ua hint, optional
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid() OR user_email = auth.email())
  WITH CHECK (user_id = auth.uid() OR user_email = auth.email());
