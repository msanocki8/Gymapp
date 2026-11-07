import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { ExerciseDetailModal } from '@/components/exercise-detail-modal';
import { ExercisePickerModal } from '@/components/exercise-picker-modal';
import { MuscleVolumePanel } from '@/components/muscle-volume-panel';
import { WorkoutCard, WorkoutHeader, WorkoutScreen, WorkoutButton, workoutColors, workoutStyles } from '@/components/workout-ui';
import { exerciseLibrary, Exercise } from '@/constants/exercise-library';
import { WorkoutExerciseConfig, WorkoutPlan, useGymApp } from '@/hooks/use-gym-app';
import { AnalysisPeriod, areAllSetsCompleted, calculateMuscleVolume, getLocalWeekKey, VolumeExercise } from '@/lib/muscle-volume';

const DEFAULT_SETS_PER_EXERCISE = 3;
const DEFAULT_REST_SECONDS = 90;
const sessionCardGradient = ['rgba(22, 31, 22, 0.98)', 'rgba(12, 17, 14, 0.98)'] as const;
const completedCardGradient = ['rgba(29, 63, 40, 0.98)', 'rgba(13, 28, 18, 0.98)'] as const;
const seriesButtonGlow: ViewStyle & { boxShadow?: string } = Platform.select({
  web: { boxShadow: '0 5px 18px rgba(34, 197, 94, 0.3)' },
  default: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
}) ?? {};
const EMPTY_PLAN: WorkoutPlan = {
  id: '',
  name: '',
  focus: '',
  duration: 0,
  exercises: [],
  source: 'created',
};
const exerciseAliases: Record<string, string> = {
  'Unoszenie bokiem': 'lateral-raise',
  'Prostowanie ramion': 'triceps-pushdown',
  Podciąganie: 'pull-up',
  'Uginanie ramion': 'dumbbell-curl',
};

type SetStatus = 'pending' | 'completed';
type ExerciseSetStatuses = SetStatus[][];
type SessionDraft = {
  exerciseConfigs: WorkoutExerciseConfig[];
  setStatuses: ExerciseSetStatuses;
  notes: string;
};
const EMPTY_SESSION_DRAFT: SessionDraft = {
  exerciseConfigs: [],
  setStatuses: [],
  notes: '',
};
type KeypadTarget = {
  exerciseIndex: number;
  setIndex: number;
  field: 'weight' | 'reps';
};

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function readStoredTimestamp(key: string | null) {
  if (Platform.OS !== 'web' || !key || typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(key);
  const timestamp = value === null ? NaN : Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function writeStoredTimestamp(key: string | null, timestamp: number | null) {
  if (Platform.OS !== 'web' || !key || typeof window === 'undefined') return;
  if (timestamp === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, String(timestamp));
  }
}

function getStoredDraftKey(planId: string) {
  return `gymapp:workout-draft:${planId}`;
}

function splitStoredDraft(value: string) {
  const chunks: string[] = [];
  let chunk = '';
  let byteLength = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const characterBytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    if (byteLength + characterBytes > 1500) {
      chunks.push(chunk);
      chunk = '';
      byteLength = 0;
    }
    chunk += character;
    byteLength += characterBytes;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function getNativeDraftChunkCount(manifest: string | null) {
  const match = manifest?.match(/^v1:(\d+)$/);
  const count = match ? Number(match[1]) : 0;
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Zapisany szkic treningu ma nieprawidłowy format.');
  }
  return count;
}

function isSessionDraft(value: unknown): value is SessionDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<SessionDraft>;
  return Array.isArray(draft.exerciseConfigs)
    && draft.exerciseConfigs.every((exercise) =>
      typeof exercise.name === 'string'
      && Array.isArray(exercise.sets)
      && exercise.sets.every((set) =>
        typeof set.weight === 'string'
        && typeof set.reps === 'string'
        && (set.previous === undefined || typeof set.previous === 'string')))
    && Array.isArray(draft.setStatuses)
    && draft.setStatuses.every((statuses) =>
      Array.isArray(statuses)
      && statuses.every((status) => status === 'pending' || status === 'completed'))
    && typeof draft.notes === 'string';
}

async function readStoredDraft(planId: string): Promise<SessionDraft | null> {
  const key = getStoredDraftKey(planId);
  let value: string | null;
  if (Platform.OS === 'web') {
    value = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } else {
    const manifest = await SecureStore.getItemAsync(key);
    if (manifest === null) return null;
    const chunkCount = getNativeDraftChunkCount(manifest);
    if (chunkCount === 0) throw new Error('Zapisany szkic treningu ma nieprawidłowy format.');
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.getItemAsync(`${key}:part:${index}`)),
    );
    if (chunks.some((chunk) => chunk === null)) {
      throw new Error('Nie udało się odczytać całego zapisanego szkicu treningu.');
    }
    value = chunks.join('');
  }
  if (value === null) return null;

  const parsed: unknown = JSON.parse(value);
  if (!isSessionDraft(parsed)) {
    throw new Error('Zapisany szkic treningu ma nieprawidłowy format.');
  }
  return parsed;
}

async function writeStoredDraft(planId: string, draft: SessionDraft) {
  const key = getStoredDraftKey(planId);
  const value = JSON.stringify(draft);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  const chunks = splitStoredDraft(value);
  const previousCount = getNativeDraftChunkCount(await SecureStore.getItemAsync(key));
  await Promise.all(chunks.map((chunk, index) =>
    SecureStore.setItemAsync(`${key}:part:${index}`, chunk)));
  await SecureStore.setItemAsync(key, `v1:${chunks.length}`);
  await Promise.all(
    Array.from({ length: Math.max(0, previousCount - chunks.length) }, (_, index) =>
      SecureStore.deleteItemAsync(`${key}:part:${chunks.length + index}`)),
  );
}

async function deleteStoredDraft(planId: string) {
  const key = getStoredDraftKey(planId);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  const chunkCount = getNativeDraftChunkCount(await SecureStore.getItemAsync(key));
  await Promise.all([
    SecureStore.deleteItemAsync(key),
    ...Array.from({ length: chunkCount }, (_, index) =>
      SecureStore.deleteItemAsync(`${key}:part:${index}`)),
  ]);
}

function clearWorkoutTimerStorage(startKey: string | null, restKey: string | null) {
  writeStoredTimestamp(startKey, null);
  writeStoredTimestamp(restKey, null);
}

function confirmWorkoutExit(onConfirm: () => void) {
  const message = 'Czy na pewno chcesz wyjść i usunąć progres treningu?';
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
    return;
  }

  Alert.alert('Zakończyć trening?', message, [
    { text: 'Zostań', style: 'cancel' },
    { text: 'Wyjdź', style: 'destructive', onPress: onConfirm },
  ]);
}

