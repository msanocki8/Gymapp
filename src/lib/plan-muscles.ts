import { exerciseLibrary } from '@/constants/exercise-library';
import { exerciseMuscleMappings } from '@/lib/muscle-volume';
import type { MuscleId } from '@/lib/muscle-volume';

type ExerciseLike = { name: string; exerciseId?: string; sets: readonly unknown[] };

export type MuscleBarRow = {
  key: string;
  label: string;
  share: number;
  caption: string;
};

type GroupDefinition = { key: string; label: string; muscles: readonly MuscleId[] };

const PLAN_GROUPS: readonly GroupDefinition[] = [
  { key: 'chest', label: 'Klatka', muscles: ['chest', 'upperChest'] },
  { key: 'back', label: 'Plecy', muscles: ['lats', 'upperBack', 'traps', 'lowerBack'] },
  { key: 'shoulders', label: 'Barki', muscles: ['frontDelts', 'lateralDelts'] },
  { key: 'rearDelts', label: 'Tył barków', muscles: ['rearDelts'] },
  { key: 'biceps', label: 'Biceps', muscles: ['biceps'] },
  { key: 'triceps', label: 'Triceps', muscles: ['triceps'] },
  { key: 'forearms', label: 'Przedramiona', muscles: ['forearms'] },
  { key: 'quads', label: 'Czworogłowe', muscles: ['quads'] },
  { key: 'hamstrings', label: 'Dwugłowe', muscles: ['hamstrings'] },
  { key: 'glutes', label: 'Pośladki', muscles: ['glutes'] },
  { key: 'adductors', label: 'Przywodziciele', muscles: ['adductors'] },
  { key: 'calves', label: 'Łydki', muscles: ['calves'] },
  { key: 'core', label: 'Brzuch', muscles: ['abs', 'obliques'] },
];

export const BODY_AREAS: readonly GroupDefinition[] = [
  { key: 'chest', label: 'Klatka', muscles: ['chest', 'upperChest'] },
  { key: 'back', label: 'Plecy', muscles: ['lats', 'upperBack', 'traps', 'lowerBack'] },
  { key: 'shoulders', label: 'Barki', muscles: ['frontDelts', 'lateralDelts', 'rearDelts'] },
  { key: 'arms', label: 'Ramiona', muscles: ['biceps', 'triceps', 'forearms'] },
  { key: 'legs', label: 'Nogi', muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'] },
  { key: 'core', label: 'Brzuch', muscles: ['abs', 'obliques'] },
];

const DEFAULT_SETS = 3;

function resolveExerciseId(exercise: { name: string; exerciseId?: string }) {
  return exercise.exerciseId ?? exerciseLibrary.find((item) => item.name === exercise.name)?.id;
}

function groupOf(groups: readonly GroupDefinition[], muscleId: MuscleId) {
  return groups.find((group) => group.muscles.includes(muscleId));
}

// Primary muscles count a full set, secondary half — the same weighting the session analysis uses.
export function getPlanMuscleBars(
  plan: { exercises: string[]; exerciseConfigs?: ExerciseLike[] },
  limit = 3,
): MuscleBarRow[] {
  const exercises: ExerciseLike[] = plan.exerciseConfigs?.length
    ? plan.exerciseConfigs
    : plan.exercises.map((name) => ({ name, sets: Array.from({ length: DEFAULT_SETS }) }));
  const totals = new Map<string, { score: number; primary: boolean }>();

  for (const exercise of exercises) {
    const id = resolveExerciseId(exercise);
    const assignments = id ? exerciseMuscleMappings[id] : undefined;
    if (!assignments) continue;
    const sets = exercise.sets.length || DEFAULT_SETS;
    for (const assignment of assignments) {
      const group = groupOf(PLAN_GROUPS, assignment.muscleId);
      if (!group) continue;
      const current = totals.get(group.key) ?? { score: 0, primary: false };
      totals.set(group.key, {
        score: current.score + sets * (assignment.role === 'primary' ? 1 : 0.5),
        primary: current.primary || assignment.role === 'primary',
      });
    }
  }

  const ranked = PLAN_GROUPS
    .map((group) => ({ group, total: totals.get(group.key) }))
    .filter((entry): entry is { group: GroupDefinition; total: { score: number; primary: boolean } } => Boolean(entry.total))
    .sort((a, b) => b.total.score - a.total.score)
    .slice(0, limit);
  const max = ranked[0]?.total.score ?? 0;

  return ranked.map(({ group, total }) => ({
    key: group.key,
    label: group.label,
    share: max > 0 ? total.score / max : 0,
    caption: total.primary ? 'główne' : 'pomoc.',
  }));
}

export function sumSetsByArea(volumes: readonly { muscleId: MuscleId; performedSets: number }[]) {
  return BODY_AREAS.map((area) => ({
    key: area.key,
    label: area.label,
    sets: volumes
      .filter((volume) => area.muscles.includes(volume.muscleId))
      .reduce((total, volume) => total + volume.performedSets, 0),
  }));
}

export function lastTrainedAtByArea(
  sessions: readonly { completedAt: number; exercisePerformance?: readonly { name: string; exerciseId?: string; sets: readonly unknown[] }[] }[],
) {
  const last = new Map<string, number>();
  for (const session of sessions) {
    for (const exercise of session.exercisePerformance ?? []) {
      if (exercise.sets.length === 0) continue;
      const id = resolveExerciseId(exercise);
      for (const assignment of (id ? exerciseMuscleMappings[id] : undefined) ?? []) {
        const area = groupOf(BODY_AREAS, assignment.muscleId);
        if (!area) continue;
        last.set(area.key, Math.max(last.get(area.key) ?? 0, session.completedAt));
      }
    }
  }
  return last;
}
