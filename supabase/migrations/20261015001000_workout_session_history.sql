create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  focus text not null default '' check (char_length(focus) <= 120),
  duration integer not null check (duration > 0),
  completed_exercises integer not null check (completed_exercises >= 0),
  total_exercises integer not null check (total_exercises >= completed_exercises),
  completed_at timestamptz not null default now(),
  notes text,
  exercise_performance jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_completed_at_idx
  on public.workout_sessions (user_id, completed_at desc);

alter table public.workout_sessions enable row level security;

grant select, insert on table public.workout_sessions to authenticated;

drop policy if exists "Users can read their own workout sessions"
  on public.workout_sessions;
create policy "Users can read their own workout sessions"
  on public.workout_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own workout sessions"
  on public.workout_sessions;
create policy "Users can create their own workout sessions"
  on public.workout_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
