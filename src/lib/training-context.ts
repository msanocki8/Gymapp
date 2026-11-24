import { exerciseMuscleMappings } from './muscle-volume.ts';

export type TrainingSessionForContext = {
  completed_at: string;
  duration: number;
  exercise_performance: unknown;
};

type SetResult = {
  weight: number;
  reps: number;
  completed: boolean;
};

type ExerciseSessionResult = {
  date: string;
  timestamp: number;
  bestWeight: number;
  bestReps: number;
  estimated1Rm: number;
  completedSets: number;
  volume: number;
};

type ExerciseSummary = {
  name: string;
  exerciseId?: string;
  muscles: string[];
  currentBest1Rm: number;
  previousBest1Rm: number;
  currentVolume: number;
  previousVolume: number;
  recentSessions: ExerciseSessionResult[];
  trend: 'progres' | 'stagnacja' | 'regres' | 'za mało danych';
};

type MuscleSummary = {
  name: string;
  currentVolume: number;
  previousVolume: number;
  trend: 'progres' | 'stagnacja' | 'regres' | 'za mało danych';
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().replace(',', '.').match(/(\d+(?:[.,]\d+)?)/);
  return match ? Number(match[1]) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(timestamp);
}

function getMuscles(exerciseId: string | undefined, _name: string): string[] {
  if (!exerciseId) return [];
  const labels: Record<string, string> = {
    chest: 'Klatka piersiowa',
    upperChest: 'Górna klatka',
    lats: 'Najszersze',
    upperBack: 'Górna część pleców',
    traps: 'Czworoboczne',
    lowerBack: 'Dolny odcinek pleców',
    frontDelts: 'Przednie barki',
    lateralDelts: 'Środkowe barki',
    rearDelts: 'Tylnie barki',
    biceps: 'Biceps',
    triceps: 'Triceps',
    forearms: 'Przedramiona',
    quads: 'Czworogłowe',
    hamstrings: 'Dwugłowe uda',
    glutes: 'Pośladki',
    adductors: 'Przywodziciele',
    calves: 'Łydki',
    abs: 'Brzuch',
    obliques: 'Skośne brzucha',
  };
  return (exerciseMuscleMappings[exerciseId] ?? [])
    .map((assignment) => labels[assignment.muscleId])
    .filter((label): label is string => Boolean(label));
}

function getTrend(current: number, previous: number): ExerciseSummary['trend'] {
  if (!current || !previous) return 'za mało danych';
  const change = (current - previous) / previous;
  if (change > 0.02) return 'progres';
  if (change < -0.02) return 'regres';
  return 'stagnacja';
}

