alter table public.workout_plans
  add column if not exists share_token uuid;

update public.workout_plans
set share_token = gen_random_uuid()
where share_token is null;

alter table public.workout_plans
  alter column share_token set default gen_random_uuid(),
  alter column share_token set not null;

create unique index if not exists workout_plans_share_token_unique
  on public.workout_plans (share_token);

create or replace function public.get_shared_workout_plan(p_token uuid)
returns table (
  name text,
  focus text,
  duration integer,
  exercises text[],
  exercise_configs jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    plan.name,
    plan.focus,
    plan.duration,
    plan.exercises,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', exercise.value ->> 'name',
            'exerciseId', exercise.value ->> 'exerciseId',
            'sets', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'weight', plan_set.value ->> 'weight',
                    'reps', plan_set.value ->> 'reps'
                  )
                  order by plan_set.ordinality
                )
                from jsonb_array_elements(
                  case
                    when jsonb_typeof(exercise.value -> 'sets') = 'array'
                      then exercise.value -> 'sets'
                    else '[]'::jsonb
                  end
                ) with ordinality as plan_set(value, ordinality)
              ),
              '[]'::jsonb
            )
          )
          order by exercise.ordinality
        )
        from jsonb_array_elements(
          case
            when jsonb_typeof(plan.exercise_configs) = 'array'
              then plan.exercise_configs
            else '[]'::jsonb
          end
        ) with ordinality as exercise(value, ordinality)
      ),
      '[]'::jsonb
    )
  from public.workout_plans as plan
  where plan.share_token = p_token
  limit 1;
$$;

revoke all on function public.get_shared_workout_plan(uuid) from public;
grant execute on function public.get_shared_workout_plan(uuid) to anon, authenticated;
