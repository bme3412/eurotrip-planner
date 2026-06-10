-- Migration: Travel-agent early-access waitlist
-- Prerequisite: none (standalone table)
--
-- Captures "Get early access" signups from the home teaser and the per-trip
-- travel-agent preview page (src/components/home/ConciergeWaitlist.jsx).
-- Writes come only from the API route via the service role — anonymous
-- visitors can sign up, so there are no client RLS policies at all: RLS is
-- enabled with no policies, which locks the table to service-role access.

CREATE TABLE IF NOT EXISTS public.concierge_waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,        -- normalized lowercase; identity of a signup
  wants_push  BOOLEAN NOT NULL DEFAULT TRUE,
  wants_email BOOLEAN NOT NULL DEFAULT TRUE,
  source      TEXT,                        -- 'home' | 'concierge-preview'
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- when signed in at signup
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concierge_waitlist_created ON public.concierge_waitlist (created_at DESC);

ALTER TABLE public.concierge_waitlist ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: service-role only.
