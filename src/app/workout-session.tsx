import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExerciseDetailModal } from '@/components/exercise-detail-modal';
import { MuscleVolumePanel } from '@/components/muscle-volume-panel';
import { WorkoutCard, WorkoutHeader, WorkoutScreen, WorkoutButton, workoutColors, workoutStyles } from '@/components/workout-ui';
import { exerciseLibrary, Exercise } from '@/constants/exercise-library';
import { WorkoutExerciseConfig, WorkoutPlan, useGymApp } from '@/hooks/use-gym-app';
import { AnalysisPeriod, calculateMuscleVolume, ExperienceLevel, getLocalWeekKey, VolumeExercise } from '@/lib/muscle-volume';

const DEFAULT_SETS_PER_EXERCISE = 3;
const DEFAULT_REST_SECONDS = 90;
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

function confirmWorkoutExit(onConfirm: () => void) {
  const message = 'Czy na pewno chcesz wyjść i usunąć progres treningu?';
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
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
  const navigation = useNavigation();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { plans, sessions, recordSession } = useGymApp();
  const plan = plans.find((item) => item.id === planId);
  const [draftsByPlan, setDraftsByPlan] = useState<Record<string, SessionDraft>>({});
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisWeekKey, setAnalysisWeekKey] = useState('1970-01-01');
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [restCardBottom, setRestCardBottom] = useState(Number.POSITIVE_INFINITY);
  const [selectedDetail, setSelectedDetail] = useState<Exercise | null>(null);
  const [keypadTarget, setKeypadTarget] = useState<KeypadTarget | null>(null);
  const [keypadValue, setKeypadValue] = useState('');
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('session');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const allowExitRef = useRef(false);
  const savingRef = useRef(false);
  const activePlan = plan ?? EMPTY_PLAN;
  const initialDraft = useMemo(
    () => createSessionDraft(activePlan),
    [activePlan],
  );

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (!plan || allowExitRef.current) return;

    event.preventDefault();
    const leaveWorkout = () => {
      allowExitRef.current = true;
      navigation.dispatch(event.data.action);
    };
    confirmWorkoutExit(leaveWorkout);
  }), [navigation, plan]);

  useEffect(() => {
    startedAt.current = Date.now();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const timer = setInterval(() => {
      const now = Date.now();
      if (startedAt.current !== null) {
        setElapsedSeconds(Math.floor((now - startedAt.current) / 1000));
      }
      const weekKey = getLocalWeekKey(now, timeZone);
      setAnalysisWeekKey((current) => current === weekKey ? current : weekKey);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRestRemainingSeconds((current) => current > 0 ? current - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const draft = draftsByPlan[activePlan.id] ?? initialDraft;
  const { exerciseConfigs, setStatuses, notes } = draft;
  const setCounts = exerciseConfigs.map((config) => config.sets.length);
  const uniqueSetCounts = new Set(setCounts);
  const setSummaryLabel = uniqueSetCounts.size === 1
    ? `${setCounts[0] ?? DEFAULT_SETS_PER_EXERCISE} SERIE / ĆW.`
    : 'SERIE WG PLANU';
  const completedExercises = setStatuses.filter(
    (statuses) => statuses.length > 0 && statuses.every((status) => status !== 'pending'),
  ).length;
  const progress = activePlan.exercises.length > 0
    ? (completedExercises / activePlan.exercises.length) * 100
    : 0;
  const showMiniRestTimer = scrollOffset >= restCardBottom;

  const volumeExercises = useMemo<VolumeExercise[]>(() => exerciseConfigs.map((config, exerciseIndex) => ({
    exerciseId: config.exerciseId ?? exerciseLibrary.find((exercise) => exercise.name === config.name)?.id,
    name: config.name,
    sets: config.sets.map((set, setIndex) => ({
      status: setStatuses[exerciseIndex]?.[setIndex] ?? 'pending',
      reps: set.reps,
    })),
  })), [exerciseConfigs, setStatuses]);
  const projectedExercises = useMemo<VolumeExercise[]>(() => volumeExercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map(() => ({ status: 'completed' as const })),
  })), [volumeExercises]);
  const historicalSessions = useMemo(() => sessions.map((session) => ({
    completedAt: session.completedAt,
    exercisePerformance: session.exercisePerformance?.map((exercise) => ({
      exerciseId: exercise.exerciseId ?? exerciseLibrary.find((item) => item.name === exercise.name)?.id,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({ ...set, completed: true })),
    })),
  })), [sessions]);
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const muscleVolumes = useMemo(() => calculateMuscleVolume({
    exercises: volumeExercises,
    sessions: historicalSessions,
    period: analysisPeriod,
    weekKey: analysisWeekKey,
    timeZone: localTimeZone,
    level: experienceLevel,
  }), [volumeExercises, historicalSessions, analysisPeriod, analysisWeekKey, localTimeZone, experienceLevel]);
  const projectedMuscleVolumes = useMemo(() => calculateMuscleVolume({
    exercises: projectedExercises,
    sessions: historicalSessions,
    period: analysisPeriod,
    weekKey: analysisWeekKey,
    timeZone: localTimeZone,
    level: experienceLevel,
  }), [projectedExercises, historicalSessions, analysisPeriod, analysisWeekKey, localTimeZone, experienceLevel]);

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

  function updateDraft(updater: (current: SessionDraft) => SessionDraft) {
    setDraftsByPlan((current) => ({
      ...current,
      [activePlan.id]: updater(current[activePlan.id] ?? initialDraft),
    }));
  }

  function toggleSetCompleted(exerciseIndex: number, setIndex: number) {
    const isCompleted = setStatuses[exerciseIndex]?.[setIndex] === 'completed';
    updateDraft((current) => {
      const statuses = current.setStatuses.map((exercise) => [...exercise]);
      statuses[exerciseIndex][setIndex] = isCompleted ? 'pending' : 'completed';
      return { ...current, setStatuses: statuses };
    });
    if (!isCompleted) setRestRemainingSeconds(DEFAULT_REST_SECONDS);
  }

  function toggleExercise(index: number) {
    setExpandedExerciseIndex((current) => current === index ? null : index);
  }

  function openExerciseDetails(exerciseIndex: number) {
    const config = exerciseConfigs[exerciseIndex];
    const exercise = exerciseLibrary.find((item) =>
      item.id === config?.exerciseId || item.name === activePlan.exercises[exerciseIndex])
      ?? exerciseLibrary.find((item) => item.id === exerciseAliases[activePlan.exercises[exerciseIndex]]);
    setSelectedDetail(exercise ?? {
      id: config?.exerciseId ?? `custom-${exerciseIndex}`,
      name: activePlan.exercises[exerciseIndex],
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
        activePlan,
        completedExercises,
        Math.max(1, Math.round(elapsedSeconds / 60)),
        exercisePerformance,
        notes,
      );
      allowExitRef.current = true;
      router.replace('/training');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać treningu.';
      setSaveError(message);
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Błąd zapisu', message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  function requestWorkoutExit() {
    confirmWorkoutExit(() => {
      allowExitRef.current = true;
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/workout-flow');
      }
    });
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
          style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View className="min-w-0 flex-1 shrink" style={styles.progressCopy}>
              <Text style={styles.progressCaption}>POSTĘP TRENINGU</Text>
              <View className="w-full min-w-0 flex-row flex-wrap items-baseline" style={styles.progressCountRow}>
                <Text className="shrink" style={styles.progressCount} maxFontSizeMultiplier={1.15}>
                  {completedExercises}
                  <Text style={styles.progressTotal}> / {activePlan.exercises.length}</Text>
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
            style={styles.restCard}>
            <View className="min-w-0 flex-1">
              <Text style={styles.restEyebrow}>ODPOCZYNEK MIĘDZY SERIAMI</Text>
              <Text style={styles.restTime}>{restRemainingSeconds > 0 ? formatElapsed(restRemainingSeconds) : 'Gotowy'}</Text>
            </View>
            <View style={styles.restActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={restRemainingSeconds > 0 ? 'Zatrzymaj timer odpoczynku' : 'Rozpocznij 90-sekundowy odpoczynek'}
                onPress={() => setRestRemainingSeconds((current) => current > 0 ? 0 : DEFAULT_REST_SECONDS)}
                className="rounded-xl bg-lime-400/10 active:opacity-75"
                style={styles.restButton}>
                <Text style={styles.restButtonText}>{restRemainingSeconds > 0 ? 'STOP' : 'START'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dodaj 15 sekund odpoczynku"
                onPress={() => setRestRemainingSeconds((current) => current + 15)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 active:opacity-75"
                style={styles.restButton}>
                <Text style={styles.restButtonText}>+15s</Text>
              </Pressable>
            </View>
          </WorkoutCard>
        </View>

        <MuscleVolumePanel
          volumes={muscleVolumes}
          projectedVolumes={projectedMuscleVolumes}
          period={analysisPeriod}
          onPeriodChange={setAnalysisPeriod}
          level={experienceLevel}
          onLevelChange={setExperienceLevel}
        />

        <View className="w-full min-w-0 flex-row items-center justify-between" style={styles.exerciseHeading}>
          <View className="min-w-0 flex-1 shrink">
            <Text style={styles.exerciseEyebrow}>PLAN SESJI</Text>
            <Text className="min-w-0 shrink" style={styles.exerciseTitle} numberOfLines={1} ellipsizeMode="tail">Ćwiczenia</Text>
          </View>
          <View className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900" style={styles.exerciseCountBadge}>
            <Text style={styles.exerciseLabel}>{activePlan.exercises.length} ĆW. · {setSummaryLabel}</Text>
          </View>
        </View>
        <View className="w-full min-w-0" style={styles.exerciseList}>
          {activePlan.exercises.map((exercise, index) => {
            const exerciseConfig = exerciseConfigs[index];
            const exerciseStatuses = setStatuses[index] ?? [];
            const isExpanded = expandedExerciseIndex === index;
            return (
              <WorkoutCard
                key={`${activePlan.id}-${index}`}
                className="rounded-3xl border border-zinc-800/80 bg-zinc-900/80"
                style={[styles.exerciseCard, isExpanded && styles.exerciseCardActive]}>
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
                    accessibilityLabel={`Pokaż szczegóły ćwiczenia ${exercise}`}
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
                        {exerciseStatuses.filter((status) => status !== 'pending').length}/{exerciseStatuses.length} serie
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${exercise}, ${isExpanded ? 'zwiń' : 'rozwiń'} serie`}
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => toggleExercise(index)}
                    className="shrink-0 active:opacity-75"
                    style={[styles.expandButton, isExpanded && styles.expandButtonActive]}>
                    <Text style={[styles.expandArrow, isExpanded && styles.expandArrowActive]}>
                      {isExpanded ? '−' : '+'}
                    </Text>
                  </Pressable>
                </View>
                {isExpanded && (
                  <View style={styles.setList}>
                    {exerciseStatuses.map((status, setIndex) => (
                      <View
                        key={`${exercise}-set-${setIndex}`}
                        style={[styles.setRow, setIndex === exerciseStatuses.length - 1 && styles.setRowLast]}>
                        <View className="min-w-0 flex-row items-center justify-between">
                          <Text style={styles.setName}>SERIA {String(setIndex + 1).padStart(2, '0')}</Text>
                          <Text style={styles.previousValue} numberOfLines={1}>
                            PREV · {exerciseConfig?.sets[setIndex]?.previous || '—'}
                          </Text>
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
                      </View>
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Dodaj serię do ${exercise}`}
                      onPress={() => addSet(index)}
                      className="mb-3 mt-2 min-h-12 flex-row items-center justify-center rounded-xl border border-lime-400/25 bg-lime-400/5 active:opacity-75"
                      style={styles.addSetButton}>
                      <Text style={styles.addSetText}>＋ DODAJ SERIĘ</Text>
                    </Pressable>
                  </View>
                )}
              </WorkoutCard>
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
        <View className="flex-row items-center justify-between rounded-2xl border border-lime-400/30 bg-zinc-900/95" style={styles.miniRestTimer}>
          <View className="min-w-0 flex-1">
            <Text style={styles.miniRestEyebrow}>ODPOCZYNEK</Text>
            <Text style={styles.miniRestTime}>{restRemainingSeconds > 0 ? formatElapsed(restRemainingSeconds) : 'Gotowy'}</Text>
          </View>
          <View style={styles.miniRestActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={restRemainingSeconds > 0 ? 'Zatrzymaj timer odpoczynku' : 'Rozpocznij 90-sekundowy odpoczynek'}
              onPress={() => setRestRemainingSeconds((current) => current > 0 ? 0 : DEFAULT_REST_SECONDS)}
              className="rounded-xl bg-lime-400/10 active:opacity-75"
              style={styles.miniRestButton}>
              <Text style={styles.restButtonText}>{restRemainingSeconds > 0 ? 'STOP' : 'START'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dodaj 15 sekund odpoczynku"
              onPress={() => setRestRemainingSeconds((current) => current + 15)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 active:opacity-75"
              style={styles.miniRestButton}>
              <Text style={styles.restButtonText}>+15s</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View className="w-full border-t border-zinc-800/80 bg-zinc-950/95" style={styles.footer}>
        {saveError ? (
          <Text accessibilityRole="alert" className="mb-2 text-center text-xs leading-5 text-red-300">{saveError}</Text>
        ) : null}
        <WorkoutButton
          label={isSaving ? 'Zapisywanie…' : completedExercises === activePlan.exercises.length ? 'Zakończ trening' : 'Zapisz trening'}
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
                <Text style={styles.keypadEyebrow}>{activePlan.exercises[keypadTarget.exerciseIndex]}</Text>
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
    backgroundColor: '#111713',
    borderColor: 'rgba(34, 197, 94, 0.2)',
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
    backgroundColor: '#111613',
    borderColor: 'rgba(222, 243, 225, 0.105)',
    borderRadius: 23,
    padding: 0,
  },
  exerciseCardActive: {
    backgroundColor: '#151D15',
    borderColor: 'rgba(34, 197, 94, 0.58)',
    borderLeftWidth: 2,
  },
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
  setDotCompleted: {
    backgroundColor: workoutColors.mint,
  },
  exerciseSubtext: {
    color: '#A6B0A6',
    fontSize: 11,
    fontWeight: '700',
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
    color: '#8E9A8D',
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 10,
  },
  setEditRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 7,
  },
  valueButton: {
    alignItems: 'flex-start',
    borderColor: 'rgba(237,247,239,0.13)',
    borderRadius: 12,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
    padding: 16,
  },
  miniRestTimer: {
    alignItems: 'center',
    backgroundColor: 'rgba(17,23,19,0.97)',
    borderColor: 'rgba(198,255,72,0.3)',
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
    borderColor: 'rgba(237,247,239,0.13)',
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 39,
    minWidth: 50,
    paddingHorizontal: 8,
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
  restButton: {
    alignItems: 'center',
    borderColor: 'rgba(237,247,239,0.13)',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 54,
    paddingHorizontal: 9,
  },
  restButtonText: {
    color: workoutColors.neon,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
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
    backgroundColor: 'rgba(8, 11, 9, 0.96)',
    bottom: 0,
    elevation: 12,
    left: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 15,
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
