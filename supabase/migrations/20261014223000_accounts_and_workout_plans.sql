create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 3 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_nick_lower_unique
  on public.profiles (lower(nick));

alter table public.profiles enable row level security;

grant select, update on table public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nick)
  values (new.id, new.raw_user_meta_data ->> 'nick');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

create or replace function public.sync_profile_nick_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_nick text := new.raw_user_meta_data ->> 'nick';
begin
  if next_nick is distinct from old.raw_user_meta_data ->> 'nick' then
    update public.profiles
    set nick = next_nick, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_nick_updated on auth.users;
create trigger on_auth_user_nick_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_nick_from_auth_user();

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  focus text not null default 'Trening własny' check (char_length(focus) <= 64),
  source_plan_id text,
  duration integer not null check (duration > 0),
  exercises text[] not null check (cardinality(exercises) > 0),
  exercise_configs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_plans_user_created_at_idx
  on public.workout_plans (user_id, created_at desc);

create unique index if not exists workout_plans_user_source_plan_unique
  on public.workout_plans (user_id, source_plan_id)
  where source_plan_id is not null;

alter table public.workout_plans enable row level security;

grant select, insert, update, delete on table public.workout_plans to authenticated;

create policy "Users can read their own workout plans"
  on public.workout_plans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own workout plans"
  on public.workout_plans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workout plans"
  on public.workout_plans for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own workout plans"
  on public.workout_plans for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_row_updated_at();

drop trigger if exists workout_plans_set_updated_at on public.workout_plans;
create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_row_updated_at();
