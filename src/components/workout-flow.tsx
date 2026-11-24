import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_BOTTOM_BAR_CONTENT_HEIGHT, AppBottomBar } from '@/components/app-bottom-bar';
import { AppSidePanel } from '@/components/app-side-panel';
import { MuscleBars, ObsidianCard } from '@/components/obsidian-card';
import { useGymApp } from '@/hooks/use-gym-app';
import type { WorkoutPlan } from '@/hooks/use-gym-app';
import { useAuth } from '@/hooks/use-auth';
import { getPlanMuscleBars } from '@/lib/plan-muscles';
import { countWorkoutsThisWeek } from '@/lib/workout-goal';
import { WorkoutScreen, workoutColors, workoutStyles } from '@/components/workout-ui';

type CrossPlatformShadowStyle = ViewStyle & { boxShadow?: string };

const startGlow: CrossPlatformShadowStyle = Platform.OS === 'web'
  ? { boxShadow: '0 0 20px rgba(163, 230, 53, 0.45)' }
  : {
      shadowColor: '#A3E635',
      shadowOpacity: 0.5,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    };

const orbitShadow: CrossPlatformShadowStyle = Platform.OS === 'web'
  ? { boxShadow: '0 10px 24px rgba(0, 0, 0, 0.55), 0 0 18px rgba(163, 230, 53, 0.12)' }
  : {
      shadowColor: '#000000',
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    };

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('pl-PL');

function exerciseCountLabel(count: number) {
  if (count === 1) return '1 ćwiczenie';
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  return `${count} ${lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? 'ćwiczenia' : 'ćwiczeń'}`;
}

const ORBIT_DURATION_MS = 4000;
const ORBIT_BAND = ['rgba(163,230,53,0)', 'rgba(163,230,53,0)', 'rgba(163,230,53,0.6)', '#E8FFAA', 'rgba(163,230,53,0.6)', 'rgba(163,230,53,0)', 'rgba(163,230,53,0)'] as const;
const ORBIT_STOPS = [0, 0.38, 0.46, 0.5, 0.54, 0.62, 1] as const;

// A bright stripe through the card's centre spins behind the card; it always crosses the edge at two
// opposite points, so the border glows in two places and stays dark in the other two.
function OrbitCard({ children, contentStyle }: PropsWithChildren<{ contentStyle?: ViewStyle }>) {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(35);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    rotation.set(35);
    rotation.set(withRepeat(withTiming(395, { duration: ORBIT_DURATION_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(rotation);
  }, [reducedMotion, rotation]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  const diagonal = Math.ceil(Math.hypot(size.width, size.height)) + 8;

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}
      style={[styles.orbit, orbitShadow]}>
      {size.width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              height: diagonal,
              left: (size.width - diagonal) / 2,
              position: 'absolute',
              top: (size.height - diagonal) / 2,
              width: diagonal,
            },
            spinStyle,
          ]}>
          <LinearGradient
            colors={ORBIT_BAND}
            locations={ORBIT_STOPS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      <View pointerEvents="none" style={styles.orbitBase} />
      <LinearGradient colors={['#121412', '#060706']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.orbitInner}>
        <View style={contentStyle}>{children}</View>
      </LinearGradient>
    </View>
  );
}

