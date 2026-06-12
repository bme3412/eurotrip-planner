-- Durable cache of LLM concierge prose, one row per (trip, day).
-- The deterministic facts (schedule, depart-by, hotel, weather) are recomputed
-- on every request; only Olivier's written voice is stored, keyed by a content
-- hash of the prompt inputs so real itinerary edits — and nothing else —
-- invalidate it.
--
-- Service-role read/write ONLY: access control happens in the API route
-- (requireTripReadAccess), which also covers anonymous/public-share trips
-- that could never satisfy a user-scoped RLS policy.
CREATE TABLE IF NOT EXISTS public.concierge_day_briefs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number    INTEGER NOT NULL,
  content_hash  TEXT NOT NULL,
  prose         JSONB NOT NULL,   -- { routeNote, pushLine, signoff, sampleAsk, briefs, reactive }
  model         TEXT,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, day_number)
);

ALTER TABLE public.concierge_day_briefs ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: anon/authenticated clients get nothing; the
-- service-role client bypasses RLS.
