import type { Json } from '@/lib/database.types';
import type { WorkoutExerciseConfig } from '@/hooks/use-gym-app';

type SharedWorkoutPlanRow = {
  name: string;
  focus: string;
  duration: number;
  exercises: string[];
  exercise_configs: Json;
};

export type SharedWorkoutPlan = {
  name: string;
  focus: string;
  duration: number;
  exercises: string[];
  exerciseConfigs?: WorkoutExerciseConfig[];
};

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseExerciseConfigs(value: Json): WorkoutExerciseConfig[] | null {
  if (!Array.isArray(value)) return null;
  const configs: WorkoutExerciseConfig[] = [];

  for (const item of value) {
    if (!isJsonObject(item) || typeof item.name !== 'string' || !Array.isArray(item.sets)) return null;
    const sets: WorkoutExerciseConfig['sets'] = [];
    for (const set of item.sets) {
      if (!isJsonObject(set) || typeof set.weight !== 'string' || typeof set.reps !== 'string') return null;
      sets.push({ weight: set.weight, reps: set.reps });
    }
    if (item.exerciseId !== undefined && item.exerciseId !== null && typeof item.exerciseId !== 'string') return null;
    configs.push({
      name: item.name,
      ...(typeof item.exerciseId === 'string' ? { exerciseId: item.exerciseId } : {}),
      sets,
    });
  }

  return configs;
}

export function parseSharedWorkoutPlan(row: SharedWorkoutPlanRow | null | undefined): SharedWorkoutPlan | null {
  if (
    !row
    || typeof row.name !== 'string'
    || typeof row.focus !== 'string'
    || typeof row.duration !== 'number'
    || !Number.isFinite(row.duration)
    || row.duration <= 0
    || !Array.isArray(row.exercises)
    || !row.exercises.every((exercise) => typeof exercise === 'string')
  ) {
    return null;
  }

  const exerciseConfigs = parseExerciseConfigs(row.exercise_configs);
  if (!exerciseConfigs) return null;

  return {
    name: row.name,
    focus: row.focus,
    duration: row.duration,
    exercises: row.exercises,
    ...(exerciseConfigs.length ? { exerciseConfigs } : {}),
  };
}
