create table if not exists public.user_hidden_starter_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  starter_plan_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, starter_plan_id)
);

alter table public.user_hidden_starter_plans enable row level security;

grant select, insert on table public.user_hidden_starter_plans to authenticated;

drop policy if exists "Users can read their own hidden starter plans"
  on public.user_hidden_starter_plans;
create policy "Users can read their own hidden starter plans"
  on public.user_hidden_starter_plans for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can hide their own starter plans"
  on public.user_hidden_starter_plans;
create policy "Users can hide their own starter plans"
  on public.user_hidden_starter_plans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
