-- Migration: Enable Row Level Security on the core trip tables
-- Prerequisite: 0001_paris_mvp.sql
--
-- The Supabase database linter (lint 0013_rls_disabled_in_public) flags
-- public.trips, public.trip_progress, and public.preferences_learned as ERROR:
-- they live in the PostgREST-exposed `public` schema with RLS disabled, so the
-- anonymous/public API role can read and write every row.
--
-- These three tables were created in 0001 before the project adopted RLS. The
-- sibling child tables added later (trip_days, trip_activities in 0002;
-- trip_transfers in 0003) already enable RLS with the same per-user ownership
-- policies used below.
--
-- All application access to these tables goes through the server-side service-role
-- client (src/lib/supabase/server.js → getSupabaseAdmin, used by
-- src/lib/trips/tripsRepository.js and src/app/api/trips/**). The service role
-- BYPASSES RLS, so enabling RLS here does not change app behavior — it only closes
-- direct anon/public access. The policies below additionally grant correct
-- per-user access if these tables are ever queried with the anon key + a user
-- session, mirroring the existing trip_days / trip_activities / trip_transfers
-- policies (ownership by trips.user_id = auth.uid() OR trips.user_email = auth.email()).

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences_learned ENABLE ROW LEVEL SECURITY;

-- trips: a user owns rows matching their auth uid or email.
DROP POLICY IF EXISTS "Users can manage their own trips" ON public.trips;
CREATE POLICY "Users can manage their own trips"
  ON public.trips FOR ALL
  USING (user_id = auth.uid() OR user_email = auth.email())
  WITH CHECK (user_id = auth.uid() OR user_email = auth.email());

-- trip_progress: owned transitively through its parent trip.
DROP POLICY IF EXISTS "Users can manage their own trip progress" ON public.trip_progress;
CREATE POLICY "Users can manage their own trip progress"
  ON public.trip_progress FOR ALL
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE user_id = auth.uid() OR user_email = auth.email()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE user_id = auth.uid() OR user_email = auth.email()
    )
  );

-- preferences_learned: owned transitively through its parent trip.
DROP POLICY IF EXISTS "Users can manage their own learned preferences" ON public.preferences_learned;
CREATE POLICY "Users can manage their own learned preferences"
  ON public.preferences_learned FOR ALL
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE user_id = auth.uid() OR user_email = auth.email()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE user_id = auth.uid() OR user_email = auth.email()
    )
  );
