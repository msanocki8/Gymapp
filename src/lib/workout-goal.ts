export const DEFAULT_WEEKLY_WORKOUT_GOAL = 3;
export const MIN_WEEKLY_WORKOUT_GOAL = 1;
export const MAX_WEEKLY_WORKOUT_GOAL = 7;

export function isValidWeeklyWorkoutGoal(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_WEEKLY_WORKOUT_GOAL
    && value <= MAX_WEEKLY_WORKOUT_GOAL;
}

export function countWorkoutsThisWeek(
  sessions: readonly { completedAt: number }[],
  now = new Date(),
) {
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return sessions.filter((session) =>
    session.completedAt >= startOfWeek.getTime() && session.completedAt < endOfWeek.getTime()).length;
}
