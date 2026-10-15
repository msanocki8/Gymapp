import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { GlassPanel } from '@/components/glass-panel';
import { GlassScreen } from '@/components/glass-screen';
import { useGymApp } from '@/hooks/use-gym-app';
import type { WorkoutPlan } from '@/hooks/use-gym-app';

const glassStyle: ViewStyle = {
  backgroundColor: 'rgba(8, 13, 10, 0.62)',
  borderColor: 'rgba(210, 231, 217, 0.14)',
  borderTopColor: 'rgba(240, 255, 244, 0.2)',
  shadowColor: '#72dba0',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 5 },
  elevation: 4,
};

const startButtonGlowStyle: ViewStyle & { boxShadow?: string } = {
  shadowColor: '#22c55e',
  shadowOpacity: 0.62,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 0 },
  elevation: 9,
  ...(Platform.OS === 'web' ? { boxShadow: '0 0 22px rgba(34, 197, 94, 0.72), 0 0 48px rgba(34, 197, 94, 0.32)' } : {}),
};

const formatDuration = (minutes: number) => `${minutes} min`;

function formatExerciseCount(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  const form = count === 1
    ? 'ćwiczenie'
    : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)
      ? 'ćwiczenia'
      : 'ćwiczeń';
  return `${count} ${form}`;
}

function AppIcon({
  name,
  size,
  color,
}: {
  name: ComponentProps<typeof SymbolView>['name'];
  size: number;
  color: string;
}) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

function WorkoutPlanCard({
  workout,
  onPress,
}: {
  workout: WorkoutPlan;
  onPress: () => void;
}) {
  const exerciseCount = workout.exercises.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Otwórz plan ${workout.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.workoutPressable, pressed && styles.pressed]}>
      <GlassPanel
        className="w-full"
        blurIntensity={20}
        contentClassName="flex-row items-center"
        contentStyle={styles.workoutCardContent}
        style={glassStyle}>
        <View style={styles.workoutIcon}>
          <AppIcon name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} size={19} color="#86efac" />
        </View>
        <View className="flex-1 min-w-0" style={styles.workoutText}>
          <Text numberOfLines={1} style={styles.workoutTitle}>
            {workout.name}
          </Text>
          <Text numberOfLines={1} style={styles.workoutSubtitle}>
            {workout.focus}
          </Text>
        </View>
        <View style={styles.workoutMeta}>
          <View style={styles.workoutMetaText}>
            <Text numberOfLines={1} style={styles.workoutDuration}>
              {formatDuration(workout.duration)}
            </Text>
            <Text numberOfLines={1} style={styles.workoutSubtitle}>
              {formatExerciseCount(exerciseCount)}
            </Text>
          </View>
          <AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color="#86efac" />
        </View>
      </GlassPanel>
    </Pressable>
  );
}

