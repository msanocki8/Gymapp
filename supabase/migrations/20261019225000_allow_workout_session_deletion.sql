grant delete on table public.workout_sessions to authenticated;

drop policy if exists "Users can delete their own workout sessions"
  on public.workout_sessions;
create policy "Users can delete their own workout sessions"
  on public.workout_sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);
