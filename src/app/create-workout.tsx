import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ExerciseDetailModal } from '@/components/exercise-detail-modal';
import { ExercisePickerModal } from '@/components/exercise-picker-modal';
import { WorkoutButton, WorkoutCard, WorkoutHeader, WorkoutScreen, workoutColors, workoutStyles } from '@/components/workout-ui';
import { Exercise, exerciseLibrary } from '@/constants/exercise-library';
import { WorkoutExerciseConfig, WorkoutPlan, useGymApp } from '@/hooks/use-gym-app';

const DEFAULT_SET_COUNT = 3;

function createSets(count = DEFAULT_SET_COUNT): WorkoutExerciseConfig['sets'] {
  return Array.from({ length: count }, () => ({ weight: '', reps: '', previous: '—' }));
}

export default function CreateWorkoutScreen() {
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { plans, plansLoading, plansError, reloadPlans } = useGymApp();
  const existingPlan = plans.find((plan) => plan.id === planId);

  if (planId && plansLoading) {
    return (
      <WorkoutScreen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color={workoutColors.neon} />
          <Text className="text-sm text-white/60">Wczytywanie Twojego planu…</Text>
        </View>
      </WorkoutScreen>
    );
  }

  if (planId && plansError && !existingPlan) {
    return (
      <WorkoutScreen>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-bold text-white">Nie udało się wczytać planu.</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-white/55">{plansError}</Text>
          <Pressable onPress={() => { void reloadPlans(); }} className="mt-5 rounded-2xl bg-neon px-5 py-3">
            <Text className="font-bold text-[#07110A]">Spróbuj ponownie</Text>
          </Pressable>
        </View>
      </WorkoutScreen>
    );
  }

  return <CreateWorkoutForm key={planId ?? 'new'} existingPlan={existingPlan} />;
}