export default function TrainingHomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const {
    userName,
    plans,
    plansLoading,
    plansError,
    reloadPlans,
    sessions,
    sessionsLoading,
    sessionsError,
    reloadSessions,
  } = useGymApp();
  const completedThisWeek = (() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return sessions.filter((session) => session.completedAt >= start.getTime() && session.completedAt < end.getTime()).length;
  })();
  const completedWorkouts = Math.min(completedThisWeek, 3);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void reloadPlans();
      void reloadSessions();
    }, [reloadPlans, reloadSessions]),
  );

  return (
    <GlassScreen edges={['top']}>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View className="flex-1 min-w-0">
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <AppIcon name={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }} size={16} color="#22c55e" />
                </View>
                <Text style={styles.brand}>GYM LOG</Text>
              </View>
              <Text style={styles.brandSubtitle}>Twoje prywatne zapiski</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ustawienia konta"
              onPress={() => router.push('/(tabs)/account')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
              <AppIcon name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} size={20} color="#22c55e" />
            </Pressable>
          </View>

          <View style={styles.greeting}>
            <Text style={styles.greetingLabel}>Dzień dobry,</Text>
            <Text numberOfLines={1} style={styles.greetingName}>{userName}</Text>
            <Text style={styles.greetingSubtitle}>Gotowy na jeszcze jeden dobry dzień? ✨</Text>
          </View>

          <GlassPanel
            className="w-full"
            blurIntensity={20}
            contentClassName="w-full"
            contentStyle={styles.cardContent}
            style={glassStyle}>
            <View style={styles.weekContent}>
              <View style={styles.weekStats}>
                <View style={styles.sectionEyebrowRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.eyebrow}>TWÓJ TYDZIEŃ</Text>
                </View>
                <Text style={styles.weekCount}>
                  {sessionsLoading ? '…' : completedWorkouts}<Text style={styles.weekTotal}> / 3 treningi</Text>
                </Text>
              </View>
              <View style={styles.progressTrack} accessibilityLabel={`${completedWorkouts} z 3 treningów`}>
                {[0, 1, 2].map((segment) => (
                  <View
                    key={segment}
                    style={[
                      styles.progressSegment,
                      segment < completedWorkouts && styles.progressSegmentActive,
                    ]}
                  />
                ))}
              </View>
            </View>
            {sessionsError ? (
              <Text style={styles.weekHint}>Nie udało się pobrać postępów. Spróbuj odświeżyć ekran.</Text>
            ) : null}
          </GlassPanel>

          <GlassPanel
            className="w-full"
            blurIntensity={18}
            contentClassName="w-full"
            contentStyle={styles.featureContent}
            style={[glassStyle, styles.featurePanel]}>
            <View style={styles.featureTagRow}>
              <View style={styles.featureTag}>
                <View style={styles.featureTagDot} />
                <Text style={styles.featureTagText}>KROK 1 Z 3  ·  CZAS NA RUCH</Text>
              </View>
              <AppIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={20} color="#22c55e" />
            </View>
            <Text style={styles.featureTitle}>Zrób coś swojego.</Text>
            <Text style={styles.featureDescription}>
              Nawet najmniejszy ruch się liczy. Załóż buty i idź po swoje.
            </Text>
            <View style={styles.featureActions}>
              <View style={[styles.startButtonGlow, startButtonGlowStyle]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rozpocznij trening"
                  onPress={() => router.push('/workout-flow')}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.14)' }}
                  style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}>
                  <View style={styles.startButtonSurface}>
                    <AppIcon name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={17} color="#07150c" />
                    <Text style={styles.startButtonText}>Rozpocznij trening</Text>
                  </View>
                </Pressable>
              </View>
              <View style={styles.sloganRow}>
                <AppIcon name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }} size={15} color="#22c55e" />
                <Text style={styles.slogan}>Twój plan. Twoje tempo. Twój progres.</Text>
              </View>
            </View>
          </GlassPanel>

          <View style={styles.plansSection}>
            <View style={styles.plansHeader}>
              <View className="flex-1 min-w-0">
                <Text style={styles.plansEyebrow}>DODANE PLANY</Text>
                <Text style={styles.plansTitle}>Twoje poranne treningi</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/workout-flow')}
                style={({ pressed }) => [styles.allPlansButton, pressed && styles.pressed]}>
                <Text style={styles.allPlansText}>Wszystkie</Text>
                <AppIcon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={13} color="#4ade80" />
              </Pressable>
            </View>

            {plansLoading ? (
              <GlassPanel className="w-full" blurIntensity={20} contentStyle={styles.loadingContent} style={glassStyle}>
                <ActivityIndicator color="#4ade80" />
                <Text style={styles.loadingText}>Ładowanie Twoich planów…</Text>
              </GlassPanel>
            ) : plansError ? (
              <GlassPanel className="w-full" blurIntensity={20} contentStyle={styles.errorContent} style={glassStyle}>
                <Text style={styles.errorText}>{plansError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void reloadPlans();
                    void reloadSessions();
                  }}
                  style={styles.retryButton}>
                  <Text style={styles.retryText}>Spróbuj ponownie</Text>
                </Pressable>
              </GlassPanel>
            ) : plans.length > 0 ? (
              <View style={styles.workoutList}>
                {plans.slice(0, 3).map((workout) => (
                  <WorkoutPlanCard
                    key={workout.id}
                    workout={workout}
                    onPress={() => router.push({ pathname: '/workout-session', params: { planId: workout.id } })}
                  />
                ))}
              </View>
            ) : (
              <GlassPanel className="w-full" blurIntensity={20} contentStyle={styles.emptyContent} style={glassStyle}>
                <Text style={styles.emptyTitle}>Zacznij od własnego planu</Text>
                <Text style={styles.emptyDescription}>
                  Dodaj ćwiczenia i zapisz trening na swoim koncie.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/create-workout')}
                  style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Utwórz plan</Text>
                  <AppIcon name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} color="#4ade80" />
                </Pressable>
              </GlassPanel>
            )}
          </View>
        </View>
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.24)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: '#f0fdf4',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2.1,
  },
  brandSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 3,
    marginLeft: 34,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.24)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    minWidth: 0,
  },
  greetingLabel: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
  },
  greetingName: {
    color: '#f9fafb',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 2,
  },
  greetingSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  weekContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  weekStats: {
    gap: 5,
  },
  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  eyebrow: {
    color: '#8d968f',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  weekCount: {
    color: '#22c55e',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  weekTotal: {
    color: '#929a94',
    fontSize: 13,
    fontWeight: '500',
  },
  progressTrack: {
    flexDirection: 'row',
    width: 92,
    gap: 8,
  },
  progressSegment: {
    height: 9,
    flex: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progressSegmentActive: {
    backgroundColor: '#22c55e',
    shadowColor: '#4ade80',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  weekHint: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  featurePanel: {
    backgroundColor: 'rgba(8, 13, 10, 0.54)',
    borderColor: 'rgba(218, 232, 221, 0.1)',
    borderTopColor: 'rgba(245, 255, 247, 0.16)',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  featureContent: {
    padding: 21,
  },
  featureTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.22)',
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  featureTagText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  featureTagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  featureTitle: {
    color: '#fff',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.9,
    marginTop: 20,
  },
  featureDescription: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
    maxWidth: 370,
  },
  featureActions: {
    gap: 14,
    marginTop: 21,
  },
  startButton: {
    width: '100%',
    minHeight: 62,
    flexShrink: 0,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    overflow: 'hidden',
  },
  startButtonGlow: {
    width: '100%',
    borderRadius: 16,
    overflow: 'visible',
  },
  startButtonSurface: {
    width: '100%',
    minHeight: 62,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 16,
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    gap: 11,
  },
  startButtonPressed: {
    opacity: 0.84,
  },
  startButtonText: {
    color: '#07150c',
    fontSize: 16,
    fontWeight: '800',
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  slogan: {
    color: '#8d968f',
    fontSize: 13,
    fontWeight: '600',
  },
  plansSection: {
    gap: 13,
  },
  plansHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 1,
  },
  plansEyebrow: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 5,
  },
  plansTitle: {
    color: '#f9fafb',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  allPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingLeft: 8,
  },
  allPlansText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
  },
  workoutList: {
    gap: 12,
  },
  workoutPressable: {
    width: '100%',
  },
  workoutCardContent: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 11,
  },
  workoutIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.18)',
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutText: {
    gap: 5,
  },
  workoutTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '900',
  },
  workoutSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  workoutMetaText: {
    alignItems: 'flex-end',
    gap: 4,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  workoutDuration: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '800',
  },
  loadingContent: {
    minHeight: 86,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  loadingText: {
    color: '#d1d5db',
    fontSize: 13,
  },
  errorContent: {
    padding: 17,
    gap: 12,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  retryText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContent: {
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyDescription: {
    color: '#a1a1aa',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingVertical: 8,
  },
  emptyButtonText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