function createSessionDraft(plan: { id: string; exercises: string[]; exerciseConfigs?: WorkoutExerciseConfig[] }): SessionDraft {
  const exerciseConfigs = plan.exercises.map((name) => {
    const config = plan.exerciseConfigs?.find((item) => item.name === name);
    return config
      ? { ...config, sets: config.sets.map((set) => ({ ...set })) }
      : {
        name,
        exerciseId: exerciseLibrary.find((exercise) => exercise.name === name)?.id,
        sets: Array.from({ length: DEFAULT_SETS_PER_EXERCISE }, () => ({ weight: '', reps: '', previous: '—' })),
      };
  });
  return {
    exerciseConfigs,
    setStatuses: exerciseConfigs.map((config) => Array<SetStatus>(config.sets.length).fill('pending')),
    notes: '',
  };
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { plans, sessions, recordSession } = useGymApp();
  const plan = plans.find((item) => item.id === planId);
  const [draftsByPlan, setDraftsByPlan] = useState<Record<string, SessionDraft>>({});
  const [draftLoadedPlanId, setDraftLoadedPlanId] = useState<string | null>(null);
  const [draftStorageError, setDraftStorageError] = useState<string | null>(null);
  const draftsByPlanRef = useRef(draftsByPlan);
  const draftWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedDraftPlanIds = useRef(new Set<string>());
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [isExercisePickerVisible, setIsExercisePickerVisible] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [expandedExerciseName, setExpandedExerciseName] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisWeekKey, setAnalysisWeekKey] = useState(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    return getLocalWeekKey(Date.now(), timeZone);
  });
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [restCardBottom, setRestCardBottom] = useState(Number.POSITIVE_INFINITY);
  const [selectedDetail, setSelectedDetail] = useState<Exercise | null>(null);
  const [keypadTarget, setKeypadTarget] = useState<KeypadTarget | null>(null);
  const [keypadValue, setKeypadValue] = useState('');
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('session');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const restDeadline = useRef<number | null>(null);
  const allowExitRef = useRef(false);
  const savingRef = useRef(false);
  const [allowExit, setAllowExit] = useState(false);
  const workoutStartKey = planId ? `gymapp:workout-start:${planId}` : null;
  const restDeadlineKey = planId ? `gymapp:workout-rest:${planId}` : null;
  const activePlan = plan ?? EMPTY_PLAN;

  const disableWorkoutRemovalPrevention = usePreventRemove(Boolean(plan && !allowExit), ({ repeat }) => {
    const leaveWorkout = () => {
      clearWorkoutTimerStorage(workoutStartKey, restDeadlineKey);
      allowExitRef.current = true;
      setAllowExit(true);
      repeat();
    };
    confirmWorkoutExit(leaveWorkout);
  });

  useEffect(() => {
    const now = Date.now();
    const storedStart = readStoredTimestamp(workoutStartKey);
    startedAt.current = storedStart ?? now;
    if (storedStart === null) writeStoredTimestamp(workoutStartKey, now);

    const storedRestDeadline = readStoredTimestamp(restDeadlineKey);
    restDeadline.current = storedRestDeadline !== null && storedRestDeadline > now
      ? storedRestDeadline
      : null;
    if (restDeadline.current === null) writeStoredTimestamp(restDeadlineKey, null);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const updateTimers = () => {
      const now = Date.now();
      if (startedAt.current !== null) {
        setElapsedSeconds(Math.floor((now - startedAt.current) / 1000));
      }
      const deadline = restDeadline.current;
      if (deadline !== null) {
        const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
        setRestRemainingSeconds(remaining);
        if (remaining === 0) {
          restDeadline.current = null;
          writeStoredTimestamp(restDeadlineKey, null);
        }
      } else {
        setRestRemainingSeconds(0);
      }
      const weekKey = getLocalWeekKey(now, timeZone);
      setAnalysisWeekKey((current) => current === weekKey ? current : weekKey);
    };
    updateTimers();
    const timer = setInterval(updateTimers, 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateTimers();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pageshow', updateTimers);
      window.addEventListener('focus', updateTimers);
    }

    return () => {
      clearInterval(timer);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pageshow', updateTimers);
        window.removeEventListener('focus', updateTimers);
      }
    };
  }, [restDeadlineKey, workoutStartKey]);

  useEffect(() => {
    draftsByPlanRef.current = draftsByPlan;
  }, [draftsByPlan]);

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;
    const currentPlan = plan;
    setDraftStorageError(null);
    void readStoredDraft(currentPlan.id).then((storedDraft) => {
      if (cancelled) return;
      const currentDraft = draftsByPlanRef.current[currentPlan.id]
        ?? storedDraft
        ?? createSessionDraft(currentPlan);
      draftsByPlanRef.current = {
        ...draftsByPlanRef.current,
        [currentPlan.id]: currentDraft,
      };
      setDraftsByPlan((current) => current[currentPlan.id]
        ? current
        : { ...current, [currentPlan.id]: currentDraft });
      setDraftLoadedPlanId(currentPlan.id);
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.error('Failed to load workout draft:', error);
      setDraftStorageError('Nie udało się odczytać zapisanego szkicu treningu.');
      const currentDraft = draftsByPlanRef.current[currentPlan.id]
        ?? createSessionDraft(currentPlan);
      draftsByPlanRef.current = {
        ...draftsByPlanRef.current,
        [currentPlan.id]: currentDraft,
      };
      setDraftsByPlan((current) => current[currentPlan.id]
        ? current
        : { ...current, [currentPlan.id]: currentDraft });
      setDraftLoadedPlanId(currentPlan.id);
    });
    return () => {
      cancelled = true;
    };
  }, [plan]);

  const draft = draftsByPlan[activePlan.id] ?? EMPTY_SESSION_DRAFT;

  useEffect(() => {
    if (!plan || draftLoadedPlanId !== plan.id || completedDraftPlanIds.current.has(plan.id)) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      draftSaveTimer.current = null;
      draftWriteQueue.current = draftWriteQueue.current
        .then(() => writeStoredDraft(plan.id, draft))
        .catch((error: unknown) => {
          console.error('Failed to save workout draft:', error);
          setDraftStorageError('Nie udało się zapisać szkicu treningu.');
        });
    }, 300);
  }, [draft, draftLoadedPlanId, plan]);

  useEffect(() => {
    if (!plan) return;
    const currentPlanId = plan.id;
    return () => {
      if (draftSaveTimer.current) {
        clearTimeout(draftSaveTimer.current);
        draftSaveTimer.current = null;
      }
      if (!completedDraftPlanIds.current.has(currentPlanId)) {
        const latestDraft = draftsByPlanRef.current[currentPlanId];
        if (latestDraft) {
          draftWriteQueue.current = draftWriteQueue.current
            .then(() => writeStoredDraft(currentPlanId, latestDraft))
            .catch((error: unknown) => {
              console.error('Failed to save workout draft on exit:', error);
            });
        }
      }
    };
  }, [plan]);

  const { exerciseConfigs, setStatuses, notes } = draft;
  const sessionExerciseNames = exerciseConfigs.map((config) => config.name);
  const setCounts = exerciseConfigs.map((config) => config.sets.length);
  const uniqueSetCounts = new Set(setCounts);
  const setSummaryLabel = uniqueSetCounts.size === 1
    ? `${setCounts[0] ?? DEFAULT_SETS_PER_EXERCISE} SERIE / ĆW.`
    : 'SERIE WG PLANU';
  const completedExercises = setStatuses.filter(
    areAllSetsCompleted,
  ).length;
  const progress = sessionExerciseNames.length > 0
    ? (completedExercises / sessionExerciseNames.length) * 100
    : 0;
  const showMiniRestTimer = scrollOffset >= restCardBottom;
  const previousPerformanceByExercise = useMemo(() => {
    const byId = new Map<string, WorkoutExerciseConfig['sets']>();
    const byName = new Map<string, { exerciseId?: string; sets: WorkoutExerciseConfig['sets'] }>();
    const orderedSessions = [...sessions].sort((a, b) => b.completedAt - a.completedAt);

    for (const session of orderedSessions) {
      for (const exercise of session.exercisePerformance ?? []) {
        const exerciseId = exercise.exerciseId
          ?? exerciseLibrary.find((item) => item.name === exercise.name)?.id
          ?? exerciseAliases[exercise.name];
        const nameKey = exercise.name.trim().toLocaleLowerCase('pl-PL');
        if (exerciseId && !byId.has(exerciseId)) byId.set(exerciseId, exercise.sets);
        if (!byName.has(nameKey)) byName.set(nameKey, { exerciseId, sets: exercise.sets });
      }
    }

    return { byId, byName };
  }, [sessions]);
  const volumeExercises = useMemo<VolumeExercise[]>(() => exerciseConfigs.map((config, exerciseIndex) => ({
    exerciseId: config.exerciseId ?? exerciseLibrary.find((exercise) => exercise.name === config.name)?.id,
    name: config.name,
    sets: config.sets.map((set, setIndex) => ({
      status: setStatuses[exerciseIndex]?.[setIndex] ?? 'pending',
      reps: set.reps,
    })),
  })), [exerciseConfigs, setStatuses]);
  const historicalSessions = useMemo(() => sessions.map((session) => ({
    completedAt: session.completedAt,
    exercisePerformance: session.exercisePerformance?.map((exercise) => ({
      exerciseId: exercise.exerciseId ?? exerciseLibrary.find((item) => item.name === exercise.name)?.id,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({ ...set, completed: true })),
    })),
  })), [sessions]);
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const sessionMuscleVolumes = useMemo(() => calculateMuscleVolume({
    exercises: volumeExercises,
    period: 'session',
    timeZone: localTimeZone,
  }), [volumeExercises, localTimeZone]);
  const weeklyMuscleVolumes = useMemo(() => calculateMuscleVolume({
    exercises: volumeExercises,
    sessions: historicalSessions,
    period: 'week',
    weekKey: analysisWeekKey,
    timeZone: localTimeZone,
  }), [volumeExercises, historicalSessions, analysisWeekKey, localTimeZone]);
  const muscleVolumes = analysisPeriod === 'session' ? sessionMuscleVolumes : weeklyMuscleVolumes;

  if (!plan) {
    return (
      <WorkoutScreen>
        <WorkoutHeader eyebrow="TRENING" onBack={() => router.replace('/workout-flow')} />
        <View style={styles.missingPlan}>
          <Text style={styles.missingTitle}>Nie znaleziono tego planu</Text>
          <Text style={workoutStyles.subtitle}>
            Wybierz jeden z dostępnych planów, żeby rozpocząć trening.
          </Text>
          <View style={styles.missingButton}>
            <WorkoutButton label="Wybierz plan" onPress={() => router.replace('/workout-flow')} />
          </View>
        </View>
      </WorkoutScreen>
    );
  }

  if (draftLoadedPlanId !== plan.id) {
    return (
      <WorkoutScreen>
        <WorkoutHeader eyebrow="TRENING W TOKU" onBack={requestWorkoutExit} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A3E635" />
          <Text className="mt-3 text-sm text-zinc-400">Wczytywanie szkicu treningu…</Text>
        </View>
      </WorkoutScreen>
    );
  }

  function updateDraft(updater: (current: SessionDraft) => SessionDraft) {
    const updatedDraft = updater(
      draftsByPlanRef.current[activePlan.id]
        ?? draftsByPlan[activePlan.id]
        ?? createSessionDraft(activePlan),
    );
    const updatedDrafts = {
      ...draftsByPlanRef.current,
      [activePlan.id]: updatedDraft,
    };
    draftsByPlanRef.current = updatedDrafts;
    setDraftsByPlan(updatedDrafts);
  }

  function setRestTimer(seconds: number) {
    const remaining = Math.max(0, Math.floor(seconds));
    const deadline = remaining > 0 ? Date.now() + remaining * 1000 : null;
    restDeadline.current = deadline;
    setRestRemainingSeconds(remaining);
    writeStoredTimestamp(restDeadlineKey, deadline);
  }

  function getRestTimerRemaining() {
    const deadline = restDeadline.current;
    return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  }

  function toggleSetCompleted(exerciseIndex: number, setIndex: number) {
    const isCompleted = setStatuses[exerciseIndex]?.[setIndex] === 'completed';
    updateDraft((current) => {
      const statuses = current.setStatuses.map((exercise) => [...exercise]);
      statuses[exerciseIndex][setIndex] = isCompleted ? 'pending' : 'completed';
      return { ...current, setStatuses: statuses };
    });
    if (!isCompleted) setRestTimer(DEFAULT_REST_SECONDS);
  }

  function addExercise(exercise: Exercise) {
    if (exerciseConfigs.some((config) => config.name === exercise.name)) return;
    const sets = Array.from({ length: DEFAULT_SETS_PER_EXERCISE }, () => ({
      weight: '',
      reps: '',
      previous: '—',
    }));
    updateDraft((current) => ({
      ...current,
      exerciseConfigs: [...current.exerciseConfigs, {
        name: exercise.name,
        exerciseId: exercise.id,
        sets,
      }],
      setStatuses: [...current.setStatuses, Array<SetStatus>(sets.length).fill('pending')],
    }));
    setRecentExerciseIds((current) => [exercise.id, ...current.filter((id) => id !== exercise.id)].slice(0, 5));
    setIsExercisePickerVisible(false);
  }

  function removeExercise(index: number) {
    const exerciseName = exerciseConfigs[index]?.name;
    if (!exerciseName) return;
    if (exerciseConfigs.length <= 1) {
      const message = 'Trening musi zawierać co najmniej jedno ćwiczenie.';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(message);
      } else {
        Alert.alert('Nie można usunąć ćwiczenia', message);
      }
      return;
    }
    updateDraft((current) => ({
      ...current,
      exerciseConfigs: current.exerciseConfigs.filter((_, currentIndex) => currentIndex !== index),
      setStatuses: current.setStatuses.filter((_, currentIndex) => currentIndex !== index),
    }));
    setExpandedExerciseName((current) => current === exerciseName ? null : current);
    setKeypadTarget(null);
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= exerciseConfigs.length) return;

    updateDraft((current) => {
      const exerciseConfigs = [...current.exerciseConfigs];
      const [movedConfig] = exerciseConfigs.splice(index, 1);
      if (!movedConfig) return current;
      exerciseConfigs.splice(targetIndex, 0, movedConfig);

      const setStatuses = [...current.setStatuses];
      const [movedStatuses] = setStatuses.splice(index, 1);
      if (!movedStatuses) return current;
      setStatuses.splice(targetIndex, 0, movedStatuses);

      return { ...current, exerciseConfigs, setStatuses };
    });
    setKeypadTarget(null);
  }

  function toggleExercise(exerciseName: string) {
    setExpandedExerciseName((current) => current === exerciseName ? null : exerciseName);
  }

  function openExerciseDetails(exerciseIndex: number) {
    const config = exerciseConfigs[exerciseIndex];
    const exercise = exerciseLibrary.find((item) =>
      item.id === config?.exerciseId || item.name === config?.name)
      ?? exerciseLibrary.find((item) => item.id === exerciseAliases[config?.name ?? ''])
      ?? customExercises.find((item) => item.id === config?.exerciseId || item.name === config?.name);
    setSelectedDetail(exercise ?? {
      id: config?.exerciseId ?? `custom-${exerciseIndex}`,
      name: config?.name ?? 'Ćwiczenie',
      category: 'Core',
      equipment: 'Sprzęt zależny od wariantu ćwiczenia',
      level: 'Początkujący',
      image: '',
      description: 'Własne ćwiczenie dodane do tego planu treningowego.',
      steps: ['Ustaw się stabilnie i przygotuj potrzebny sprzęt.', 'Wykonuj ruch w kontrolowanym zakresie.', 'Zakończ serię przed utratą poprawnej techniki.'],
      primaryMuscles: ['Mięśnie zgodne z planem'],
      secondaryMuscles: ['Mięśnie stabilizujące'],
    });
  }

  function addSet(exerciseIndex: number) {
    updateDraft((current) => {
      const configs = [...current.exerciseConfigs];
      configs[exerciseIndex] = {
        ...configs[exerciseIndex],
        sets: [...configs[exerciseIndex].sets, { weight: '', reps: '', previous: '—' }],
      };
      const statuses = current.setStatuses.map((exercise) => [...exercise]);
      statuses[exerciseIndex] = [...statuses[exerciseIndex], 'pending'];
      return { ...current, exerciseConfigs: configs, setStatuses: statuses };
    });
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    if ((exerciseConfigs[exerciseIndex]?.sets.length ?? 0) <= 1) return;
    updateDraft((current) => {
      const configs = [...current.exerciseConfigs];
      configs[exerciseIndex] = {
        ...configs[exerciseIndex],
        sets: configs[exerciseIndex].sets.filter((_, index) => index !== setIndex),
      };
      const statuses = current.setStatuses.map((exercise) => [...exercise]);
      statuses[exerciseIndex] = statuses[exerciseIndex].filter((_, index) => index !== setIndex);
      return { ...current, exerciseConfigs: configs, setStatuses: statuses };
    });
  }

  function updateSetValue(exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) {
    updateDraft((current) => {
      const configs = [...current.exerciseConfigs];
      const sets = [...configs[exerciseIndex].sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      configs[exerciseIndex] = { ...configs[exerciseIndex], sets };
      return { ...current, exerciseConfigs: configs };
    });
  }

  function applyPreviousSet(exerciseIndex: number, setIndex: number, previousSet: WorkoutExerciseConfig['sets'][number]) {
    updateDraft((current) => {
      const configs = [...current.exerciseConfigs];
      const sets = [...configs[exerciseIndex].sets];
      const currentSet = sets[setIndex];
      sets[setIndex] = {
        ...currentSet,
        weight: previousSet.weight || currentSet.weight,
        reps: previousSet.reps || currentSet.reps,
      };
      configs[exerciseIndex] = { ...configs[exerciseIndex], sets };
      return { ...current, exerciseConfigs: configs };
    });
    setKeypadTarget(null);
  }

  function openKeypad(target: KeypadTarget) {
    setKeypadTarget(target);
    setKeypadValue(exerciseConfigs[target.exerciseIndex]?.sets[target.setIndex]?.[target.field] ?? '');
  }

  function pressKey(key: string) {
    if (!keypadTarget) return;
    setKeypadValue((current) => {
      if (key === '⌫') return current.slice(0, -1);
      if (key === '.' && (keypadTarget.field === 'reps' || current.includes('.'))) return current;
      return current.length < 7 ? `${current}${key}` : current;
    });
  }

  function saveKeypadValue() {
    if (!keypadTarget) return;
    updateSetValue(keypadTarget.exerciseIndex, keypadTarget.setIndex, keypadTarget.field, keypadValue);
    setKeypadTarget(null);
  }

  async function finishWorkout() {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    const exercisePerformance = exerciseConfigs.flatMap((exercise, exerciseIndex) => {
      const completedSets = exercise.sets.filter((_, setIndex) =>
        setStatuses[exerciseIndex]?.[setIndex] === 'completed');
      return completedSets.length > 0 ? [{ ...exercise, sets: completedSets }] : [];
    });
    try {
      await recordSession(
        { ...activePlan, exercises: sessionExerciseNames },
        completedExercises,
        Math.max(1, Math.round(elapsedSeconds / 60)),
        exercisePerformance,
        notes,
      );
      completedDraftPlanIds.current.add(activePlan.id);
      if (draftSaveTimer.current) {
        clearTimeout(draftSaveTimer.current);
        draftSaveTimer.current = null;
      }
      await draftWriteQueue.current;
      try {
        await deleteStoredDraft(activePlan.id);
      } catch (error) {
        console.error('Failed to delete completed workout draft:', error);
        setDraftStorageError('Trening zapisano, ale nie udało się usunąć jego szkicu.');
      }
      const remainingDrafts = { ...draftsByPlanRef.current };
      delete remainingDrafts[activePlan.id];
      draftsByPlanRef.current = remainingDrafts;
      setDraftsByPlan(remainingDrafts);
      clearWorkoutTimerStorage(workoutStartKey, restDeadlineKey);
      allowExitRef.current = true;
      setAllowExit(true);
      disableWorkoutRemovalPrevention();
      router.replace('/training');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać treningu.';
      setSaveError(message);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(message);
      } else {
        Alert.alert('Błąd zapisu', message);
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  function requestWorkoutExit() {
    confirmWorkoutExit(() => {
      clearWorkoutTimerStorage(workoutStartKey, restDeadlineKey);
      allowExitRef.current = true;
      setAllowExit(true);
      disableWorkoutRemovalPrevention();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/workout-flow');
      }
    });
  }

  if (isExercisePickerVisible) {
    return (
      <WorkoutScreen>
        <ExercisePickerModal
          selectedExerciseIds={exerciseConfigs
            .map((config) => config.exerciseId ?? exerciseLibrary.find((exercise) => exercise.name === config.name)?.id)
            .filter((id): id is string => Boolean(id))}
          recentExerciseIds={recentExerciseIds}
          customExercises={customExercises}
          onClose={() => setIsExercisePickerVisible(false)}
          onSelect={addExercise}
          onAddCustomExercise={(exercise) => setCustomExercises((current) => [exercise, ...current])}
          onShowDetails={(exercise) => {
            setSelectedDetail(exercise);
            setIsExercisePickerVisible(false);
          }}
        />
      </WorkoutScreen>
    );
  }

  return (
    <WorkoutScreen>
      <WorkoutHeader eyebrow="TRENING W TOKU" onBack={requestWorkoutExit} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
      <ScrollView
        className="min-w-0 flex-1"
        contentContainerStyle={[workoutStyles.scrollContent, styles.sessionScrollContent]}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        <View className="mt-3 w-full min-w-0">
          <View className="mb-2 flex-row items-center" style={styles.heroEyebrow}>
            <View className="rounded-full bg-lime-400" style={styles.heroIndicator} />
            <Text style={styles.heroEyebrowText}>AKTYWNY PLAN</Text>
          </View>
          <Text className="w-full min-w-0 shrink" style={workoutStyles.sectionLabel} numberOfLines={2} ellipsizeMode="tail">
            {activePlan.focus}
          </Text>
          <Text className="w-full min-w-0 shrink" style={[workoutStyles.title, styles.title]} numberOfLines={2} ellipsizeMode="tail">
            {activePlan.name}
          </Text>
        </View>

        <WorkoutCard
          className="rounded-3xl border border-zinc-800/80 bg-zinc-900/80"
          gradientColors={sessionCardGradient}
          glow
          animationDuration={170}
          animationOffset={5}
          style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View className="min-w-0 flex-1 shrink" style={styles.progressCopy}>
              <Text style={styles.progressCaption}>POSTĘP TRENINGU</Text>
              <View className="w-full min-w-0 flex-row flex-wrap items-baseline" style={styles.progressCountRow}>
                <Text className="shrink" style={styles.progressCount} maxFontSizeMultiplier={1.15}>
                  {completedExercises}
                  <Text style={styles.progressTotal}> / {sessionExerciseNames.length}</Text>
                </Text>
                <Text className="shrink" style={styles.progressUnit}>ćwiczeń</Text>
              </View>
            </View>
            <View className="shrink-0" style={styles.timer}>
              <View style={styles.timerHeading}>
                <View className="rounded-full bg-lime-400" style={styles.timerIndicator} />
                <Text style={styles.timerCaption}>CZAS TRENINGU</Text>
              </View>
              <Text style={styles.timerText}>{formatElapsed(elapsedSeconds)}</Text>
            </View>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            className="overflow-hidden rounded-full bg-zinc-800"
            style={styles.progressTrack}>
            <View className="h-full rounded-full bg-lime-400" style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </WorkoutCard>

        <View
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setRestCardBottom(y + height);
          }}>
          <WorkoutCard
            className="rounded-3xl border border-zinc-800/80 bg-zinc-900/80"
            gradientColors={sessionCardGradient}
            glow
            animationDuration={170}
            animationOffset={5}
            style={styles.restCard}>
            <View style={styles.restHeader}>
              <View className="min-w-0">
                <Text style={styles.restEyebrow}>ODPOCZYNEK MIĘDZY SERIAMI</Text>
                <Text style={styles.restTime}>{restRemainingSeconds > 0 ? formatElapsed(restRemainingSeconds) : 'Gotowy'}</Text>
              </View>
              <Text style={styles.restHint}>
                {restRemainingSeconds > 0 ? 'CZAS DO KOŃCA' : 'GOTOWY DO KOLEJNEJ SERII'}
              </Text>
            </View>
            <View style={styles.restActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={restRemainingSeconds > 0 ? 'Zatrzymaj timer odpoczynku' : 'Rozpocznij 90-sekundowy odpoczynek'}
                onPress={() => setRestTimer(getRestTimerRemaining() > 0 ? 0 : DEFAULT_REST_SECONDS)}
                className="active:opacity-80"
                style={[styles.startSeriesButton, seriesButtonGlow, restRemainingSeconds > 0 && styles.stopRestButton]}>
                {restRemainingSeconds > 0 ? (
                  <Text style={styles.stopRestText}>ZATRZYMAJ TIMER</Text>
                ) : (
                  <>
                    <Text style={styles.startSeriesIcon}>▶</Text>
                    <Text style={styles.startSeriesText}>ROZPOCZNIJ SERIĘ</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dodaj 15 sekund odpoczynku"
                onPress={() => setRestTimer(getRestTimerRemaining() + 15)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 active:opacity-75"
                style={styles.addRestTimeButton}>
                <Text style={styles.addRestTimeText}>+15s</Text>
              </Pressable>
            </View>
          </WorkoutCard>
        </View>

        <MuscleVolumePanel
          volumes={muscleVolumes}
          sessionVolumes={sessionMuscleVolumes}
          weeklyVolumes={weeklyMuscleVolumes}
          period={analysisPeriod}
          onPeriodChange={setAnalysisPeriod}
        />

        <View className="w-full min-w-0 flex-row items-center justify-between" style={styles.exerciseHeading}>
          <View className="min-w-0 flex-1 shrink">
            <Text style={styles.exerciseEyebrow}>PLAN SESJI</Text>
            <Text className="min-w-0 shrink" style={styles.exerciseTitle} numberOfLines={1} ellipsizeMode="tail">Ćwiczenia</Text>
          </View>
          <View className="shrink-0 items-end" style={styles.exerciseHeadingActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isEditingExercises }}
              onPress={() => setIsEditingExercises((current) => !current)}
              className="rounded-xl border border-lime-400/30 bg-lime-400/10 active:opacity-75"
              style={styles.editExercisesButton}>
              <Text style={styles.editExercisesButtonText}>{isEditingExercises ? 'GOTOWE' : 'EDYTUJ'}</Text>
            </Pressable>
            <View className="rounded-full border border-zinc-800 bg-zinc-900" style={styles.exerciseCountBadge}>
              <Text style={styles.exerciseLabel}>{sessionExerciseNames.length} ĆW. · {setSummaryLabel}</Text>
            </View>
          </View>
        </View>
        {isEditingExercises && (
          <View style={styles.editExercisesActions}>
            <Text style={styles.dragHint}>Użyj strzałek, aby zmienić kolejność ćwiczeń.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dodaj ćwiczenie do treningu"
              onPress={() => setIsExercisePickerVisible(true)}
              className="min-h-12 flex-row items-center justify-center rounded-2xl border border-lime-400/30 bg-lime-400/10 active:opacity-75"
              style={styles.addExerciseButton}>
              <Text style={styles.addExerciseButtonText}>＋ DODAJ ĆWICZENIE</Text>
            </Pressable>
          </View>
        )}
        <View className="w-full min-w-0" style={styles.exerciseList}>
          {exerciseConfigs.map((exerciseConfig, index) => {
            const exercise = exerciseConfig.name;
            const currentExerciseId = exerciseConfig.exerciseId
              ?? exerciseLibrary.find((item) => item.name === exercise)?.id
              ?? exerciseAliases[exercise];
            const previousByName = previousPerformanceByExercise.byName.get(exercise.trim().toLocaleLowerCase('pl-PL'));
            const previousById = currentExerciseId
              ? previousPerformanceByExercise.byId.get(currentExerciseId)
              : undefined;
            const previousSets = previousById
              ?? (currentExerciseId && previousByName?.exerciseId && previousByName.exerciseId !== currentExerciseId
                ? undefined
                : previousByName?.sets);
            const exerciseStatuses = setStatuses[index] ?? [];
            const isExpanded = expandedExerciseName === exercise;
            const isExerciseCompleted = areAllSetsCompleted(exerciseStatuses);
            return (
              <Animated.View
                key={exerciseConfig.exerciseId ?? exercise}
                exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
                layout={LinearTransition.duration(150).reduceMotion(ReduceMotion.System)}>
                <WorkoutCard
                  className={`rounded-3xl border bg-zinc-900/80 ${
                    isExerciseCompleted
                      ? 'border-emerald-400/20 bg-emerald-950/40'
                      : 'border-zinc-800/80'
                  }`}
                  gradientColors={Platform.OS === 'web'
                    ? isExerciseCompleted ? completedCardGradient : sessionCardGradient
                    : undefined}
                  glow={Platform.OS === 'web'}
                  animationDuration={170}
                  animationOffset={5}
                  style={[
                    styles.exerciseCard,
                    isExpanded && styles.exerciseCardActive,
                    isExerciseCompleted && styles.exerciseCardCompleted,
                  ]}>
                <View className="w-full min-w-0 flex-row items-center overflow-hidden" style={styles.exerciseHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Szczegóły ćwiczenia: ${exercise}`}
                    onPress={() => openExerciseDetails(index)}
                    className="shrink-0 active:opacity-75"
                    style={[styles.exerciseNumber, isExpanded && styles.exerciseNumberActive]}>
                    <Text style={[styles.exerciseNumberText, isExpanded && styles.exerciseNumberTextActive]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Pokaż szczegóły ćwiczenia ${exercise}${isExerciseCompleted ? ', ukończone' : ''}`}
                    onPress={() => openExerciseDetails(index)}
                    className="min-w-0 flex-1 shrink overflow-hidden active:opacity-75"
                    style={styles.exerciseCopy}>
                    <Text className="w-full min-w-0 shrink" style={styles.exerciseName} numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={1.15}>
                      {exercise}
                    </Text>
                    <View className="min-w-0 flex-row flex-wrap items-center" style={styles.exerciseSummary}>
                      <View className="shrink-0 flex-row" style={styles.setDots}>
                        {exerciseStatuses.map((status, setIndex) => (
                          <View
                            key={`${exercise}-${setIndex}`}
                            style={[
                              styles.setDot,
                              status === 'completed' && styles.setDotCompleted,
                            ]}
                          />
                        ))}
                      </View>
                      <Text className="min-w-0 shrink" style={styles.exerciseSubtext} numberOfLines={1} ellipsizeMode="tail">
                        {exerciseStatuses.filter((status) => status === 'completed').length}/{exerciseStatuses.length} serie
                      </Text>
                      {isExerciseCompleted ? (
                        <Text accessibilityLabel="Ćwiczenie ukończone" style={styles.exerciseCompletedLabel}>UKOŃCZONE ✓</Text>
                      ) : null}
                    </View>
                  </Pressable>
                  {isEditingExercises && (
                    <View style={styles.moveExerciseActions}>
                      {index > 0 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Przenieś ${exercise} wyżej`}
                          onPress={() => moveExercise(index, -1)}
                          className="items-center justify-center rounded-xl border border-lime-400/25 bg-lime-400/10 active:opacity-70"
                          style={styles.moveExerciseButton}>
                          <Text style={styles.moveExerciseArrow}>↑</Text>
                        </Pressable>
                      )}
                      {index < exerciseConfigs.length - 1 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Przenieś ${exercise} niżej`}
                          onPress={() => moveExercise(index, 1)}
                          className="items-center justify-center rounded-xl border border-lime-400/25 bg-lime-400/10 active:opacity-70"
                          style={styles.moveExerciseButton}>
                          <Text style={styles.moveExerciseArrow}>↓</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${exercise}, ${isExpanded ? 'zwiń' : 'rozwiń'} serie`}
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => toggleExercise(exercise)}
                    className="shrink-0 active:opacity-75"
                    style={[styles.expandButton, isExpanded && styles.expandButtonActive]}>
                    <Text style={[styles.expandArrow, isExpanded && styles.expandArrowActive]}>
                      {isExpanded ? '−' : '+'}
                    </Text>
                  </Pressable>
                  {isEditingExercises && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Usuń ćwiczenie ${exercise}`}
                      onPress={() => removeExercise(index)}
                      className="shrink-0 items-center justify-center rounded-full bg-red-500/15 active:opacity-70"
                      style={styles.removeExerciseButton}>
                      <Text style={styles.removeExerciseText}>×</Text>
                    </Pressable>
                  )}
                </View>
                {isExpanded && (
                  <Animated.View
                    entering={FadeIn.duration(140).reduceMotion(ReduceMotion.System)}
                    exiting={FadeOut.duration(100).reduceMotion(ReduceMotion.System)}
                    className="overflow-hidden">
                    <View style={styles.setList}>
                    {exerciseStatuses.map((status, setIndex) => {
                      const previousSet = previousSets?.[setIndex];
                      const previousValue = previousSet
                        ? [previousSet.weight && `${previousSet.weight} kg`, previousSet.reps && `${previousSet.reps} powt.`]
                          .filter(Boolean)
                          .join(' × ')
                        : '';
                      return (
                      <Animated.View
                        key={`${exercise}-set-${setIndex}`}
                        entering={FadeInDown
                          .duration(140)
                          .withInitialValues({ opacity: 0, translateY: 3 })
                          .reduceMotion(ReduceMotion.System)}
                        style={[styles.setRow, setIndex === exerciseStatuses.length - 1 && styles.setRowLast]}>
                        <View className="min-w-0 flex-row items-center justify-between">
                          <Text style={styles.setName}>SERIA {String(setIndex + 1).padStart(2, '0')}</Text>
                          {previousSet && previousValue ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Uzupełnij serię ${setIndex + 1} ostatnim wynikiem: ${previousValue}`}
                              accessibilityHint="Skopiuje poprzedni ciężar i liczbę powtórzeń do tej serii."
                              onPress={() => applyPreviousSet(index, setIndex, previousSet)}
                              hitSlop={8}
                              style={styles.previousButton}>
                              <Text style={styles.previousValue} numberOfLines={1}>
                                OSTATNIO · {previousValue} · UŻYJ
                              </Text>
                            </Pressable>
                          ) : (
                            <Text style={styles.previousValue} numberOfLines={1}>OSTATNIO · —</Text>
                          )}
                        </View>
                        <View className="min-w-0 flex-row items-end" style={styles.setEditRow}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edytuj ciężar serii ${setIndex + 1}, obecnie ${exerciseConfig?.sets[setIndex]?.weight || 'nieustawiony'} kilogramów`}
                            onPress={() => openKeypad({ exerciseIndex: index, setIndex, field: 'weight' })}
                            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 active:opacity-75"
                            style={styles.valueButton}>
                            <Text style={styles.valueLabel}>KG</Text>
                            <Text style={styles.valueText} numberOfLines={1}>{exerciseConfig?.sets[setIndex]?.weight || '—'}</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edytuj powtórzenia serii ${setIndex + 1}, obecnie ${exerciseConfig?.sets[setIndex]?.reps || 'nieustawione'}`}
                            onPress={() => openKeypad({ exerciseIndex: index, setIndex, field: 'reps' })}
                            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 active:opacity-75"
                            style={styles.valueButton}>
                            <Text style={styles.valueLabel}>POWT.</Text>
                            <Text style={styles.valueText} numberOfLines={1}>{exerciseConfig?.sets[setIndex]?.reps || '—'}</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Seria ${setIndex + 1}: ${status === 'completed' ? 'wykonana' : 'niewykonana'}`}
                            accessibilityState={{ checked: status === 'completed' }}
                            onPress={() => toggleSetCompleted(index, setIndex)}
                            className="active:opacity-75"
                            style={[
                              styles.statusButton,
                              status === 'completed' && styles.statusButtonCompleted,
                            ]}>
                            <Text style={[styles.statusButtonText, status === 'completed' && styles.statusTextActive]}>
                              {status === 'completed' ? '✓' : ''}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Usuń serię ${setIndex + 1}`}
                            disabled={exerciseStatuses.length <= 1}
                            onPress={() => removeSet(index, setIndex)}
                            className="active:opacity-75"
                            style={[styles.deleteSetButton, exerciseStatuses.length <= 1 && styles.disabledDeleteSetButton]}>
                            <Text style={styles.deleteSetText}>−</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                      );
                    })}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Dodaj serię do ${exercise}`}
                      onPress={() => addSet(index)}
                      className="mb-3 mt-2 min-h-12 flex-row items-center justify-center rounded-xl border border-lime-400/25 bg-lime-400/5 active:opacity-75"
                      style={styles.addSetButton}>
                      <Text style={styles.addSetText}>＋ DODAJ SERIĘ</Text>
                    </Pressable>
                    </View>
                  </Animated.View>
                )}
                </WorkoutCard>
              </Animated.View>
            );
          })}
        </View>
        <View style={styles.notesSection}>
          <Text style={styles.exerciseEyebrow}>NOTATKI DO TRENINGU</Text>
          <TextInput
            accessibilityLabel="Notatki do treningu"
            value={notes}
            onChangeText={(value) => updateDraft((current) => ({ ...current, notes: value }))}
            placeholder="Jak się czujesz? Zapisz uwagi do sesji..."
            placeholderTextColor="#778177"
            multiline
            textAlignVertical="top"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-100"
            style={styles.notesInput}
          />
        </View>
      </ScrollView>
      {showMiniRestTimer && (
        <View className="flex-row items-center justify-between rounded-2xl border border-lime-400/30 bg-zinc-900/95" style={[styles.miniRestTimer, seriesButtonGlow]}>
          <LinearGradient
            colors={['rgba(22, 31, 22, 0.98)', 'rgba(12, 17, 14, 0.98)']}
            style={[StyleSheet.absoluteFill, { pointerEvents: 'none', borderRadius: 18 }]}
          />
          <View className="min-w-0 flex-1">
            <Text style={styles.miniRestEyebrow}>ODPOCZYNEK</Text>
            <Text style={styles.miniRestTime}>{restRemainingSeconds > 0 ? formatElapsed(restRemainingSeconds) : 'Gotowy'}</Text>
          </View>
          <View style={styles.miniRestActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={restRemainingSeconds > 0 ? 'Zatrzymaj timer odpoczynku' : 'Rozpocznij 90-sekundowy odpoczynek'}
              onPress={() => setRestTimer(getRestTimerRemaining() > 0 ? 0 : DEFAULT_REST_SECONDS)}
              className="active:opacity-75"
              style={[
                styles.miniRestButton,
                restRemainingSeconds === 0 && styles.miniRestStartButton,
              ]}>
              <Text style={[
                styles.miniRestButtonText,
                restRemainingSeconds === 0 && styles.miniRestStartText,
              ]}>
                {restRemainingSeconds > 0 ? 'STOP' : '▶ SERIA'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dodaj 15 sekund odpoczynku"
              onPress={() => setRestTimer(getRestTimerRemaining() + 15)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 active:opacity-75"
              style={[styles.miniRestButton, styles.miniRestAddButton]}>
              <Text style={styles.miniRestButtonText}>+15s</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View pointerEvents="box-none" style={styles.footer}>
        {draftStorageError ? (
          <Text accessibilityRole="alert" className="mb-2 text-center text-xs leading-5 text-amber-200">{draftStorageError}</Text>
        ) : null}
        {saveError ? (
          <Text accessibilityRole="alert" className="mb-2 text-center text-xs leading-5 text-red-300">{saveError}</Text>
        ) : null}
        <WorkoutButton
          label={isSaving ? 'Zapisywanie…' : sessionExerciseNames.length > 0 && completedExercises === sessionExerciseNames.length ? 'Zakończ trening' : 'Zapisz trening'}
          onPress={finishWorkout}
          disabled={isSaving}
        />
      </View>
      </KeyboardAvoidingView>
      {selectedDetail && (
        <View className="absolute inset-0 bg-black/80" style={styles.detailOverlay}>
          <ExerciseDetailModal
            exercise={selectedDetail}
            sessions={sessions}
            onClose={() => setSelectedDetail(null)}
          />
        </View>
      )}
      {keypadTarget && (
        <View className="absolute inset-0 justify-end bg-black/75" style={styles.keypadOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zamknij klawiaturę bez zapisywania"
            onPress={() => setKeypadTarget(null)}
            style={StyleSheet.absoluteFill}
          />
          <View className="rounded-t-3xl border border-zinc-700 bg-zinc-900" style={styles.keypadSheet}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text style={styles.keypadEyebrow}>{sessionExerciseNames[keypadTarget.exerciseIndex]}</Text>
                <Text style={styles.keypadTitle}>
                  SERIA {String(keypadTarget.setIndex + 1).padStart(2, '0')} · {keypadTarget.field === 'weight' ? 'CIĘŻAR (KG)' : 'POWTÓRZENIA'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Anuluj edycję"
                onPress={() => setKeypadTarget(null)}
                className="h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 active:opacity-75">
                <Text style={styles.keypadClose}>×</Text>
              </Pressable>
            </View>
            <View className="mb-4 items-center justify-center rounded-2xl border border-lime-400/25 bg-zinc-950" style={styles.keypadDisplay}>
              <Text style={styles.keypadValue}>{keypadValue || '0'}</Text>
            </View>
            <View style={styles.keypadGrid}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => {
                const decimalDisabled = key === '.' && keypadTarget.field === 'reps';
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={key === '⌫' ? 'Usuń ostatnią cyfrę' : key === '.' ? 'Separator dziesiętny' : key}
                    disabled={decimalDisabled}
                    onPress={() => pressKey(key)}
                    className="items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 active:opacity-70"
                    style={[styles.keypadKey, decimalDisabled && styles.keypadKeyDisabled]}>
                    <Text style={styles.keypadKeyText}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zapisz wartość serii"
              onPress={saveKeypadValue}
              className="mt-4 min-h-14 items-center justify-center rounded-2xl bg-lime-400 active:opacity-80"
              style={styles.keypadSave}>
              <Text style={styles.keypadSaveText}>ZAPISZ WARTOŚĆ</Text>
            </Pressable>
          </View>
        </View>
      )}
    </WorkoutScreen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  title: {
    color: '#F5F7F2',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1.05,
    lineHeight: 39,
    marginTop: 5,
  },
  heroEyebrow: {
    gap: 8,
  },
  heroIndicator: {
    height: 7,
    width: 7,
  },
  heroEyebrowText: {
    color: '#AAB4A8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  sessionScrollContent: {
    paddingBottom: 176,
  },
  progressCard: {
    backgroundColor: 'rgba(17, 23, 19, 0.96)',
    borderColor: 'rgba(74, 222, 128, 0.2)',
    marginTop: 23,
    padding: 20,
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  progressTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCaption: {
    color: '#AAB4A8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.45,
  },
  progressCountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
  },
  progressCount: {
    color: workoutColors.text,
    fontSize: 31,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  progressTotal: {
    color: workoutColors.muted,
    fontSize: 19,
    fontWeight: '700',
  },
  progressUnit: {
    color: workoutColors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  timer: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.075)',
    borderColor: 'rgba(34, 197, 94, 0.19)',
    borderRadius: 17,
    borderWidth: 1,
    minWidth: 116,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  timerHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  timerCaption: {
    color: '#AAB4A8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timerText: {
    color: workoutColors.neon,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 5,
  },
  timerIndicator: {
    backgroundColor: workoutColors.neon,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  progressTrack: {
    backgroundColor: '#252D27',
    borderRadius: 99,
    height: 9,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: workoutColors.neon,
    borderRadius: 99,
    height: '100%',
  },
  exerciseHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginTop: 30,
    paddingHorizontal: 2,
  },
  exerciseHeadingActions: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  exerciseEyebrow: {
    color: '#899389',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.55,
    marginBottom: 4,
  },
  exerciseTitle: {
    color: workoutColors.text,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  exerciseCountBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  editExercisesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  editExercisesButtonText: {
    color: workoutColors.neon,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  editExercisesActions: {
    gap: 10,
    marginBottom: 14,
  },
  dragHint: {
    color: '#A3AEA3',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  addExerciseButton: {
    minHeight: 48,
  },
  addExerciseButtonText: {
    color: workoutColors.neon,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  exerciseLabel: {
    color: '#B3BDB2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: Platform.select({ web: '#111613', default: '#0E120F' }),
    borderColor: 'rgba(222, 243, 225, 0.105)',
    borderRadius: 23,
    padding: 0,
  },
  exerciseCardActive: {
    backgroundColor: Platform.select({ web: '#151D15', default: '#121B15' }),
    borderColor: Platform.select({ web: 'rgba(34, 197, 94, 0.58)', default: 'rgba(112, 165, 120, 0.30)' }),
    borderLeftWidth: Platform.select({ web: 2, default: 1 }),
  },
  exerciseCardCompleted: Platform.select({
    web: {
      backgroundColor: 'rgba(24, 54, 35, 0.88)',
      borderColor: 'rgba(74, 222, 128, 0.62)',
      borderLeftWidth: 3,
    },
    default: {
      backgroundColor: '#10271A',
      borderColor: 'rgba(117, 190, 132, 0.56)',
      borderWidth: 1,
      borderLeftWidth: 1,
    },
  }),
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 94,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  exerciseNumber: {
    alignItems: 'center',
    backgroundColor: '#1B241B',
    borderColor: 'rgba(34, 197, 94, 0.22)',
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    marginRight: 13,
    width: 46,
  },
  exerciseNumberActive: {
    backgroundColor: 'rgba(198,255,72,0.14)',
    borderColor: 'rgba(198,255,72,0.55)',
  },
  exerciseNumberText: {
    color: workoutColors.neon,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  exerciseNumberTextActive: {
    color: workoutColors.neon,
  },
  exerciseCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 11,
  },
  moveExerciseActions: {
    alignItems: 'center',
    gap: 5,
    marginLeft: 4,
  },
  moveExerciseButton: {
    height: 32,
    width: 34,
  },
  moveExerciseArrow: {
    color: workoutColors.neon,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  exerciseName: {
    color: workoutColors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.18,
    lineHeight: 21,
  },
  exerciseSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 8,
  },
  setDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  setDot: {
    backgroundColor: '#3B443D',
    borderRadius: 6,
    height: 8,
    width: 8,
  },
  setDotCompleted: Platform.select({
    web: { backgroundColor: workoutColors.mint },
    default: { backgroundColor: '#8CC99A' },
  }),
  exerciseSubtext: {
    color: '#A6B0A6',
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseCompletedLabel: {
    color: Platform.select({ web: '#83F3A0', default: '#A6D8AF' }),
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  expandButton: {
    alignItems: 'center',
    backgroundColor: '#1A201C',
    borderColor: 'rgba(237,247,239,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  expandButtonActive: {
    backgroundColor: 'rgba(198,255,72,0.13)',
    borderColor: 'rgba(198,255,72,0.38)',
  },
  expandArrow: {
    color: workoutColors.muted,
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 28,
  },
  expandArrowActive: {
    color: workoutColors.neon,
  },
  removeExerciseButton: {
    height: 38,
    marginLeft: 8,
    width: 38,
  },
  removeExerciseText: {
    color: '#FCA5A5',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    marginTop: -2,
  },
  setList: {
    borderTopColor: 'rgba(237,247,239,0.1)',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  setRow: {
    borderBottomColor: 'rgba(237,247,239,0.075)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingVertical: 12,
  },
  setRowLast: {
    borderBottomWidth: 0,
  },
  setName: {
    color: '#F0F4EE',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.75,
  },
  previousValue: {
    color: '#83F3C0',
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '700',
  },
  previousButton: {
    alignItems: 'flex-end',
    flexShrink: 1,
    marginLeft: 8,
  },
  setEditRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 7,
  },
  valueButton: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(7, 13, 9, 0.88)',
    borderColor: 'rgba(131, 243, 160, 0.14)',
    borderRadius: 15,
    borderWidth: 1,
    minHeight: 53,
    minWidth: 0,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  valueLabel: {
    color: '#94A092',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valueText: {
    color: workoutColors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    marginTop: 3,
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  statusButton: {
    alignItems: 'center',
    backgroundColor: '#080B09',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 7,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  statusButtonCompleted: {
    backgroundColor: 'rgba(131,243,192,0.15)',
    borderColor: 'rgba(131,243,192,0.6)',
  },
  statusButtonText: {
    color: workoutColors.muted,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  statusTextActive: {
    color: workoutColors.text,
  },
  deleteSetButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 36,
  },
  disabledDeleteSetButton: {
    opacity: 0.4,
  },
  deleteSetText: {
    color: '#FF8888',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  addSetButton: {
    alignItems: 'center',
    borderColor: 'rgba(198,255,72,0.28)',
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  addSetText: {
    color: workoutColors.neon,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  restCard: {
    gap: 16,
    marginTop: 16,
    padding: 18,
  },
  restHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  restHint: {
    color: '#96A397',
    flexShrink: 1,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.9,
    textAlign: 'right',
  },
  startSeriesButton: {
    alignItems: 'center',
    backgroundColor: workoutColors.neon,
    borderRadius: 17,
    elevation: 5,
    flex: 1,
    flexDirection: 'row',
    gap: 11,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 12,
  },
  stopRestButton: {
    backgroundColor: 'rgba(183, 243, 74, 0.13)',
    borderColor: 'rgba(183, 243, 74, 0.3)',
    borderWidth: 1,
    shadowOpacity: 0,
  },
  startSeriesIcon: {
    color: '#11160C',
    fontSize: 17,
    fontWeight: '900',
  },
  startSeriesText: {
    color: '#11160C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  stopRestText: {
    color: '#C7FF74',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  addRestTimeButton: {
    alignItems: 'center',
    borderColor: 'rgba(237, 247, 239, 0.15)',
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 62,
    paddingHorizontal: 10,
  },
  addRestTimeText: {
    color: '#C4D0C4',
    fontSize: 11,
    fontWeight: '800',
  },
  miniRestTimer: {
    alignItems: 'center',
    backgroundColor: 'rgba(17,23,19,0.97)',
    borderColor: 'rgba(131, 243, 160, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 101,
    elevation: 14,
    flexDirection: 'row',
    gap: 12,
    left: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'absolute',
    right: 14,
    zIndex: 15,
  },
  miniRestEyebrow: {
    color: '#9BA69A',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  miniRestTime: {
    color: workoutColors.neon,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    marginTop: 2,
  },
  miniRestActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  miniRestButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(183, 243, 74, 0.13)',
    borderColor: 'rgba(183, 243, 74, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 39,
    minWidth: 82,
    paddingHorizontal: 10,
  },
  miniRestStartButton: {
    backgroundColor: workoutColors.neon,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  miniRestAddButton: {
    backgroundColor: 'rgba(7, 13, 9, 0.88)',
    borderColor: 'rgba(237, 247, 239, 0.15)',
    minWidth: 50,
  },
  miniRestButtonText: {
    color: '#C7FF74',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  miniRestStartText: {
    color: '#11160C',
  },
  restEyebrow: {
    color: '#9BA69A',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  restTime: {
    color: workoutColors.text,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    marginTop: 4,
  },
  restActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  notesSection: {
    marginTop: 24,
  },
  notesInput: {
    borderColor: workoutColors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: workoutColors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 11,
    minHeight: 108,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  detailOverlay: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    bottom: 0,
    elevation: 30,
    left: 0,
    padding: 8,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  keypadOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.76)',
    bottom: 0,
    elevation: 40,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  keypadSheet: {
    alignSelf: 'stretch',
    borderColor: 'rgba(237,247,239,0.16)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    maxWidth: 560,
    paddingHorizontal: 20,
    paddingTop: 21,
    paddingBottom: 18,
    width: '100%',
  },
  keypadEyebrow: {
    color: '#A9B3A7',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    maxWidth: 235,
  },
  keypadTitle: {
    color: workoutColors.neon,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.75,
    marginTop: 5,
  },
  keypadClose: {
    color: workoutColors.text,
    fontSize: 24,
    lineHeight: 27,
  },
  keypadDisplay: {
    borderColor: 'rgba(198,255,72,0.3)',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 66,
  },
  keypadValue: {
    color: workoutColors.text,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  keypadKey: {
    alignItems: 'center',
    borderColor: 'rgba(237,247,239,0.12)',
    borderRadius: 13,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 49,
  },
  keypadKeyDisabled: {
    opacity: 0.35,
  },
  keypadKeyText: {
    color: workoutColors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  keypadSave: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  keypadSaveText: {
    color: '#11160C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  footer: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
    position: 'absolute',
    right: 0,
    width: '100%',
    zIndex: 20,
  },
  missingPlan: {
    padding: 22,
  },
  missingTitle: {
    color: workoutColors.text,
    fontSize: 23,
    fontWeight: '800',
  },
  missingButton: {
    marginTop: 24,
  },
});
