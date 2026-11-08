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
import type { ScrollViewInstance, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { GlassPanel } from '@/components/glass-panel';
import { GlassScreen } from '@/components/glass-screen';
import { useGymApp } from '@/hooks/use-gym-app';
import type { WorkoutPlan } from '@/hooks/use-gym-app';
import { useAuth } from '@/hooks/use-auth';
import { countWorkoutsThisWeek } from '@/lib/workout-goal';

type CrossPlatformShadowStyle = ViewStyle & { boxShadow?: string };

const glassStyle: CrossPlatformShadowStyle = {
  backgroundColor: 'rgba(9, 18, 13, 0.72)',
  borderColor: 'rgba(255, 255, 255, 0.12)',
  borderTopColor: 'rgba(255, 255, 255, 0.18)',
  ...(Platform.OS === 'web'
    ? { boxShadow: '0 10px 24px rgba(0, 0, 0, 0.2)' }
    : {
        shadowColor: '#166534',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      }),
};

const startButtonGlowStyle: CrossPlatformShadowStyle = Platform.OS === 'web'
  ? { boxShadow: '0 0 22px rgba(163, 230, 53, 0.38)' }
  : {
      shadowColor: '#a3e635',
      shadowOpacity: 0.62,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 0 },
      elevation: 9,
    };

const progressSegmentGlowStyle: CrossPlatformShadowStyle = Platform.OS === 'web'
  ? { boxShadow: '0 0 8px rgba(74, 222, 128, 0.3)' }
  : {
      shadowColor: '#4ade80',
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
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
        style={[glassStyle, styles.homePlanPanel]}>
        <LinearGradient
          colors={['rgba(190, 242, 100, 0.16)', 'rgba(74, 222, 128, 0.12)', 'rgba(4, 8, 5, 0.48)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.workoutIcon}>
          <AppIcon name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} size={19} color="#F0ABFC" />
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
  const scrollRef = useRef<ScrollViewInstance>(null);
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
  const { weeklyWorkoutGoal } = useAuth();
  const completedWorkouts = Math.min(countWorkoutsThisWeek(sessions), weeklyWorkoutGoal);

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
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View className="flex-1 min-w-0">
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <AppIcon name={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }} size={14} color="#06210D" />
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
              <AppIcon name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} size={20} color="#BEF264" />
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
            tone="mint"
            style={glassStyle}>
            <LinearGradient
              colors={['rgba(22, 101, 52, 0.24)', 'rgba(9, 18, 13, 0.78)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.weekContent}>
              <View style={styles.weekStats}>
                <View style={styles.sectionEyebrowRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.eyebrow}>TWÓJ TYDZIEŃ</Text>
                </View>
                <Text style={styles.weekCount}>
                  {sessionsLoading ? '…' : completedWorkouts}
                  <Text style={styles.weekTotal}>
                    {' '}z {weeklyWorkoutGoal} {weeklyWorkoutGoal === 1 ? 'treningu' : 'treningów'}
                  </Text>
                </Text>
              </View>
              <View
                style={styles.progressTrack}
                accessibilityLabel={`${completedWorkouts} z ${weeklyWorkoutGoal} ${weeklyWorkoutGoal === 1 ? 'treningu' : 'treningów'}`}>
                {Array.from({ length: weeklyWorkoutGoal }, (_, segment) => (
                  <View
                    key={segment}
                    style={[
                      styles.progressSegment,
                      segment < completedWorkouts && styles.progressSegmentActive,
                      segment < completedWorkouts && progressSegmentGlowStyle,
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
            tone="mint"
            style={[glassStyle, styles.featurePanel]}>
            <LinearGradient
              colors={['rgba(20, 40, 27, 0.84)', 'rgba(4, 8, 5, 0.78)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.featureTagRow}>
              <View style={styles.featureTag}>
                <View style={styles.featureTagDot} />
                <Text style={styles.featureTagText}>KROK 1 Z 3  ·  CZAS NA RUCH</Text>
              </View>
              <AppIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={20} color="#BEF264" />
            </View>
            <View style={styles.featureTitle}>
              <Text style={styles.featureTitlePrimary}>Zrób coś</Text>
              <Svg width={190} height={38} viewBox="0 0 190 38" accessibilityLabel="swojego.">
                <Defs>
                  <SvgLinearGradient id="training-title-gradient" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#BEF264" />
                    <Stop offset="0.52" stopColor="#4ADE80" />
                    <Stop offset="1" stopColor="#86EFAC" />
                  </SvgLinearGradient>
                </Defs>
                <SvgText x={0} y={31} fill="url(#training-title-gradient)" fontSize={32} fontWeight="900" letterSpacing={-0.9}>
                  swojego.
                </SvgText>
              </Svg>
            </View>
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
                  <LinearGradient
                    colors={['#22C55E', '#A3E635']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.startButtonSurface}>
                    <AppIcon name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={17} color="#000000" />
                    <Text style={styles.startButtonText}>Rozpocznij trening</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              <View style={styles.sloganRow}>
                <AppIcon name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }} size={15} color="#BEF264" />
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
                <AppIcon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={13} color="#BEF264" />
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
    alignSelf: 'flex-start',
    backgroundColor: '#4ADE80',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  brandMark: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: '#06210D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    color: '#8F9A93',
    fontSize: 12,
    marginTop: 3,
    marginLeft: 2,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.22)',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    minWidth: 0,
  },
  greetingLabel: {
    color: '#F9FAFB',
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
  },
  greetingName: {
    color: '#BEF264',
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 2,
  },
  greetingSubtitle: {
    color: '#8F9A93',
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
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  weekCount: {
    color: '#4ADE80',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  weekTotal: {
    color: '#8F9A93',
    fontSize: 13,
    fontWeight: '500',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    width: 26,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progressSegmentActive: {
    backgroundColor: '#4ADE80',
  },
  weekHint: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  featurePanel: {
    backgroundColor: 'rgba(9, 18, 13, 0.55)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
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
    borderColor: 'rgba(190, 242, 100, 0.32)',
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  featureTagText: {
    color: '#BEF264',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  featureTagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#BEF264',
  },
  featureTitle: {
    alignSelf: 'flex-start',
    marginTop: 20,
  },
  featureTitlePrimary: {
    color: '#F9FAFB',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  featureDescription: {
    color: '#8F9A93',
    fontSize: 14,
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
    height: 53,
    flexShrink: 0,
    borderRadius: 999,
    overflow: 'hidden',
  },
  startButtonGlow: {
    width: '100%',
    borderRadius: 999,
    overflow: 'visible',
  },
  startButtonSurface: {
    width: '100%',
    height: 53,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 999,
    paddingHorizontal: 16,
    gap: 11,
  },
  startButtonPressed: {
    opacity: 0.84,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  slogan: {
    color: '#8F9A93',
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
    color: '#BEF264',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 5,
  },
  plansTitle: {
    color: '#F9FAFB',
    fontSize: 21,
    lineHeight: 26,
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
    color: '#BEF264',
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
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
  },
  homePlanPanel: {
    backgroundColor: 'rgba(9, 18, 13, 0.62)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  workoutIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutText: {
    gap: 5,
  },
  workoutTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '900',
  },
  workoutSubtitle: {
    color: '#8F9A93',
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
    color: '#F9FAFB',
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