export function buildTrainingContext(
  sessions: TrainingSessionForContext[],
  now = Date.now(),
): string {
  const cutoff90 = now - 90 * DAY_MS;
  const cutoff30 = now - 30 * DAY_MS;
  const cutoffPrevious30 = now - 60 * DAY_MS;
  const cutoff7 = now - 7 * DAY_MS;

  const validSessions = sessions
    .map((session) => ({
      ...session,
      timestamp: Date.parse(session.completed_at),
    }))
    .filter((session) => Number.isFinite(session.timestamp) && session.timestamp >= cutoff90)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (validSessions.length === 0) {
    return 'BRAK HISTORII TRENINGOWEJ: użytkownik nie ma zapisanych treningów z ostatnich 90 dni.';
  }

  const last7 = validSessions.filter((session) => session.timestamp >= cutoff7);
  const last30 = validSessions.filter((session) => session.timestamp >= cutoff30);
  const gaps = validSessions
    .slice(0, -1)
    .map((session, index) => {
      const next = validSessions[index + 1];
      return Math.round((session.timestamp - next.timestamp) / DAY_MS);
    })
    .filter((gap) => gap >= 0);
  const averageGap = gaps.length
    ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    : null;

  const exerciseMap = new Map<string, {
    name: string;
    exerciseId?: string;
    sessions: ExerciseSessionResult[];
  }>();

  for (const session of validSessions) {
    if (!Array.isArray(session.exercise_performance)) continue;
    for (const rawExercise of session.exercise_performance) {
      if (!isRecord(rawExercise) || typeof rawExercise.name !== 'string') continue;
      const exerciseId = typeof rawExercise.exerciseId === 'string' ? rawExercise.exerciseId : undefined;
      const key = exerciseId ?? rawExercise.name;
      const sets = Array.isArray(rawExercise.sets) ? rawExercise.sets : [];
      const setResults: SetResult[] = [];

      for (const rawSet of sets) {
        if (!isRecord(rawSet)) continue;
        const weight = parseNumber(rawSet.weight);
        const reps = parseNumber(rawSet.reps);
        if (weight === null || reps === null) continue;
        setResults.push({
          weight,
          reps,
          completed: true,
        });
      }

      if (setResults.length === 0) continue;
      const bestSet = setResults.reduce((best, set) =>
        set.weight * (1 + set.reps / 30) > best.weight * (1 + best.reps / 30) ? set : best);
      const estimated1Rm = bestSet.weight * (1 + bestSet.reps / 30);
      const completedSets = setResults.filter((set) => set.completed).length;
      const volume = setResults.reduce((sum, set) => sum + set.weight * set.reps, 0);
      const result: ExerciseSessionResult = {
        date: formatDate(session.timestamp),
        timestamp: session.timestamp,
        bestWeight: bestSet.weight,
        bestReps: bestSet.reps,
        estimated1Rm: Math.round(estimated1Rm * 10) / 10,
        completedSets,
        volume: Math.round(volume),
      };

      const current = exerciseMap.get(key);
      if (current) current.sessions.push(result);
      else exerciseMap.set(key, { name: rawExercise.name, exerciseId, sessions: [result] });
    }
  }

  const summaries: ExerciseSummary[] = [];
  for (const exercise of exerciseMap.values()) {
    const currentSessions = exercise.sessions.filter((item) => item.timestamp >= cutoff30);
    const previousSessions = exercise.sessions.filter((item) =>
      item.timestamp >= cutoffPrevious30 && item.timestamp < cutoff30);
    const currentBest1Rm = currentSessions.length
      ? Math.max(...currentSessions.map((item) => item.estimated1Rm))
      : 0;
    const previousBest1Rm = previousSessions.length
      ? Math.max(...previousSessions.map((item) => item.estimated1Rm))
      : 0;
    const currentVolume = currentSessions.reduce((sum, item) => sum + item.volume, 0);
    const previousVolume = previousSessions.reduce((sum, item) => sum + item.volume, 0);
    summaries.push({
      name: exercise.name,
      exerciseId: exercise.exerciseId,
      muscles: getMuscles(exercise.exerciseId, exercise.name),
      currentBest1Rm,
      previousBest1Rm,
      currentVolume,
      previousVolume,
      recentSessions: exercise.sessions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 4),
      trend: getTrend(
        currentBest1Rm > 0 ? currentBest1Rm : currentVolume,
        previousBest1Rm > 0 ? previousBest1Rm : previousVolume,
      ),
    });
  }

  summaries.sort((a, b) => b.recentSessions.length - a.recentSessions.length);

  const muscleMap = new Map<string, { currentVolume: number; previousVolume: number }>();
  for (const exercise of exerciseMap.values()) {
    const muscles = getMuscles(exercise.exerciseId, exercise.name);
    for (const muscle of muscles) {
      const totals = muscleMap.get(muscle) ?? { currentVolume: 0, previousVolume: 0 };
      for (const item of exercise.sessions) {
        if (item.timestamp >= cutoff30) totals.currentVolume += item.volume;
        else if (item.timestamp >= cutoffPrevious30) totals.previousVolume += item.volume;
      }
      muscleMap.set(muscle, totals);
    }
  }
  const muscleSummaries: MuscleSummary[] = [...muscleMap.entries()]
    .map(([name, totals]) => ({
      name,
      currentVolume: Math.round(totals.currentVolume),
      previousVolume: Math.round(totals.previousVolume),
      trend: getTrend(totals.currentVolume, totals.previousVolume),
    }))
    .sort((a, b) => b.currentVolume - a.currentVolume);

  const lines = [
    'PODSUMOWANIE HISTORII TRENINGOWEJ UŻYTKOWNIKA (ostatnie 90 dni):',
    `Częstotliwość: ${last7.length} treningów w ostatnich 7 dniach; ${last30.length} treningów w ostatnich 30 dniach; średnio ${(last30.length / 30 * 7).toFixed(1)} treningów/tydzień.`,
    `Ostatnie sesje: ${validSessions.slice(0, 5).map((session) =>
      `${formatDate(session.timestamp)} (${session.duration} min)`).join(', ') || 'brak'}.`,
    averageGap === null
      ? 'Średnia przerwa między sesjami: za mało danych.'
      : `Średnia przerwa między sesjami: ${averageGap.toFixed(1)} dni.`,
  ];

  if (summaries.length === 0) {
    lines.push('Ćwiczenia z wynikami: brak zapisanych ciężarów i powtórzeń w ostatnich 90 dniach.');
  } else {
    lines.push('Ćwiczenia:');
    for (const summary of summaries) {
      const recent = summary.recentSessions
        .map((item) => `${item.date}: ${item.bestWeight} kg × ${item.bestReps} powt. (1RM ~${item.estimated1Rm} kg, objętość ${item.volume} kg)`)
        .join('; ');
      const periodComparison = summary.previousBest1Rm
        ? `ostatni miesiąc 1RM=${summary.currentBest1Rm || 0} kg, poprzedni miesiąc 1RM=${summary.previousBest1Rm} kg`
        : 'brak danych z poprzedniego miesiąca do porównania';
      lines.push(`- ${summary.name}${summary.muscles.length ? ` [partie: ${summary.muscles.join(', ')}]` : ''}: trend=${summary.trend}; ${periodComparison}; objętość ostatni miesiąc=${summary.currentVolume} kg, poprzedni miesiąc=${summary.previousVolume} kg; ostatnie sesje: ${recent}.`);
    }
  }

  if (muscleSummaries.length > 0) {
    lines.push('Partie mięśniowe (objętość z ćwiczeń z ostatnich 60 dni):');
    for (const muscle of muscleSummaries) {
      lines.push(`- ${muscle.name}: trend=${muscle.trend}; ostatni miesiąc ${muscle.currentVolume} kg objętości, poprzedni miesiąc ${muscle.previousVolume} kg.`);
    }
  }

  return lines.join('\n');
}
