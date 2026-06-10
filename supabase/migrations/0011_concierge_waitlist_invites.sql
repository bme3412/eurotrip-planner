-- Migration: Early-access invites on the travel-agent waitlist
-- Prerequisite: 0010_concierge_waitlist.sql
--
-- The closed beta is gated server-side: only waitlist rows with invited_at set
-- (or emails on the CONCIERGE_ALLOWLIST env var) receive scheduled briefs or
-- can use send-now. invited_at is flipped by scripts/concierge-invite.mjs via
-- the service role — there are still no client RLS policies on this table.

ALTER TABLE public.concierge_waitlist
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_concierge_waitlist_invited
  ON public.concierge_waitlist (invited_at)
  WHERE invited_at IS NOT NULL;
