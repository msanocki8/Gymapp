import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { requireSupabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

export type WorkoutPlan = {
  id: string;
  name: string;
  focus: string;
  duration: number;
  exercises: string[];
  exerciseConfigs?: WorkoutExerciseConfig[];
  source: 'starter' | 'created' | 'imported';
  sourcePlanId?: string;
};

export type WorkoutExerciseConfig = {
  name: string;
  exerciseId?: string;
  sets: { weight: string; reps: string; previous?: string }[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  focus: string;
  date: string;
  duration: number;
  completedExercises: number;
  totalExercises: number;
  completedAt: number;
  notes?: string;
  exercisePerformance?: WorkoutExerciseConfig[];
};

type WorkoutSessionRow = {
  id: string;
  name: string;
  focus: string;
  duration: number;
  completed_exercises: number;
  total_exercises: number;
  completed_at: string;
  notes: string | null;
  exercise_performance: Json | null;
};

const starterPlans: WorkoutPlan[] = [
  {
    id: 'push-day',
    name: 'Góra ciała A',
    focus: 'Klatka · barki · triceps',
    duration: 55,
    exercises: ['Wyciskanie sztangi', 'Wyciskanie hantli skos', 'Wyciskanie nad głowę', 'Unoszenie bokiem', 'Prostowanie ramion'],
    source: 'starter',
  },
  {
    id: 'pull-day',
    name: 'Góra ciała B',
    focus: 'Plecy · biceps',
    duration: 50,
    exercises: ['Podciąganie', 'Wiosłowanie sztangą', 'Ściąganie drążka', 'Face pull', 'Uginanie ramion'],
    source: 'starter',
  },
  {
    id: 'legs-day',
    name: 'Dół ciała',
    focus: 'Nogi · pośladki',
    duration: 60,
    exercises: ['Przysiad ze sztangą', 'Martwy ciąg rumuński', 'Wypychanie na suwnicy', 'Uginanie nóg', 'Wspięcia na palce'],
    source: 'starter',
  },
];

type PlanRow = {
  id: string;
  source_plan_id: string | null;
  name: string;
  focus: string;
  duration: number;
  exercises: string[];
  exercise_configs: Json | null;
};

type GymAppContextValue = {
  userName: string;
  setUserName: (name: string) => Promise<void>;
  plans: WorkoutPlan[];
  plansLoading: boolean;
  plansError: string | null;
  reloadPlans: () => Promise<void>;
  addPlan: (plan: Omit<WorkoutPlan, 'id'>) => Promise<void>;
  updatePlan: (id: string, plan: Omit<WorkoutPlan, 'id'>) => Promise<void>;
  sessions: WorkoutSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  reloadSessions: () => Promise<void>;
  recordSession: (
    plan: WorkoutPlan,
    completedExercises: number,
    duration: number,
    exercisePerformance?: WorkoutExerciseConfig[],
    notes?: string,
  ) => Promise<void>;
};

const GymAppContext = createContext<GymAppContextValue | null>(null);
const sessionSelect = 'id, name, focus, duration, completed_exercises, total_exercises, completed_at, notes, exercise_performance';

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseExerciseConfigs(value: Json | null): WorkoutExerciseConfig[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const configs: WorkoutExerciseConfig[] = [];

  for (const item of value) {
    if (!isJsonObject(item) || typeof item.name !== 'string' || !Array.isArray(item.sets)) return undefined;
    const sets: WorkoutExerciseConfig['sets'] = [];
    for (const set of item.sets) {
      if (!isJsonObject(set) || typeof set.weight !== 'string' || typeof set.reps !== 'string') return undefined;
      if (set.previous !== undefined && typeof set.previous !== 'string') return undefined;
      sets.push({
        weight: set.weight,
        reps: set.reps,
        ...(typeof set.previous === 'string' ? { previous: set.previous } : {}),
      });
    }
    if (item.exerciseId !== undefined && typeof item.exerciseId !== 'string') return undefined;
    configs.push({
      name: item.name,
      ...(typeof item.exerciseId === 'string' ? { exerciseId: item.exerciseId } : {}),
      sets,
    });
  }

  return configs;
}

function planFromRow(row: PlanRow): WorkoutPlan {
  return {
    id: row.id,
    sourcePlanId: row.source_plan_id ?? undefined,
    name: row.name,
    focus: row.focus,
    duration: row.duration,
    exercises: row.exercises,
    exerciseConfigs: parseExerciseConfigs(row.exercise_configs),
    source: 'created',
  };
}

function sessionFromRow(row: WorkoutSessionRow): WorkoutSession {
  const completedAt = new Date(row.completed_at).getTime();
  if (!Number.isFinite(completedAt)) throw new Error('Historia zawiera nieprawidłową datę treningu.');
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    date: new Date(completedAt).toLocaleString('pl-PL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    duration: row.duration,
    completedExercises: row.completed_exercises,
    totalExercises: row.total_exercises,
    completedAt,
    ...(row.notes ? { notes: row.notes } : {}),
    ...(row.exercise_performance === null
      ? {}
      : { exercisePerformance: parseExerciseConfigs(row.exercise_performance) }),
  };
}

export function GymAppProvider({ children }: PropsWithChildren) {
  const { user, isLoading: authLoading, updateNick } = useAuth();
  const userId = user?.id ?? null;
  const nick = typeof user?.user_metadata.nick === 'string' ? user.user_metadata.nick : 'Treningowiec';
  const [customPlanState, setCustomPlanState] = useState<{ userId: string; plans: WorkoutPlan[] } | null>(null);
  const [sessionState, setSessionState] = useState<{
    userId: string;
    sessions: WorkoutSession[];
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const customPlans = useMemo(
    () => customPlanState?.userId === userId ? customPlanState.plans : [],
    [customPlanState, userId],
  );
  const currentSessionState = userId && sessionState?.userId === userId ? sessionState : null;
  const sessions = useMemo(() => currentSessionState?.sessions ?? [], [currentSessionState]);
  const sessionsLoading = Boolean(userId && (currentSessionState?.loading ?? true));
  const sessionsError = currentSessionState?.error ?? null;

  const reloadSessions = useCallback(async () => {
    if (!userId) return;
    setSessionState((current) => ({
      userId,
      sessions: current?.userId === userId ? current.sessions : [],
      loading: true,
      error: null,
    }));
    try {
      const { data, error } = await requireSupabase()
        .from('workout_sessions')
        .select(sessionSelect)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      const loadedSessions = data.map(sessionFromRow);
      setSessionState({ userId, sessions: loadedSessions, loading: false, error: null });
    } catch (error) {
      setSessionState((current) => ({
        userId,
        sessions: current?.userId === userId ? current.sessions : [],
        loading: false,
        error: error instanceof Error ? error.message : 'Nie udało się pobrać historii treningów.',
      }));
    }
  }, [userId]);

  const reloadPlans = useCallback(async () => {
    if (!userId) {
      setPlansLoading(false);
      setPlansError(null);
      return;
    }

    setPlansLoading(true);
    setPlansError(null);
    try {
      const { data, error } = await requireSupabase()
        .from('workout_plans')
        .select('id, source_plan_id, name, focus, duration, exercises, exercise_configs')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCustomPlanState({ userId, plans: data.map(planFromRow) });
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : 'Nie udało się pobrać Twoich planów.');
    } finally {
      setPlansLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!authLoading && userId) void Promise.resolve().then(reloadPlans);
  }, [authLoading, reloadPlans, userId]);

  useEffect(() => {
    if (!authLoading && userId) void Promise.resolve().then(reloadSessions);
  }, [authLoading, reloadSessions, userId]);

  const addPlan = useCallback(async (plan: Omit<WorkoutPlan, 'id'>) => {
    if (!userId) throw new Error('Zaloguj się, aby zapisać plan treningowy.');
    const { data, error } = await requireSupabase()
      .from('workout_plans')
      .insert({
        user_id: userId,
        source_plan_id: null,
        name: plan.name,
        focus: plan.focus,
        duration: plan.duration,
        exercises: plan.exercises,
        exercise_configs: plan.exerciseConfigs ?? null,
      })
      .select('id, source_plan_id, name, focus, duration, exercises, exercise_configs')
      .single();
    if (error) throw new Error(`Nie udało się zapisać planu: ${error.message}`);
    const savedPlan = planFromRow(data);
    setCustomPlanState((current) => ({
      userId,
      plans: [savedPlan, ...(current?.userId === userId ? current.plans : [])],
    }));
  }, [userId]);

  const updatePlan = useCallback(async (id: string, plan: Omit<WorkoutPlan, 'id'>) => {
    if (!userId) throw new Error('Zaloguj się, aby edytować plan treningowy.');
    const client = requireSupabase();
    const starterPlan = starterPlans.find((item) => item.id === id);
    const result = starterPlan
      ? await client.from('workout_plans').insert({
          user_id: userId,
          source_plan_id: id,
          name: plan.name,
          focus: plan.focus,
          duration: plan.duration,
          exercises: plan.exercises,
          exercise_configs: plan.exerciseConfigs ?? null,
        })
          .select('id, source_plan_id, name, focus, duration, exercises, exercise_configs')
          .single()
      : await client.from('workout_plans').update({
          name: plan.name,
          focus: plan.focus,
          duration: plan.duration,
          exercises: plan.exercises,
          exercise_configs: plan.exerciseConfigs ?? null,
        })
          .eq('id', id)
          .eq('user_id', userId)
          .select('id, source_plan_id, name, focus, duration, exercises, exercise_configs')
          .single();
    const { data, error } = result;
    if (error) throw new Error(`Nie udało się zaktualizować planu: ${error.message}`);
    const updated = planFromRow(data);
    setCustomPlanState((current) => ({
      userId,
      plans: (current?.userId === userId ? current.plans : []).map((item) => item.id === id ? updated : item),
    }));
  }, [userId]);

  const setUserName = useCallback(async (name: string) => {
    if (!userId) throw new Error('Zaloguj się, aby zmienić nick.');
    await updateNick(name.trim());
  }, [userId, updateNick]);

  const allPlans = useMemo(() => [
    ...starterPlans.filter((starter) => !customPlans.some((plan) => plan.sourcePlanId === starter.id)),
    ...customPlans,
  ], [customPlans]);

  const recordSession = useCallback(async (
    plan: WorkoutPlan,
    completedExercises: number,
    duration: number,
    exercisePerformance?: WorkoutExerciseConfig[],
    notes?: string,
  ) => {
    if (!userId) throw new Error('Zaloguj się, aby zapisać trening.');
    const completedAt = Date.now();
    const completedAtIso = new Date(completedAt).toISOString();
    const performance = exercisePerformance?.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set })),
    })) ?? null;
    const { data, error } = await requireSupabase()
      .from('workout_sessions')
      .insert({
        user_id: userId,
        name: plan.name,
        focus: plan.focus,
        duration,
        completed_exercises: completedExercises,
        total_exercises: plan.exercises.length,
        completed_at: completedAtIso,
        notes: notes?.trim() || null,
        exercise_performance: performance,
      })
      .select(sessionSelect)
      .single();
    if (error) throw new Error(`Nie udało się zapisać treningu: ${error.message}`);
    const completedSession = sessionFromRow(data);
    setSessionState((current) => ({
      userId,
      sessions: [completedSession, ...(current?.userId === userId ? current.sessions : [])],
      loading: false,
      error: null,
    }));
  }, [userId]);

  const value = useMemo<GymAppContextValue>(() => ({
    userName: nick,
    setUserName,
    plans: allPlans,
    plansLoading,
    plansError,
    reloadPlans,
    addPlan,
    updatePlan,
    sessions,
    sessionsLoading,
    sessionsError,
    reloadSessions,
    recordSession,
  }), [nick, setUserName, allPlans, plansLoading, plansError, reloadPlans, addPlan, updatePlan, sessions, sessionsLoading, sessionsError, reloadSessions, recordSession]);

  return <GymAppContext.Provider value={value}>{children}</GymAppContext.Provider>;
}

export function useGymApp() {
  const context = useContext(GymAppContext);
  if (!context) throw new Error('useGymApp must be used inside GymAppProvider');
  return context;
}