function CreateWorkoutForm({ existingPlan }: { existingPlan?: WorkoutPlan }) {
  const router = useRouter();
  const { sessions, addPlan, updatePlan } = useGymApp();

  function getPreviousPerformance(exerciseName: string, setIndex: number) {
    const previousConfig = sessions.find((session) =>
      session.exercisePerformance?.some((exercise) => exercise.name === exerciseName))
      ?.exercisePerformance?.find((exercise) => exercise.name === exerciseName);
    const previousSet = previousConfig?.sets[setIndex];
    if (!previousSet) return '—';
    const values = [previousSet.weight && `${previousSet.weight}`, previousSet.reps && `${previousSet.reps}`].filter(Boolean);
    return values.length > 0 ? values.join(' x ') : '—';
  }

  function createConfig(name: string, exerciseId?: string): WorkoutExerciseConfig {
    return {
      name,
      exerciseId,
      sets: createSets().map((set, index) => ({ ...set, previous: getPreviousPerformance(name, index) })),
    };
  }

  function normalizeConfig(config: WorkoutExerciseConfig): WorkoutExerciseConfig {
    return {
      name: config.name,
      exerciseId: config.exerciseId ?? exerciseLibrary.find((exercise) => exercise.name === config.name)?.id,
      sets: config.sets.length > 0
        ? config.sets.map((set, index) => ({
          weight: set.weight,
          reps: set.reps,
          previous: set.previous && set.previous !== '—' ? set.previous : getPreviousPerformance(config.name, index),
        }))
        : createSets(1),
    };
  }

  const [name, setName] = useState(existingPlan?.name ?? '');
  const [focus, setFocus] = useState(existingPlan?.focus ?? '');
  const [exerciseConfigs, setExerciseConfigs] = useState<WorkoutExerciseConfig[]>(() => {
    if (existingPlan?.exerciseConfigs) return existingPlan.exerciseConfigs.map(normalizeConfig);
    return (existingPlan?.exercises ?? []).map((name) =>
      createConfig(name, exerciseLibrary.find((exercise) => exercise.name === name)?.id));
  });
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<Exercise | null>(null);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const exerciseNames = useMemo(() => exerciseConfigs.map((config) => config.name), [exerciseConfigs]);
  const canSave = name.trim().length > 0 && exerciseConfigs.length > 0;

  function addExercise(exercise: Exercise) {
    if (exerciseNames.includes(exercise.name)) return;
    setExerciseConfigs((current) => [...current, createConfig(exercise.name, exercise.id)]);
    setRecentExerciseIds((current) => [exercise.id, ...current.filter((id) => id !== exercise.id)].slice(0, 5));
    setPickerVisible(false);
  }

  function updateSet(exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) {
    const numericValue = value.replace(',', '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    setExerciseConfigs((current) => current.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, currentSetIndex) =>
          currentSetIndex === setIndex ? { ...set, [field]: numericValue } : set),
      };
    }));
  }

  function addSet(exerciseIndex: number) {
    setExerciseConfigs((current) => current.map((exercise, index) =>
      index === exerciseIndex
        ? { ...exercise, sets: [...exercise.sets, { weight: '', reps: '', previous: getPreviousPerformance(exercise.name, exercise.sets.length) }] }
        : exercise));
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExerciseConfigs((current) => current.map((exercise, index) => {
      if (index !== exerciseIndex || exercise.sets.length <= 1) return exercise;
      return { ...exercise, sets: exercise.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex) };
    }));
  }

  function removeExercise(exerciseIndex: number) {
    setExerciseConfigs((current) => current.filter((_, index) => index !== exerciseIndex));
  }

  async function savePlan() {
    if (!canSave || isSaving) return;
    setSaveError(null);
    const plan = {
      name: name.trim(),
      focus: focus.trim() || 'Trening własny',
      duration: Math.max(10, exerciseConfigs.length * 10),
      exercises: exerciseNames,
      exerciseConfigs,
      source: 'created' as const,
    };
    setIsSaving(true);
    try {
      if (existingPlan) {
        await updatePlan(existingPlan.id, plan);
      } else {
        await addPlan(plan);
      }
      router.replace('/workout-flow');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Nie udało się zapisać planu.');
    } finally {
      setIsSaving(false);
    }
  }

  if (selectedDetail) {
    return (
      <WorkoutScreen>
        <ExerciseDetailModal exercise={selectedDetail} sessions={sessions} onClose={() => setSelectedDetail(null)} />
      </WorkoutScreen>
    );
  }

  if (isPickerVisible) {
    return (
      <WorkoutScreen>
        <ExercisePickerModal
          selectedExerciseIds={exerciseConfigs
            .map((item) => item.exerciseId ?? exerciseLibrary.find((exercise) => exercise.name === item.name)?.id)
            .filter((id): id is string => Boolean(id))}
          recentExerciseIds={recentExerciseIds}
          customExercises={customExercises}
          onClose={() => setPickerVisible(false)}
          onSelect={addExercise}
          onAddCustomExercise={(exercise) => setCustomExercises((current) => [exercise, ...current])}
          onShowDetails={(exercise) => {
            setPickerVisible(false);
            setSelectedDetail(exercise);
          }}
        />
      </WorkoutScreen>
    );
  }

  return (
    <WorkoutScreen>
      <WorkoutHeader eyebrow={existingPlan ? 'EDYCJA PLANU' : 'NOWY PLAN'} onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <ScrollView
          className="min-w-0 flex-1"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <View className="mb-2 flex-row items-center" style={styles.eyebrowRow}>
              <View className="rounded-full bg-lime-400" style={styles.eyebrowDot} />
              <Text style={workoutStyles.sectionLabel}>TRENING SKROJONY POD CIEBIE</Text>
            </View>
            <Text className="w-full min-w-0 shrink" style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {existingPlan ? 'Dopracuj swój plan.' : 'Zbuduj swój plan.'}
            </Text>
            <Text className="w-full min-w-0 shrink" style={styles.subtitle}>
              Ułóż własną kolejność, ustaw serie i wróć do planu, kiedy chcesz.
            </Text>
          </View>

          <WorkoutCard className="rounded-3xl border border-zinc-800/80 bg-zinc-900/70" style={styles.routineCard}>
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-1">
                <Text style={styles.fieldEyebrow}>01 · TOŻSAMOŚĆ PLANU</Text>
                <Text style={styles.cardTitle}>Nazwij swoją sesję</Text>
              </View>
              <View className="rounded-xl bg-lime-400/10 px-3 py-2">
                <Text style={styles.planBadge}>WŁASNY PLAN</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>NAZWA PLANU</Text>
            <TextInput
              accessibilityLabel="Nazwa planu"
              value={name}
              onChangeText={setName}
              placeholder="np. Klata · siła"
              placeholderTextColor="#697469"
              selectionColor={workoutColors.neon}
              returnKeyType="next"
              maxLength={48}
              className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-zinc-100"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>GRUPA MIĘŚNIOWA / OPIS</Text>
            <TextInput
              accessibilityLabel="Cel treningu"
              value={focus}
              onChangeText={setFocus}
              placeholder="np. Klatka · barki · triceps"
              placeholderTextColor="#697469"
              selectionColor={workoutColors.neon}
              returnKeyType="done"
              maxLength={64}
              className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-zinc-100"
              style={styles.input}
            />
          </WorkoutCard>

          <View className="mt-8 flex-row items-end justify-between" style={styles.exerciseSectionHeader}>
            <View className="min-w-0 flex-1">
              <Text style={styles.fieldEyebrow}>02 · TWOJA ROZPISKA</Text>
              <Text style={styles.sectionTitle}>Ćwiczenia</Text>
            </View>
            <View className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2">
              <Text style={styles.exerciseCount}>{exerciseConfigs.length} POZYCJI</Text>
            </View>
          </View>

          {exerciseConfigs.length > 0 ? (
            <View className="min-w-0" style={styles.exerciseList}>
              {exerciseConfigs.map((exercise, exerciseIndex) => (
                <WorkoutCard
                  key={`${exercise.name}-${exerciseIndex}`}
                  className="rounded-3xl border border-zinc-800/80 bg-zinc-900/80"
                  style={styles.exerciseCard}>
                  <View className="flex-row items-center">
                    <View className="mr-3 items-center justify-center rounded-2xl bg-lime-400/10" style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>{String(exerciseIndex + 1).padStart(2, '0')}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Szczegóły: ${exercise.name}`}
                      onPress={() => setSelectedDetail(exerciseLibrary.find((item) => item.id === exercise.exerciseId || item.name === exercise.name) ?? {
                        id: `custom-detail-${exerciseIndex}`,
                        name: exercise.name,
                        category: 'Core',
                        equipment: 'Własne ćwiczenie',
                        level: 'Własne',
                        image: '',
                        description: `Własne ćwiczenie: ${exercise.name}.`,
                        steps: ['Ustaw stabilną pozycję i przygotuj sprzęt.', 'Wykonuj ruch w kontrolowanym zakresie.', 'Wróć spokojnie do pozycji początkowej.'],
                        primaryMuscles: ['Do uzupełnienia'],
                        secondaryMuscles: [],
                      })}
                      className="min-w-0 flex-1 active:opacity-75">
                      <Text className="min-w-0 shrink" style={styles.exerciseName} numberOfLines={2} ellipsizeMode="tail">{exercise.name}</Text>
                      <Text style={styles.exerciseSubtext}>{exercise.sets.length} SERIE · DOTKNIJ, ABY ZOBACZYĆ TECHNIKĘ</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Usuń ćwiczenie ${exercise.name}`}
                      onPress={() => removeExercise(exerciseIndex)}
                      className="items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 active:opacity-70"
                      style={styles.removeExerciseButton}>
                      <Text style={styles.removeExerciseText}>×</Text>
                    </Pressable>
                  </View>

                  <View className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/70" style={styles.setTable}>
                    <View className="flex-row items-center" style={styles.tableHeader}>
                      <Text style={[styles.columnLabel, styles.setColumn]}>SERIA</Text>
                      <Text style={[styles.columnLabel, styles.previousColumn]}>POPRZEDNIO</Text>
                      <Text style={[styles.columnLabel, styles.inputColumn]}>KG</Text>
                      <Text style={[styles.columnLabel, styles.inputColumn]}>POWT.</Text>
                      <View style={styles.removeColumn} />
                    </View>
                    {exercise.sets.map((set, setIndex) => (
                      <View key={`${exercise.name}-set-${setIndex}`} className="flex-row items-center" style={[styles.setRow, setIndex === exercise.sets.length - 1 && styles.setRowLast]}>
                        <Text style={[styles.setNumber, styles.setColumn]}>{String(setIndex + 1).padStart(2, '0')}</Text>
                        <Text className="min-w-0 shrink" style={[styles.previousText, styles.previousColumn]} numberOfLines={1}>{set.previous || '—'}</Text>
                        <TextInput
                          accessibilityLabel={`Ciężar ćwiczenia ${exercise.name}, seria ${setIndex + 1}`}
                          value={set.weight}
                          onChangeText={(value) => updateSet(exerciseIndex, setIndex, 'weight', value)}
                          placeholder="—"
                          placeholderTextColor="#778176"
                          selectionColor={workoutColors.neon}
                          keyboardType="decimal-pad"
                          returnKeyType="next"
                          maxLength={6}
                          className="rounded-xl border border-zinc-700 bg-zinc-900 text-center text-zinc-100"
                          style={[styles.setInput, styles.inputColumn]}
                        />
                        <TextInput
                          accessibilityLabel={`Powtórzenia ćwiczenia ${exercise.name}, seria ${setIndex + 1}`}
                          value={set.reps}
                          onChangeText={(value) => updateSet(exerciseIndex, setIndex, 'reps', value)}
                          placeholder="—"
                          placeholderTextColor="#778176"
                          selectionColor={workoutColors.neon}
                          keyboardType="number-pad"
                          returnKeyType="done"
                          maxLength={4}
                          className="rounded-xl border border-zinc-700 bg-zinc-900 text-center text-zinc-100"
                          style={[styles.setInput, styles.inputColumn]}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Usuń serię ${setIndex + 1} z ćwiczenia ${exercise.name}`}
                          accessibilityState={{ disabled: exercise.sets.length <= 1 }}
                          disabled={exercise.sets.length <= 1}
                          onPress={() => removeSet(exerciseIndex, setIndex)}
                          className="items-center justify-center rounded-lg bg-red-400/10 disabled:opacity-30 active:opacity-70"
                          style={styles.removeSetButton}>
                          <Text style={styles.removeSetText}>−</Text>
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Dodaj serię do ${exercise.name}`}
                      onPress={() => addSet(exerciseIndex)}
                      className="flex-row items-center justify-center rounded-xl border border-dashed border-lime-400/25 bg-lime-400/5 active:opacity-70"
                      style={styles.addSetButton}>
                      <Text style={styles.addSetText}>+</Text>
                      <Text style={styles.addSetLabel}>DODAJ SERIĘ</Text>
                    </Pressable>
                  </View>
                </WorkoutCard>
              ))}
            </View>
          ) : (
            <View className="items-center rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/50 px-5 py-8" style={styles.emptyExercises}>
              <View className="items-center justify-center rounded-2xl bg-lime-400/10" style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>+</Text>
              </View>
              <Text style={styles.emptyTitle}>Zacznij od ćwiczeń</Text>
              <Text style={styles.emptyDescription}>Dodaj ruchy do rozpiski, a następnie ustaw liczbę serii, ciężar i powtórzenia.</Text>
            </View>
          )}
          <View style={styles.bottomSpace} />
        </ScrollView>

        <View className="border-t border-zinc-800/80 bg-zinc-950/95" style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerVisible(true)}
            disabled={isSaving}
            className="mb-2 flex-row items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 active:opacity-75"
            style={styles.addExerciseButton}>
            <Text style={styles.addExerciseIcon}>+</Text>
            <Text style={styles.addExerciseText}>DODAJ ĆWICZENIE</Text>
          </Pressable>
          <WorkoutButton
            label={isSaving ? 'Zapisywanie…' : existingPlan ? 'Zapisz zmiany' : 'Zapisz plan'}
            onPress={() => { void savePlan(); }}
            disabled={!canSave || isSaving}
          />
          {saveError ? (
            <Text accessibilityRole="alert" className="mt-2 text-center text-xs leading-5 text-red-300">
              {saveError}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

    </WorkoutScreen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 172 },
  intro: { marginBottom: 23 },
  eyebrowRow: { gap: 8 },
  eyebrowDot: { height: 7, width: 7 },
  title: { color: workoutColors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1, lineHeight: 38 },
  subtitle: { color: '#A1ABA0', fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 430 },
  routineCard: { padding: 17 },
  fieldEyebrow: { color: '#8F9A8E', fontSize: 8, fontWeight: '800', letterSpacing: 1.25 },
  cardTitle: { color: workoutColors.text, fontSize: 15, fontWeight: '800', marginTop: 5 },
  planBadge: { color: workoutColors.neon, fontSize: 8, fontWeight: '800', letterSpacing: 0.65 },
  fieldLabel: { color: '#A0AA9F', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8, marginTop: 19 },
  input: { color: workoutColors.text, fontSize: 14, height: 53, paddingVertical: 0 },
  exerciseSectionHeader: { alignItems: 'flex-end', marginBottom: 14 },
  sectionTitle: { color: workoutColors.text, fontSize: 23, fontWeight: '900', letterSpacing: -0.55, marginTop: 4 },
  exerciseCount: { color: '#ADB7AC', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  exerciseList: { gap: 13 },
  exerciseCard: { backgroundColor: '#111713', borderColor: 'rgba(237,247,239,0.105)', padding: 14 },
  exerciseNumber: { height: 42, width: 42 },
  exerciseNumberText: { color: workoutColors.neon, fontSize: 11, fontWeight: '900' },
  exerciseName: { color: workoutColors.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.15 },
  exerciseSubtext: { color: '#879287', fontSize: 7, fontWeight: '700', letterSpacing: 0.65, marginTop: 5 },
  removeExerciseButton: { height: 35, marginLeft: 7, width: 35 },
  removeExerciseText: { color: '#FF8585', fontSize: 23, fontWeight: '500', lineHeight: 27, marginTop: -2 },
  setTable: { padding: 8 },
  tableHeader: { alignItems: 'center', minHeight: 24, paddingHorizontal: 2 },
  columnLabel: { color: '#818C81', fontSize: 7, fontWeight: '800', letterSpacing: 0.55, textAlign: 'center' },
  setColumn: { width: 32 },
  previousColumn: { flex: 1, minWidth: 45 },
  inputColumn: { width: 53 },
  removeColumn: { width: 30 },
  setRow: { alignItems: 'center', borderBottomColor: 'rgba(237,247,239,0.07)', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 49, paddingVertical: 5 },
  setRowLast: { borderBottomWidth: 0 },
  setNumber: { color: workoutColors.neon, fontSize: 10, fontVariant: ['tabular-nums'], fontWeight: '800', textAlign: 'center' },
  previousText: { color: '#A0AA9F', fontSize: 10, fontVariant: ['tabular-nums'], textAlign: 'center' },
  setInput: { color: workoutColors.text, fontSize: 11, fontVariant: ['tabular-nums'], height: 36, marginHorizontal: 2, paddingHorizontal: 3, paddingVertical: 0 },
  removeSetButton: { height: 30, marginLeft: 3, width: 27 },
  removeSetText: { color: '#FF8585', fontSize: 20, fontWeight: '600', lineHeight: 24, marginTop: -2 },
  addSetButton: { alignItems: 'center', flexDirection: 'row', gap: 7, height: 39, marginTop: 5 },
  addSetText: { color: workoutColors.neon, fontSize: 17, fontWeight: '700' },
  addSetLabel: { color: workoutColors.neon, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  emptyExercises: { alignItems: 'center', marginTop: 2 },
  emptyIcon: { height: 49, width: 49 },
  emptyIconText: { color: workoutColors.neon, fontSize: 28, fontWeight: '500', marginTop: -2 },
  emptyTitle: { color: workoutColors.text, fontSize: 15, fontWeight: '800', marginTop: 15 },
  emptyDescription: { color: '#929D92', fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 260, textAlign: 'center' },
  bottomSpace: { height: 28 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 10, paddingHorizontal: 20, paddingTop: 12 },
  addExerciseButton: { alignItems: 'center', flexDirection: 'row', height: 47 },
  addExerciseIcon: { color: workoutColors.neon, fontSize: 22, lineHeight: 25, marginRight: 9 },
  addExerciseText: { color: workoutColors.text, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
