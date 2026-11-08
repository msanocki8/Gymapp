import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBottomBar } from '@/components/app-bottom-bar';
import { useGymApp } from '@/hooks/use-gym-app';
import type { WorkoutPlan } from '@/hooks/use-gym-app';
import { useAuth } from '@/hooks/use-auth';
import { countWorkoutsThisWeek } from '@/lib/workout-goal';
import { PlanCarousel } from '@/components/plan-carousel';
import { WorkoutFlowGlassCard } from '@/components/workout-flow-glass-card';
import { WorkoutScreen, workoutColors, workoutStyles } from '@/components/workout-ui';

type CrossPlatformShadowStyle = ViewStyle & { boxShadow?: string };

const todayStartGlow: CrossPlatformShadowStyle = Platform.OS === 'web'
  ? { boxShadow: '0 0 24px rgba(163, 230, 53, 0.62), 0 0 42px rgba(34, 197, 94, 0.3)' }
  : {
      shadowColor: '#A3E635',
      shadowOpacity: 0.62,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 0 },
      elevation: 10,
    };

export function WorkoutFlow() {
  const router = useRouter();
  const {
    plans,
    plansLoading,
    plansError,
    reloadPlans,
    deletePlan,
    sessions,
    sessionsLoading,
    sessionsError,
  } = useGymApp();
  const { weeklyWorkoutGoal } = useAuth();
  const insets = useSafeAreaInsets();
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const confirmDeletePlan = (plan: WorkoutPlan) => {
    const message = `Czy na pewno chcesz usunąć plan „${plan.name}”?`;
    const onConfirm = () => {
      setDeletingPlanId(plan.id);
      setDeleteError(null);
      void deletePlan(plan.id)
        .catch((error: unknown) => {
          setDeleteError(error instanceof Error ? error.message : 'Nie udało się usunąć planu.');
        })
        .finally(() => setDeletingPlanId(null));
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
      return;
    }

    Alert.alert('Usunąć plan?', message, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const returnToTraining = () => {
    router.replace('/(tabs)/training');
  };

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const sessionsThisWeek = sessions.filter((session) =>
    session.completedAt >= startOfWeek.getTime() && session.completedAt < endOfWeek.getTime()
  );
  const completedThisWeek = Math.min(countWorkoutsThisWeek(sessions), weeklyWorkoutGoal);
  const completedPlanNamesThisWeek = new Set(
    sessionsThisWeek.map((session) => session.name.trim().toLocaleLowerCase('pl-PL')),
  );
  const nextPlan = plans.find(
    (plan) => !completedPlanNamesThisWeek.has(plan.name.trim().toLocaleLowerCase('pl-PL')),
  );
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    return {
      label: ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'][index],
      isToday: date.toDateString() === today.toDateString(),
      hasWorkout: sessionsThisWeek.some((session) =>
        session.completedAt >= date.getTime() && session.completedAt < nextDate.getTime()
      ),
    };
  });

  return (
    <WorkoutScreen maxWidth={820} edges={['top']}>
      <View style={styles.screenContent}>
        <ScrollView
          style={workoutStyles.page}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}>
          <View className="w-full min-w-0 self-center" style={styles.page}>
            <View style={styles.pageHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Wróć do treningów"
                onPress={returnToTraining}
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={17} tintColor={workoutColors.mint} />
              </Pressable>
              <View style={styles.pageHeaderCopy}>
                <Text style={styles.pageEyebrow}>CZAS NA RUCH</Text>
                <Text style={styles.pageTitle}>Wybierz trening</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ustawienia konta"
                onPress={() => router.push('/(tabs)/account')}
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} size={17} tintColor={workoutColors.mint} />
              </Pressable>
            </View>

            <WorkoutFlowGlassCard contentStyle={styles.weekCard}>
              <View style={styles.weekSummary}>
                <Text style={styles.weekLabel}>TYDZIEŃ</Text>
                <Text style={styles.weekCount}>
                  {sessionsLoading ? '…' : completedThisWeek}
                  <Text style={styles.weekTotal}>
                    {' '}z {weeklyWorkoutGoal} {weeklyWorkoutGoal === 1 ? 'treningu' : 'treningów'}
                  </Text>
                </Text>
              </View>
              <View style={styles.weekDays}>
                {weekDays.map((day, index) => (
                  <View key={`${day.label}-${index}`} style={styles.weekDay}>
                    <Text style={styles.weekDayLabel}>{day.label}</Text>
                    <View
                      accessibilityLabel={`${day.label}${day.isToday ? ', dzisiaj' : ''}${day.hasWorkout ? ', trening ukończony' : ''}`}
                      style={[
                        styles.weekDayDot,
                        day.hasWorkout && !day.isToday && styles.weekDayCompleted,
                        day.isToday && styles.weekDayToday,
                      ]}
                    />
                  </View>
                ))}
              </View>
              {sessionsError ? (
                <Text accessibilityRole="alert" style={styles.weekError}>
                  Nie udało się pobrać postępów treningowych.
                </Text>
              ) : null}
            </WorkoutFlowGlassCard>

            {nextPlan && !plansLoading && !plansError && !sessionsLoading && !sessionsError ? (
              (() => {
                const exercises = nextPlan.exerciseConfigs?.length
                  ? nextPlan.exerciseConfigs.slice(0, 2).map((exercise) => ({
                      name: exercise.name,
                      details: exercise.sets.length
                        ? `${exercise.sets.length} × ${exercise.sets[0]?.reps || '—'}`
                        : null,
                    }))
                  : nextPlan.exercises.slice(0, 2).map((name) => ({ name, details: null }));
                const remainingCount = Math.max(0, nextPlan.exercises.length - exercises.length);

                return (
                  <WorkoutFlowGlassCard
                    tone="featured"
                    glow
                    contentStyle={styles.todayCardContent}>
                    <View style={styles.todayHeader}>
                      <View style={styles.todayBadge}>
                        <View style={styles.todayBadgeDot} />
                        <Text style={styles.todayBadgeText}>NA DZIŚ</Text>
                      </View>
                      <Text style={styles.todayMeta}>{nextPlan.duration} min · {nextPlan.exercises.length} ćwiczeń</Text>
                    </View>
                    <Text numberOfLines={2} style={styles.todayTitle}>{nextPlan.name}</Text>
                    <View style={styles.todayDivider} />
                    <View style={styles.todayExercises}>
                      {[0, 1].map((index) => {
                        const exercise = exercises[index];
                        return (
                          <View key={exercise?.name ?? `today-empty-${index}`} style={styles.todayExerciseRow}>
                            <Text numberOfLines={1} style={styles.todayExerciseName}>{exercise?.name ?? ''}</Text>
                            <Text numberOfLines={1} style={styles.todayExerciseDetails}>{exercise?.details ?? ''}</Text>
                          </View>
                        );
                      })}
                    </View>
                    {remainingCount > 0 ? (
                      <Text style={styles.todayRemaining}>+ {remainingCount} kolejnych</Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Rozpocznij trening: ${nextPlan.name}`}
                      onPress={() => router.push({
                        pathname: '/workout-session',
                        params: { planId: nextPlan.id },
                      })}
                      style={({ pressed }) => [
                        styles.todayStartPressable,
                        todayStartGlow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <LinearGradient
                        colors={['#22c55e', '#a3e635']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.todayStartButton}>
                        <SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={16} tintColor="#04210f" />
                        <Text style={styles.todayStartText}>Rozpocznij trening</Text>
                      </LinearGradient>
                    </Pressable>
                  </WorkoutFlowGlassCard>
                );
              })()) : null}

            {plans.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stwórz własny plan"
                onPress={() => router.push('/create-workout')}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <WorkoutFlowGlassCard tone="featured" contentStyle={styles.createCard}>
                  <View style={styles.createIcon}>
                    <Text style={styles.createIconText}>+</Text>
                  </View>
                  <View style={styles.createCopy}>
                    <Text style={styles.createTitle}>Stwórz własny plan</Text>
                    <Text style={styles.createSubtitle}>Dodaj nazwę i ćwiczenia</Text>
                  </View>
                  <Text style={styles.createArrow}>›</Text>
                </WorkoutFlowGlassCard>
              </Pressable>
            ) : null}

            {plansLoading ? (
              <View className="mb-4 flex-row items-center justify-center gap-2">
                <ActivityIndicator color={workoutColors.neon} size="small" />
                <Text className="text-xs text-white/50">Pobieranie zapisanych planów…</Text>
              </View>
            ) : null}

            {plansError ? (
              <WorkoutFlowGlassCard contentStyle={styles.errorCard}>
                <Text accessibilityRole="alert" className="text-xs leading-5 text-red-200">{plansError}</Text>
                <Pressable onPress={() => { void reloadPlans(); }} className="mt-3 self-start rounded-xl bg-white/10 px-3 py-2">
                  <Text className="text-xs font-bold text-white">Spróbuj ponownie</Text>
                </Pressable>
              </WorkoutFlowGlassCard>
            ) : null}

            {deleteError ? (
              <Text accessibilityRole="alert" className="mb-4 text-xs leading-5 text-red-200">{deleteError}</Text>
            ) : null}

            {plans.length > 0 ? (
              <PlanCarousel
                plans={plans}
                onEdit={(plan) => router.push({ pathname: '/create-workout', params: { planId: plan.id } })}
                onDelete={confirmDeletePlan}
                deletingPlanId={deletingPlanId}
              />
            ) : (
              <WorkoutFlowGlassCard glow tone="featured" contentStyle={styles.emptyCard}>
                <Text className="w-full min-w-0 shrink" style={styles.emptyTitle} numberOfLines={2} ellipsizeMode="tail">Nie masz jeszcze planu</Text>
                <Text className="w-full min-w-0 shrink" style={styles.emptyText}>
                  Utwórz własną rozpiskę i pojawi się tutaj.
                </Text>
              </WorkoutFlowGlassCard>
            )}
          </View>
        </ScrollView>
        <AppBottomBar
          activeTab="training"
          bottomInset={insets.bottom}
          onNavigate={(tab) => {
            if (tab === 'training') returnToTraining();
            if (tab === 'history') router.replace('/(tabs)/history');
            if (tab === 'account') router.replace('/(tabs)/account');
          }}
        />
      </View>
    </WorkoutScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  page: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: 760,
    width: '100%',
  },
  pageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    minHeight: 50,
  },
  pageHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageEyebrow: {
    color: '#bef264',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  pageTitle: {
    color: workoutColors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  weekCard: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  weekSummary: {
    gap: 4,
    minWidth: 58,
  },
  weekLabel: {
    color: '#9ca3af',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1,
  },
  weekCount: {
    color: workoutColors.neon,
    fontSize: 19,
    fontWeight: '800',
  },
  weekTotal: {
    color: workoutColors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  weekDays: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  weekDay: {
    alignItems: 'center',
    gap: 5,
  },
  weekDayLabel: {
    color: '#a1a1aa',
    fontSize: 8,
    fontWeight: '600',
  },
  weekDayDot: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'transparent',
    borderRadius: 11,
    borderWidth: 1,
    height: 22,
    width: 22,
  },
  weekDayCompleted: {
    backgroundColor: 'rgba(34,197,94,0.72)',
  },
  weekDayToday: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: workoutColors.neon,
  },
  weekError: {
    color: '#fca5a5',
    flexBasis: '100%',
    fontSize: 10,
    lineHeight: 15,
  },
  todayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 25,
  },
  todayCardContent: {
    gap: 10,
    padding: 18,
  },
  todayBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.34)',
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  todayBadgeDot: {
    borderColor: workoutColors.mint,
    borderRadius: 3,
    borderWidth: 1,
    height: 6,
    width: 6,
  },
  todayBadgeText: {
    color: workoutColors.mint,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  todayMeta: {
    color: workoutColors.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  todayTitle: {
    color: workoutColors.text,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 27,
  },
  todayDivider: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  todayExercises: {
    gap: 3,
  },
  todayExerciseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 19,
  },
  todayExerciseName: {
    color: workoutColors.text,
    flex: 1,
    fontSize: 11,
    minWidth: 0,
  },
  todayExerciseDetails: {
    color: workoutColors.muted,
    flexShrink: 0,
    fontSize: 10,
  },
  todayRemaining: {
    color: workoutColors.mint,
    fontSize: 10,
    fontWeight: '600',
  },
  todayStartPressable: {
    borderRadius: 14,
    marginTop: 1,
  },
  todayStartButton: {
    alignItems: 'center',
    borderColor: 'rgba(217, 255, 143, 0.52)',
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
  },
  todayStartText: {
    color: '#04210f',
    fontSize: 14,
    fontWeight: '800',
  },
  createCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    padding: 17,
  },
  createIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.14)',
    borderColor: 'rgba(74,222,128,0.3)',
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  createIconText: {
    color: '#A3E635',
    fontSize: 24,
    fontWeight: '700',
  },
  createCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  createTitle: {
    color: workoutColors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  createSubtitle: {
    color: workoutColors.muted,
    fontSize: 12,
  },
  createArrow: {
    color: '#4ADE80',
    fontSize: 26,
    fontWeight: '500',
    marginTop: -3,
  },
  errorCard: {
    padding: 16,
  },
  emptyCard: {
    gap: 7,
    padding: 18,
  },
  emptyTitle: {
    color: workoutColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: workoutColors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.992 }],
  },
});