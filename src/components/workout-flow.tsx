import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';

import { WorkoutPlan, useGymApp } from '@/hooks/use-gym-app';
import {
  WorkoutCard,
  WorkoutHeader,
  WorkoutScreen,
  workoutColors,
  workoutStyles,
} from '@/components/workout-ui';

function PlanCard({
  plan,
  index,
  wide,
  onDelete,
  deleting,
}: {
  plan: WorkoutPlan;
  index: number;
  wide: boolean;
  onDelete: (plan: WorkoutPlan) => void;
  deleting: boolean;
}) {
  const router = useRouter();
  const exerciseCountForm = plan.exercises.length === 1
    ? 'ćwiczenie'
    : plan.exercises.length >= 2 && plan.exercises.length <= 4
      ? 'ćwiczenia'
      : 'ćwiczeń';

  return (
    <WorkoutCard className="w-full min-w-0 overflow-hidden" style={[styles.planCard, wide && styles.planCardWide]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Rozpocznij plan ${plan.name}`}
        onPress={() => router.push({ pathname: '/workout-session', params: { planId: plan.id } })}
        className="w-full min-w-0 active:opacity-80"
        style={styles.planButton}>
        <View className="w-full min-w-0 flex-row items-center" style={styles.planTopRow}>
          <View className="shrink-0" style={styles.planIcon}>
            <Text style={styles.planIconText} maxFontSizeMultiplier={1.1}>
              {`${index + 1}`.padStart(2, '0')}
            </Text>
          </View>
          <View className="min-w-0 flex-1 shrink overflow-hidden" style={styles.planCopy}>
            <Text className="w-full shrink" style={styles.planName} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.15}>
              {plan.name}
            </Text>
            <Text className="w-full shrink" style={styles.planFocus} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.15}>
              {plan.focus}
            </Text>
          </View>
          <View className="shrink-0" style={styles.planArrow}>
            <Text style={styles.planArrowText}>›</Text>
          </View>
        </View>
      </Pressable>
      <View className="w-full min-w-0 flex-row items-center" style={styles.planFooter}>
        <Text className="min-w-0 flex-1 shrink" style={styles.planExerciseCount} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.1}>
          {plan.exercises.length} {exerciseCountForm}
        </Text>
        <Text className="shrink-0" style={styles.planDuration} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {plan.duration} min
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edytuj plan ${plan.name}`}
          onPress={() => router.push({ pathname: '/create-workout', params: { planId: plan.id } })}
          className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 active:opacity-70"
          style={styles.editPlanButton}>
          <Text style={styles.editPlanText}>EDYTUJ</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Usuń plan ${plan.name}`}
          accessibilityState={{ disabled: deleting }}
          disabled={deleting}
          onPress={() => onDelete(plan)}
          className="shrink-0 rounded-xl border border-red-400/30 bg-red-950/30 active:opacity-70"
          style={styles.deletePlanButton}>
          {deleting ? (
            <ActivityIndicator color="#FCA5A5" size="small" />
          ) : (
            <Text style={styles.deletePlanText}>USUŃ</Text>
          )}
        </Pressable>
      </View>
    </WorkoutCard>
  );
}

export function WorkoutFlow() {
  const router = useRouter();
  const { plans, plansLoading, plansError, reloadPlans, deletePlan } = useGymApp();
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 760;
  const lastTwoDigits = plans.length % 100;
  const lastDigit = plans.length % 10;
  const planCountForm = plans.length === 1
    ? 'PLAN'
    : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)
      ? 'PLANY'
      : 'PLANÓW';
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

  return (
    <WorkoutScreen maxWidth={820}>
      <WorkoutHeader eyebrow="PLAN TRENINGOWY" onBack={() => router.back()} />
      <ScrollView
        style={workoutStyles.page}
        contentContainerStyle={[workoutStyles.scrollContent, styles.pageContent]}
        showsVerticalScrollIndicator={false}>
        <View className="w-full min-w-0 self-center" style={styles.intro}>
          <View style={[styles.eyebrow, !isWideScreen && styles.centered]}>
            <View style={styles.eyebrowDot} />
            <Text style={workoutStyles.sectionLabel} maxFontSizeMultiplier={1.1}>
              TWÓJ RYTM. TWOJE ZASADY.
            </Text>
          </View>
          <Text
            className="w-full min-w-0 shrink"
            style={[workoutStyles.title, styles.title, !isWideScreen && styles.centeredText]}
            numberOfLines={3}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.15}>
            Wybierz swój{'\n'}trening <Text style={styles.titleAccent}>na dziś.</Text>
          </Text>
          <Text
            className="w-full min-w-0 shrink"
            style={[workoutStyles.subtitle, styles.introSubtitle, !isWideScreen && styles.centeredText]}
            numberOfLines={3}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.15}>
            Gotowy plan albo własna rozpiska — zaczynasz wtedy, kiedy chcesz.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/create-workout')}
          className="w-full min-w-0 self-center overflow-hidden"
          style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}>
          <View className="w-full min-w-0 flex-row items-center" style={styles.createContent}>
            <View className="shrink-0" style={styles.createIcon}>
              <Text style={styles.createIconText}>+</Text>
            </View>
            <View className="min-w-0 flex-1 shrink overflow-hidden" style={styles.createCopy}>
              <Text className="w-full shrink" style={styles.createTitle} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.15}>
                Stwórz własny plan
              </Text>
              <Text className="w-full min-w-0 shrink" style={styles.createSubtitle} numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={1.15}>
                Dodaj nazwę i ćwiczenia
              </Text>
            </View>
            <Text className="shrink-0" style={styles.createArrow}>›</Text>
          </View>
        </Pressable>

        <View className="w-full min-w-0 self-center flex-row" style={[styles.sectionHeading, !isWideScreen && styles.sectionHeadingMobile]}>
          <View className="min-w-0 flex-1 shrink">
            <Text style={styles.sectionKicker}>ZACZNIJ OD GOTOWEGO</Text>
            <Text className="w-full shrink" style={styles.sectionTitle} numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={1.15}>Plany treningowe</Text>
          </View>
          <View className="shrink-0" style={styles.planCountBadge}>
            <Text style={styles.planCount}>{plans.length} {planCountForm}</Text>
          </View>
        </View>

        {plansLoading ? (
          <View className="mb-4 flex-row items-center justify-center gap-2">
            <ActivityIndicator color={workoutColors.neon} size="small" />
            <Text className="text-xs text-white/50">Pobieranie zapisanych planów…</Text>
          </View>
        ) : null}

        {plansError ? (
          <View className="mb-4 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4">
            <Text accessibilityRole="alert" className="text-xs leading-5 text-red-200">{plansError}</Text>
            <Pressable onPress={() => { void reloadPlans(); }} className="mt-3 self-start rounded-xl bg-white/10 px-3 py-2">
              <Text className="text-xs font-bold text-white">Spróbuj ponownie</Text>
            </Pressable>
          </View>
        ) : null}

        {deleteError ? (
          <Text accessibilityRole="alert" className="mb-4 text-xs leading-5 text-red-200">{deleteError}</Text>
        ) : null}

        {plans.length > 0 ? (
          <View className="w-full min-w-0 items-center" style={[styles.planList, isWideScreen && styles.planListWide]}>
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                wide={isWideScreen}
                onDelete={confirmDeletePlan}
                deleting={deletingPlanId === plan.id}
              />
            ))}
          </View>
        ) : (
          <WorkoutCard style={styles.emptyCard}>
            <Text className="w-full min-w-0 shrink" style={styles.emptyTitle} numberOfLines={2} ellipsizeMode="tail">Nie masz jeszcze planu</Text>
            <Text className="w-full min-w-0 shrink" style={styles.emptyText}>
              Utwórz własną rozpiskę i pojawi się tutaj.
            </Text>
          </WorkoutCard>
        )}
      </ScrollView>
    </WorkoutScreen>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    maxWidth: 820,
    paddingHorizontal: 27,
    paddingTop: 22,
    paddingBottom: 36,
  },
  intro: {
    alignSelf: 'center',
    marginBottom: 25,
    maxWidth: 560,
    width: '100%',
  },
  centered: {
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  eyebrow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  eyebrowDot: {
    backgroundColor: workoutColors.neon,
    borderRadius: 5,
    height: 7,
    width: 7,
  },
  title: {
    fontSize: 32,
    lineHeight: 46,
    marginTop: 15,
    maxWidth: 560,
  },
  titleAccent: {
    color: workoutColors.neon,
  },
  introSubtitle: {
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 440,
  },
  createCard: {
    alignItems: 'stretch',
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.07)',
    borderColor: 'rgba(34, 197, 94, 0.26)',
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 104,
    maxWidth: 560,
    paddingHorizontal: 17,
    paddingVertical: 16,
    width: '100%',
  },
  createContent: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 70,
    width: '100%',
  },
  createIcon: {
    alignItems: 'center',
    backgroundColor: workoutColors.neon,
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  createIconText: {
    color: workoutColors.background,
    fontSize: 27,
    fontWeight: '500',
    lineHeight: 34,
    marginTop: -3,
  },
  createCopy: {
    flex: 1,
    marginLeft: 13,
    minWidth: 0,
  },
  createTitle: {
    color: workoutColors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  createSubtitle: {
    color: workoutColors.muted,
    fontSize: 13,
    marginTop: 7,
    lineHeight: 18,
  },
  createArrow: {
    color: workoutColors.neon,
    fontSize: 30,
    lineHeight: 34,
    marginLeft: 8,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    alignItems: 'flex-end',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 30,
    maxWidth: 560,
    width: '100%',
  },
  sectionHeadingMobile: {
    alignItems: 'center',
  },
  sectionKicker: {
    color: workoutColors.neon,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  sectionTitle: {
    color: workoutColors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  planCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    borderColor: workoutColors.border,
    borderRadius: 99,
    borderWidth: 1,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  planCount: {
    color: workoutColors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  planList: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  planListWide: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  planCard: {
    alignSelf: 'center',
    maxWidth: 560,
    padding: 0,
    width: '100%',
  },
  planCardWide: {
    alignSelf: 'auto',
    flexBasis: 330,
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: 390,
  },
  planButton: {
    alignItems: 'stretch',
    alignSelf: 'stretch',
    flexDirection: 'column',
    minHeight: 76,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 10,
    width: '100%',
  },
  planContent: {
    alignSelf: 'stretch',
    flexDirection: 'column',
    width: '100%',
  },
  planTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 50,
    width: '100%',
  },
  planIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.14)',
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  planIconText: {
    color: workoutColors.neon,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  planCopy: {
    flex: 1,
    marginHorizontal: 11,
    minWidth: 0,
  },
  planName: {
    color: workoutColors.text,
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  planFocus: {
    color: workoutColors.muted,
    fontSize: 12,
    flexShrink: 1,
    marginTop: 6,
  },
  planFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(237, 247, 239, 0.07)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  editPlanButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 31,
    paddingHorizontal: 10,
  },
  editPlanText: {
    color: '#AAB4A8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  deletePlanButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 31,
    minWidth: 48,
    paddingHorizontal: 9,
  },
  deletePlanText: {
    color: '#FCA5A5',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  planExerciseCount: {
    color: workoutColors.muted,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  planDuration: {
    color: workoutColors.neon,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    marginLeft: 'auto',
  },
  planArrow: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    marginTop: 8,
    width: 30,
  },
  planArrowText: {
    color: workoutColors.neon,
    fontSize: 23,
    lineHeight: 27,
    marginTop: -2,
  },
  emptyCard: {
    marginTop: 2,
    padding: 20,
  },
  emptyTitle: {
    color: workoutColors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: workoutColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.992 }],
  },
});
