create extension if not exists pgcrypto with schema public;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Paris MVP core tables
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  city text not null,
  start_date date not null,
  end_date date not null,
  interests jsonb not null default '[]'::jsonb,
  pace int not null,
  budget text not null,
  hotel_location text,
  prebookings jsonb not null default '{}'::jsonb,
  initial_plan jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_progress (
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  planned_activities jsonb not null default '[]'::jsonb,
  completed_activities jsonb not null default '[]'::jsonb,
  skipped_activities jsonb not null default '[]'::jsonb,
  user_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, date)
);

create trigger update_trip_progress_updated_at
before update on public.trip_progress
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.preferences_learned (
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null,
  interest_level int not null check (interest_level between 1 and 5),
  learned_at timestamptz not null default now(),
  primary key (trip_id, category, learned_at)
);
