/**
 * Czyste obliczenia dla ekranu głównego: podsumowanie ostatniego treningu i rekordy.
 * Bez importów z React Native – testowane w tests/workout-records.test.mjs.
 */

export type RecordSet = { weight: string; reps: string };
export type RecordExercise = { name: string; exerciseId?: string; sets: RecordSet[] };
export type RecordSession = {
  id: string;
  name: string;
  duration: number;
  completedExercises: number;
  completedAt: number;
  exercisePerformance?: RecordExercise[];
};

export type LastWorkoutSummary = {
  sessionId: string;
  name: string;
  completedAt: number;
  duration: number;
  sets: number;
  exercises: number;
  volumeKg: number;
  /** Zmiana objętości względem poprzedniego treningu o tej samej nazwie, w %; null gdy brak porównania. */
  volumeChangePercent: number | null;
};

export type PersonalRecord = {
  key: string;
  name: string;
  weightKg: number;
  reps: number;
  achievedAt: number;
  /** Rekord ustanowiony na ostatnim treningu. */
  isNew: boolean;
};

/** „82,5” / „82.5 kg” / „+10” → liczba; puste lub „—” → 0. */
export function parseAmount(value: string | undefined | null): number {
  if (!value) return 0;
  const match = String(value).replace(',', '.').match(/[+-]?\d+(\.\d+)?/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function exerciseKey(exercise: RecordExercise) {
  return exercise.exerciseId ?? exercise.name.trim().toLocaleLowerCase('pl-PL');
}

function sessionVolume(session: RecordSession) {
  let volume = 0;
  for (const exercise of session.exercisePerformance ?? []) {
    for (const set of exercise.sets) volume += parseAmount(set.weight) * parseAmount(set.reps);
  }
  return volume;
}

function sameName(a: string, b: string) {
  return a.trim().toLocaleLowerCase('pl-PL') === b.trim().toLocaleLowerCase('pl-PL');
}

export function getLastWorkoutSummary(sessions: readonly RecordSession[]): LastWorkoutSummary | null {
  if (sessions.length === 0) return null;
  const ordered = [...sessions].sort((a, b) => b.completedAt - a.completedAt);
  const last = ordered[0];
  const performance = last.exercisePerformance ?? [];
  const sets = performance.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const volumeKg = Math.round(sessionVolume(last));
  const previous = ordered.slice(1).find((session) => sameName(session.name, last.name));
  const previousVolume = previous ? sessionVolume(previous) : 0;
  const volumeChangePercent = previous && previousVolume > 0 && volumeKg > 0
    ? Math.round(((volumeKg - previousVolume) / previousVolume) * 100)
    : null;

  return {
    sessionId: last.id,
    name: last.name,
    completedAt: last.completedAt,
    duration: last.duration,
    sets,
    exercises: performance.length > 0 ? performance.length : last.completedExercises,
    volumeKg,
    volumeChangePercent,
  };
}

/**
 * Najlepsza seria każdego ćwiczenia (najpierw ciężar, przy remisie powtórzenia).
 * Kolejność: najświeższe rekordy pierwsze.
 */
export function getPersonalRecords(sessions: readonly RecordSession[], limit = 3): PersonalRecord[] {
  const ordered = [...sessions].sort((a, b) => a.completedAt - b.completedAt);
  const lastAt = ordered.length > 0 ? ordered[ordered.length - 1].completedAt : 0;
  const best = new Map<string, PersonalRecord>();

  for (const session of ordered) {
    for (const exercise of session.exercisePerformance ?? []) {
      const key = exerciseKey(exercise);
      for (const set of exercise.sets) {
        const weightKg = parseAmount(set.weight);
        const reps = Math.round(parseAmount(set.reps));
        if (reps <= 0) continue;
        const current = best.get(key);
        const better = !current
          || weightKg > current.weightKg
          || (weightKg === current.weightKg && reps > current.reps);
        if (better) {
          best.set(key, { key, name: exercise.name, weightKg, reps, achievedAt: session.completedAt, isNew: false });
        }
      }
    }
  }

  return [...best.values()]
    .map((record) => ({ ...record, isNew: record.achievedAt === lastAt }))
    .sort((a, b) => b.achievedAt - a.achievedAt || b.weightKg - a.weightKg)
    .slice(0, limit);
}

const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

/** „dziś”, „wczoraj”, nazwa dnia (do 6 dni), „tydzień temu”, „3 tyg. temu”, potem data. */
export function formatWhen(timestamp: number, now = Date.now()): string {
  const day = new Date(timestamp);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (days <= 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 7) return WEEKDAYS[day.getDay()];
  if (days < 14) return 'tydzień temu';
  if (days < 35) return `${Math.floor(days / 7)} tyg. temu`;
  return `${day.getDate()}.${String(day.getMonth() + 1).padStart(2, '0')}`;
}

/** 82.5 → „82,5”; 4820 → „4 820” (twarda spacja). */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const [whole, fraction] = String(rounded).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped},${fraction}` : grouped;
}

export function formatRecordValue(record: Pick<PersonalRecord, 'weightKg' | 'reps'>): string {
  return record.weightKg > 0 ? `${formatNumber(record.weightKg)} kg × ${record.reps}` : `× ${record.reps}`;
}