function Shimmer() {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.set(withRepeat(
      withSequence(
        withDelay(3500, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    ));
    return () => cancelAnimation(progress);
  }, [reducedMotion, progress]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + progress.get() * (width + 320) }, { skewX: '-18deg' }],
  }));

  if (reducedMotion) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[styles.shimmer, sweepStyle]}>
        <LinearGradient
          colors={['rgba(232,255,170,0)', 'rgba(232,255,170,0.16)', 'rgba(232,255,170,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const SPLIT_COLORS = ['#A3E635', '#4ADE80', '#2F7D46'] as const;

function PlanRow({
  plan,
  menuOpen,
  deleting,
  onStart,
  onToggleMenu,
  onEdit,
  onDelete,
}: {
  plan: WorkoutPlan;
  menuOpen: boolean;
  deleting: boolean;
  onStart: () => void;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const split = useMemo(() => {
    const bars = getPlanMuscleBars(plan);
    const total = bars.reduce((sum, bar) => sum + bar.share, 0);
    return bars.map((bar, index) => ({
      key: bar.key,
      label: bar.label,
      percent: total > 0 ? Math.round((bar.share / total) * 100) : 0,
      color: SPLIT_COLORS[index] ?? SPLIT_COLORS[SPLIT_COLORS.length - 1],
    }));
  }, [plan]);

  return (
    <ObsidianCard>
      {split.length > 0 ? (
        <View style={styles.splitStrip}>
          {split.map((part) => (
            <View key={part.key} style={[styles.splitSegment, { flex: Math.max(1, part.percent), backgroundColor: part.color }]} />
          ))}
        </View>
      ) : null}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={styles.rowTitle}>{plan.name}</Text>
            <Text numberOfLines={1} style={styles.rowMeta}>{plan.duration} min · {exerciseCountLabel(plan.exercises.length)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rozpocznij trening: ${plan.name}`}
            onPress={onStart}
            style={({ pressed }) => [styles.playButton, startGlow, pressed && styles.pressed]}>
            <LinearGradient colors={['#22C55E', '#A3E635']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playFill}>
              <SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={17} tintColor="#06210D" />
            </LinearGradient>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Więcej opcji planu ${plan.name}`}
            accessibilityState={{ expanded: menuOpen }}
            onPress={onToggleMenu}
            style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
            <Text style={styles.moreText}>⋮</Text>
          </Pressable>
        </View>
        {split.length > 0 ? (
          <View style={styles.pills} accessible accessibilityLabel={`Mięśnie: ${split.map((part) => `${part.label} ${part.percent}%`).join(', ')}`}>
            {split.map((part) => (
              <View key={part.key} style={styles.pill}>
                <View style={[styles.pillDot, { backgroundColor: part.color }]} />
                <Text style={styles.pillLabel}>
                  {part.label} <Text style={styles.pillPercent}>{part.percent}%</Text>
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noMuscles}>Brak przypisanych mięśni dla ćwiczeń z tego planu.</Text>
        )}
        {menuOpen ? (
          <View style={styles.menuRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edytuj plan ${plan.name}`}
              onPress={onEdit}
              style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={14} tintColor="#D1D9D3" />
              <Text style={styles.menuText}>Edytuj</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Usuń plan ${plan.name}`}
              accessibilityState={{ disabled: deleting }}
              disabled={deleting}
              onPress={onDelete}
              style={({ pressed }) => [styles.menuButton, styles.menuDelete, pressed && styles.pressed]}>
              {deleting ? (
                <ActivityIndicator color="#FCA5A5" size="small" />
              ) : (
                <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={14} tintColor="#FCA5A5" />
              )}
              <Text style={[styles.menuText, styles.menuDeleteText]}>Usuń</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ObsidianCard>
  );
}

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openPlanMenuId, setOpenPlanMenuId] = useState<string | null>(null);
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
  const startPlan = (plan: WorkoutPlan) => {
    router.push({ pathname: '/workout-session', params: { planId: plan.id } });
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
  const completedPlanNamesThisWeek = new Set(sessionsThisWeek.map((session) => normalizeName(session.name)));
  const nextPlan = plans.find((plan) => !completedPlanNamesThisWeek.has(normalizeName(plan.name)));
  const nextPlanBars = useMemo(() => (nextPlan ? getPlanMuscleBars(nextPlan) : []), [nextPlan]);
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
  const dataReady = !plansLoading && !plansError && !sessionsLoading && !sessionsError;

  return (
    <WorkoutScreen maxWidth={820} edges={['top']}>
      <View style={styles.screenContent}>
        <ScrollView
          style={workoutStyles.page}
          contentContainerStyle={[
            styles.pageContent,
            { paddingBottom: APP_BOTTOM_BAR_CONTENT_HEIGHT + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}>
          <View className="w-full min-w-0 self-center" style={styles.page}>
            <View style={styles.pageHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Wróć do treningów"
                onPress={returnToTraining}
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={17} tintColor="#A3E635" />
              </Pressable>
              <View style={styles.pageHeaderCopy}>
                <Text style={styles.pageEyebrow}>CZAS NA RUCH</Text>
                <Text style={styles.pageTitle}>Wybierz trening</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Otwórz menu"
                onPress={() => setIsMenuOpen(true)}
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }} size={17} tintColor="#A3E635" />
              </Pressable>
            </View>

            <ObsidianCard contentStyle={styles.weekCard}>
              <View style={styles.weekSummary}>
                <Text style={styles.weekLabel}>TYDZIEŃ</Text>
                <Text style={styles.weekCount}>
                  {sessionsLoading ? '…' : completedThisWeek}
                  <Text style={styles.weekTotal}> z {weeklyWorkoutGoal}</Text>
                </Text>
              </View>
              <View style={styles.weekDays}>
                {weekDays.map((day, index) => (
                  <View key={`${day.label}-${index}`} style={styles.weekDay}>
                    <Text style={[styles.weekDayLabel, day.isToday && styles.weekDayLabelToday]}>{day.label}</Text>
                    <View
                      accessibilityLabel={`${day.label}${day.isToday ? ', dzisiaj' : ''}${day.hasWorkout ? ', trening ukończony' : ''}`}
                      style={[
                        styles.weekDayDot,
                        day.hasWorkout && styles.weekDayCompleted,
                        day.isToday && !day.hasWorkout && styles.weekDayToday,
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
            </ObsidianCard>

            {!plansLoading && !plansError ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Szybki start: nowy trening"
                onPress={() => router.push({ pathname: '/workout-session', params: { quick: '1' } })}
                style={({ pressed }) => pressed && styles.pressed}>
                <OrbitCard contentStyle={styles.quickCard}>
                  <LinearGradient colors={['#22C55E', '#A3E635']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.quickIcon, startGlow]}>
                    <SymbolView name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }} size={20} tintColor="#06210D" />
                  </LinearGradient>
                  <View style={styles.quickCopy}>
                    <Text style={styles.quickTitle}>Szybki start</Text>
                    <Text numberOfLines={1} style={styles.quickSubtitle}>
                      Nowy trening bez planu
                    </Text>
                  </View>
                  <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor="#A3E635" />
                </OrbitCard>
              </Pressable>
            ) : null}

            {nextPlan && dataReady ? (
              <LinearGradient
                colors={['#1B4325', '#0E1C13']}
                locations={[0, 0.6]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.proposedCard}>
                <View pointerEvents="none" style={styles.proposedOrb} />
                <Shimmer />
                <View style={styles.proposedBadge}>
                  <Text style={styles.proposedBadgeText}>PROPONOWANY</Text>
                </View>
                <Text numberOfLines={2} style={styles.proposedTitle}>{nextPlan.name}</Text>
                <Text style={styles.proposedMeta}>{nextPlan.duration} min · {exerciseCountLabel(nextPlan.exercises.length)}</Text>
                <Text style={styles.proposedHint}>Ten plan czeka najdłużej w tym tygodniu.</Text>
                <View style={styles.proposedBars}>
                  <MuscleBars rows={nextPlanBars} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rozpocznij trening: ${nextPlan.name}`}
                  onPress={() => startPlan(nextPlan)}
                  style={({ pressed }) => [styles.startPressable, startGlow, pressed && styles.pressed]}>
                  <LinearGradient
                    colors={['#22C55E', '#A3E635']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.startButton}>
                    <SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={16} tintColor="#04210F" />
                    <Text style={styles.startText}>Rozpocznij</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            ) : null}

            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionEyebrow}>TWOJE PLANY · {plans.length}</Text>
                <Text style={styles.sectionTitle}>Zapisane treningi</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Utwórz nowy plan"
                onPress={() => router.push('/create-workout')}
                style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={13} tintColor="#BEF264" />
                <Text style={styles.newButtonText}>Nowy</Text>
              </Pressable>
            </View>

            {plansLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={workoutColors.neon} size="small" />
                <Text style={styles.loadingText}>Pobieranie zapisanych planów…</Text>
              </View>
            ) : null}

            {plansError ? (
              <ObsidianCard contentStyle={styles.errorCard}>
                <Text accessibilityRole="alert" style={styles.errorText}>{plansError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { void reloadPlans(); }}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
                  <Text style={styles.retryText}>Spróbuj ponownie</Text>
                </Pressable>
              </ObsidianCard>
            ) : null}

            {deleteError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>{deleteError}</Text>
            ) : null}

            {plans.length > 0 ? (
              <View style={styles.list}>
                {plans.map((plan, index) => (
                  <Animated.View key={plan.id} entering={FadeInDown.delay(50 + index * 70).springify().damping(16)}>
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    menuOpen={openPlanMenuId === plan.id}
                    deleting={deletingPlanId === plan.id}
                    onStart={() => startPlan(plan)}
                    onToggleMenu={() => setOpenPlanMenuId((current) => (current === plan.id ? null : plan.id))}
                    onEdit={() => {
                      setOpenPlanMenuId(null);
                      router.push({ pathname: '/create-workout', params: { planId: plan.id } });
                    }}
                    onDelete={() => confirmDeletePlan(plan)}
                  />
                  </Animated.View>
                ))}
              </View>
            ) : !plansLoading && !plansError ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stwórz własny plan"
                onPress={() => router.push('/create-workout')}
                style={({ pressed }) => pressed && styles.pressed}>
                <ObsidianCard contentStyle={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Nie masz jeszcze planu</Text>
                  <Text style={styles.emptyText}>Utwórz własną rozpiskę — pojawi się tutaj razem z mięśniami, które trenuje.</Text>
                </ObsidianCard>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
      <AppBottomBar
        activeTab={null}
        startActive
        bottomInset={insets.bottom}
        onNavigate={(tab) => {
          if (tab === 'training') router.replace('/(tabs)/training');
          if (tab === 'history') router.replace('/(tabs)/history');
          if (tab === 'account') router.replace('/(tabs)/account');
        }}
        onStart={() => undefined}
        onAiCoach={() => router.push('/ai-coach')}
      />
      <AppSidePanel
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onAiCoachPress={() => router.push('/ai-coach')}
        onHistoryPress={() => router.push('/(tabs)/history')}
        onAccountPress={() => router.push('/(tabs)/account')}
        plans={plans}
        plansLoading={plansLoading}
        plansError={plansError}
      />
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
  },
  page: {
    alignSelf: 'center',
    gap: 12,
    maxWidth: 760,
    width: '100%',
  },
  pageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
    minHeight: 50,
  },
  pageHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageEyebrow: {
    color: '#A3E635',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  pageTitle: {
    color: workoutColors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  headerIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(4,8,6,0.6)',
    borderColor: 'rgba(163,230,53,0.3)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  weekCard: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  weekSummary: {
    gap: 2,
    minWidth: 52,
  },
  weekLabel: {
    color: '#9AA69F',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  weekCount: {
    color: '#4ADE80',
    fontSize: 22,
    fontWeight: '900',
  },
  weekTotal: {
    color: '#9AA69F',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#7F8983',
    fontSize: 9.5,
    fontWeight: '800',
  },
  weekDayLabelToday: {
    color: '#A3E635',
  },
  weekDayDot: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'transparent',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  weekDayCompleted: {
    backgroundColor: '#22C55E',
  },
  weekDayToday: {
    backgroundColor: 'transparent',
    borderColor: '#4ADE80',
  },
  weekError: {
    color: '#fca5a5',
    flexBasis: '100%',
    fontSize: 11,
    lineHeight: 15,
  },
  orbit: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 2.5,
  },
  orbitBase: {
    ...StyleSheet.absoluteFill,
    borderColor: 'rgba(163,230,53,0.18)',
    borderRadius: 22,
    borderWidth: 1,
  },
  orbitInner: {
    borderRadius: 19.5,
    overflow: 'hidden',
  },
  shimmer: {
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 120,
  },
  quickCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickIcon: {
    alignItems: 'center',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  quickCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  quickTitle: {
    color: workoutColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  quickSubtitle: {
    color: '#8A948C',
    fontSize: 12.5,
  },
  proposedCard: {
    borderColor: 'rgba(163,230,53,0.22)',
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
  },
  proposedOrb: {
    backgroundColor: 'rgba(163,230,53,0.09)',
    borderRadius: 70,
    height: 140,
    position: 'absolute',
    right: -40,
    top: -40,
    width: 140,
  },
  proposedBadge: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(163,230,53,0.4)',
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  proposedBadgeText: {
    color: '#BEF264',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  proposedTitle: {
    color: workoutColors.text,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 10,
  },
  proposedMeta: {
    color: '#A9B5AC',
    fontSize: 12.5,
    marginTop: 3,
  },
  proposedHint: {
    color: '#C9D1CB',
    fontSize: 12.5,
    marginTop: 6,
  },
  proposedBars: {
    marginTop: 12,
  },
  startPressable: {
    borderRadius: 999,
    marginTop: 14,
  },
  startButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
  },
  startText: {
    color: '#04210F',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionEyebrow: {
    color: '#A3E635',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  sectionTitle: {
    color: workoutColors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  newButton: {
    alignItems: 'center',
    backgroundColor: '#0B0D0B',
    borderColor: 'rgba(163,230,53,0.4)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 40,
    paddingHorizontal: 14,
  },
  newButtonText: {
    color: '#BEF264',
    fontSize: 13,
    fontWeight: '800',
  },
  list: {
    gap: 10,
  },
  splitStrip: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
  },
  splitSegment: {
    height: '100%',
  },
  rowContent: {
    paddingBottom: 13,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 13,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: workoutColors.text,
    fontSize: 15.5,
    fontWeight: '900',
  },
  rowMeta: {
    color: '#7F8983',
    fontSize: 12,
    marginTop: 2,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingBottom: 3,
    paddingLeft: 7,
    paddingRight: 9,
    paddingTop: 3,
  },
  pillDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  pillLabel: {
    color: '#C9D1CB',
    fontSize: 11,
    fontWeight: '700',
  },
  pillPercent: {
    color: '#7F8983',
    fontWeight: '600',
  },
  noMuscles: {
    color: '#7F8983',
    fontSize: 11.5,
    marginTop: 8,
  },
  playButton: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  playFill: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    justifyContent: 'center',
  },
  moreButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 32,
  },
  moreText: {
    color: '#7F8983',
    fontSize: 18,
    fontWeight: '700',
  },
  menuRow: {
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
  },
  menuDelete: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.35)',
  },
  menuText: {
    color: '#D1D9D3',
    fontSize: 13,
    fontWeight: '800',
  },
  menuDeleteText: {
    color: '#FCA5A5',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  loadingText: {
    color: workoutColors.muted,
    fontSize: 12,
  },
  errorCard: {
    gap: 10,
    padding: 16,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  retryText: {
    color: workoutColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    gap: 6,
    padding: 18,
  },
  emptyTitle: {
    color: workoutColors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    color: workoutColors.muted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
