type CompletedSession = { completedAt: number };

export type WorkoutStreak = {
  current: number;
  best: number;
};

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function collectTrainedDays(sessions: readonly CompletedSession[]) {
  const days = new Set<string>();
  for (const session of sessions) {
    if (Number.isFinite(session.completedAt)) days.add(toDayKey(new Date(session.completedAt)));
  }
  return days;
}

// A streak stays alive until the end of today, so a missing workout today does not reset it yet.
export function getWorkoutStreak(
  sessions: readonly CompletedSession[],
  now = new Date(),
): WorkoutStreak {
  const trainedDays = collectTrainedDays(sessions);
  if (trainedDays.size === 0) return { current: 0, best: 0 };

  const today = startOfDay(now);
  let cursor = trainedDays.has(toDayKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (trainedDays.has(toDayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sortedDays = [...new Set(sessions
    .filter((session) => Number.isFinite(session.completedAt))
    .map((session) => startOfDay(new Date(session.completedAt)).getTime()))]
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const time of sortedDays) {
    const day = new Date(time);
    run = previous && toDayKey(addDays(previous, 1)) === toDayKey(day) ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  return { current, best: Math.max(best, current) };
}

export function sumMinutesThisWeek(
  sessions: readonly (CompletedSession & { duration: number })[],
  now = new Date(),
) {
  const monday = addDays(startOfDay(now), -((now.getDay() + 6) % 7));
  const nextMonday = addDays(monday, 7);
  return sessions.reduce((total, session) =>
    session.completedAt >= monday.getTime() && session.completedAt < nextMonday.getTime()
      ? total + Math.max(0, session.duration)
      : total, 0);
}
