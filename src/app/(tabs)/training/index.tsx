import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { cssInterop } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import glassTokens from '@/constants/glass-tokens.json';
import { AmbientBackground } from '@/components/ambient-background';
import { AppSidePanel } from '@/components/app-side-panel';
import { ObsidianCard } from '@/components/obsidian-card';
import { useGymApp } from '@/hooks/use-gym-app';
import type { WorkoutPlan } from '@/hooks/use-gym-app';
import { useAuth } from '@/hooks/use-auth';
import { countWorkoutsThisWeek } from '@/lib/workout-goal';
import { FilledPlayIcon } from '@/components/filled-play-icon';

type CrossPlatformShadowStyle = ViewStyle & { boxShadow?: string };

const cardShadow: CrossPlatformShadowStyle = Platform.OS === 'web'
  ? { boxShadow: '0 10px 28px rgba(0, 0, 0, 0.26)' }
  : {
      shadowColor: '#000000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    };

const softStartButtonGlow: CrossPlatformShadowStyle = Platform.OS === 'web'
  ? { boxShadow: '0 0 16px rgba(163, 230, 53, 0.32), 0 8px 22px rgba(163, 230, 53, 0.16)' }
  : {
      shadowColor: '#A3E635',
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    };

const HERO_RADIUS = 40;
const heroBorderGradient = [glassTokens.colors.glass.border, 'rgba(255,255,255,0.08)', 'rgba(134,239,172,0.30)'] as const;
const heroFillGradient = ['#000000', '#000000', '#020F06', '#041C0B', '#06331A'] as const;
const heroFillLocations = [0, 0.4, 0.6, 0.78, 1] as const;

function HeroGlowCard({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={heroBorderGradient} locations={[0, 0.5, 1]} style={styles.heroBorder}>
      <View style={styles.heroInner}>
        <LinearGradient
          pointerEvents="none"
          colors={heroFillGradient}
          locations={heroFillLocations}
          style={StyleSheet.absoluteFill}
        />
        <Svg
          pointerEvents="none"
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="heroGlow" cx="52" cy="96" rx="70" ry="40" fx="52" fy="96" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="rgb(100,165,56)" stopOpacity="0.6" />
              <Stop offset="0.22" stopColor="rgb(80,145,42)" stopOpacity="0.5" />
              <Stop offset="0.5" stopColor="rgb(44,110,36)" stopOpacity="0.3" />
              <Stop offset="0.8" stopColor="rgb(20,90,34)" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#heroGlow)" />
        </Svg>
        <View style={styles.heroContent}>{children}</View>
      </View>
    </LinearGradient>
  );
}

const blurMethod = Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined;
const LocalBlurTargetContext = createContext<RefObject<ComponentRef<typeof View> | null> | null>(null);
const cardTopGradient = [
  glassTokens.gradients.cardTop[0],
  glassTokens.gradients.cardTop[1],
  glassTokens.gradients.cardTop[2],
] as const;
const startButtonGradient = [
  glassTokens.gradients.startButton[0],
  glassTokens.gradients.startButton[1],
] as const;

cssInterop(LinearGradient, { className: 'style' });

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

function GlassCard({
  children,
  className = '',
  contentClassName = '',
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const blurTarget = useContext(LocalBlurTargetContext);

  return (
    <View
      className={`relative w-full overflow-hidden rounded-[26px] border border-glass-border bg-glass-fill ${className}`}
      style={cardShadow}>
      {Platform.OS !== 'web' ? (
        <BlurView
          pointerEvents="none"
          blurMethod={blurMethod}
          blurTarget={blurTarget ?? undefined}
          intensity={18}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
        />
      ) : null}
      <LinearGradient
        pointerEvents="none"
        colors={cardTopGradient}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
        style={{ borderRadius: 26 }}
      />
      <View className={`relative z-10 ${contentClassName}`}>{children}</View>
    </View>
  );
}

function WorkoutPlanCard({
  workout,
  onPress,
}: {
  workout: WorkoutPlan;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Otwórz plan ${workout.name}`}
      onPress={onPress}
      className="w-full active:opacity-80">
      <ObsidianCard contentStyle={styles.planContent}>
        <View style={styles.planIcon}>
          <AppIcon
            name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }}
            size={19}
            color="#F0ABFC"
          />
        </View>
        <View className="min-w-0 flex-1 gap-[3px]">
          <Text numberOfLines={1} className="text-[15px] font-black text-text-primary">
            {workout.name}
          </Text>
          <Text numberOfLines={1} className="text-[12px] text-text-muted">
            {formatDuration(workout.duration)} · {formatExerciseCount(workout.exercises.length)}
          </Text>
          <Text numberOfLines={1} className="text-[12px] text-text-muted">
            {workout.focus}
          </Text>
        </View>
        <AppIcon
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          color="#A3E635"
        />
      </ObsidianCard>
    </Pressable>
  );
}

export default function TrainingHomeScreen() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
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
    <SafeAreaView edges={['top']} className="flex-1 overflow-hidden bg-ink-950">
      <AmbientBackground blurTarget={blurTarget} />
      <LocalBlurTargetContext.Provider value={blurTarget}>
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-[560px] gap-[22px]">
          <View className="flex-row items-center justify-between gap-[14px]">
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center">
                <View className="mr-2 h-[28px] flex-row items-center gap-[7px] rounded-full bg-[#4ADE80] px-[11px]">
                  <AppIcon
                    name={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }}
                    size={14}
                    color="#06210D"
                  />
                  <Text className="text-[12px] font-black tracking-[1.4px] text-[#06210D]">GYM LOG</Text>
                </View>
              </View>
              <Text className="ml-[2px] mt-[4px] text-[12px] text-text-muted">
                Twoje prywatne zapiski
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Otwórz menu"
              onPress={() => setIsMenuOpen(true)}
              className="h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/35 active:opacity-75">
              <AppIcon
                name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
                size={20}
                color="#A3E635"
              />
            </Pressable>
          </View>

          <View className="min-w-0 py-[2px]">
            <Text className="text-[26px] font-extrabold leading-[32px] tracking-[-0.7px] text-text-primary">
              Cześć, <Text className="text-neon-lime">{userName}</Text>
            </Text>
          </View>

          <GlassCard contentClassName="w-full px-5 py-[17px]">
            <View className="flex-row items-center justify-between gap-[14px]">
              <View className="gap-[5px]">
                <View className="flex-row items-center gap-[8px]">
                  <View className="h-[7px] w-[7px] rounded-full bg-neon-bright" />
                  <Text className="text-[11px] font-black tracking-[1.7px] text-neon-bright">
                    TWÓJ TYDZIEŃ
                  </Text>
                </View>
                <Text className="text-[28px] font-black leading-[32px] text-neon-green">
                  {sessionsLoading ? '…' : completedWorkouts}
                  <Text className="text-[13px] font-medium text-text-muted">
                    {' '}z {weeklyWorkoutGoal} {weeklyWorkoutGoal === 1 ? 'treningu' : 'treningów'}
                  </Text>
                </Text>
              </View>
              <View
                className="w-[124px] flex-row gap-1"
                accessibilityLabel={`${completedWorkouts} z ${weeklyWorkoutGoal} ${weeklyWorkoutGoal === 1 ? 'treningu' : 'treningów'}`}>
                {Array.from({ length: weeklyWorkoutGoal }, (_, segment) => (
                  <View
                    key={segment}
                    className={`h-[5px] min-w-0 flex-1 rounded-full ${
                      segment < completedWorkouts ? 'bg-neon-bright' : 'bg-white/[0.14]'
                    }`}
                    style={segment < completedWorkouts ? styles.progressGlow : undefined}
                  />
                ))}
              </View>
            </View>
            {sessionsError ? (
              <Text className="mt-[10px] text-[12px] leading-[18px] text-red-300">
                Nie udało się pobrać postępów. Spróbuj odświeżyć ekran.
              </Text>
            ) : null}
          </GlassCard>

          <HeroGlowCard>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-[8px] rounded-full border border-neon-bright/30 bg-neon-green/10 px-[12px] py-[8px]">
                <View className="h-[7px] w-[7px] rounded-full bg-neon-lime" />
                <Text className="text-[10px] font-black tracking-[1.1px] text-neon-lime">
                  KROK 1 Z 3  ·  CZAS NA RUCH
                </Text>
              </View>
              <AppIcon
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                size={20}
                color="#A3E635"
              />
            </View>
            <Text className="mt-[20px] text-[32px] font-black leading-[37px] tracking-[-0.8px] text-text-primary">
              Zrób coś
            </Text>
            <Text className="text-[32px] font-black leading-[37px] tracking-[-0.8px] text-neon-lime">
              swojego.
            </Text>
            <Text className="mt-[12px] max-w-[370px] text-[14px] leading-[21px] text-text-muted">
              Nawet najmniejszy ruch się liczy. Załóż buty i idź po swoje.
            </Text>
            <View className="mt-[20px] gap-[14px]">
              <View className="w-full overflow-visible rounded-full" style={softStartButtonGlow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rozpocznij trening"
                  onPress={() => router.push('/workout-flow')}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.14)' }}
                  className="min-h-[56px] w-full overflow-hidden rounded-full active:opacity-85">
                  <LinearGradient
                    colors={startButtonGradient}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    className="min-h-[56px] w-full flex-row items-center justify-center gap-[11px] rounded-full px-4">
                    <FilledPlayIcon size={17} color="#07150C" />
                    <Text className="text-[16px] font-black text-[#07150C]">
                      Rozpocznij trening
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
              <View className="flex-row items-center gap-[9px]">
                <AppIcon
                  name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }}
                  size={15}
                  color="#A3E635"
                />
                <Text className="text-[13px] font-semibold text-text-muted">
                  Twój plan. Twoje tempo. Twój progres.
                </Text>
              </View>
            </View>
          </HeroGlowCard>

          <View className="gap-[13px]">
            <View className="flex-row items-end justify-between gap-[10px] px-px">
              <View className="min-w-0 flex-1">
                <Text className="mb-[5px] text-[10px] font-black tracking-[1.6px] text-neon-lime">
                  DODANE PLANY
                </Text>
                <Text className="text-[22px] font-black leading-[27px] tracking-[-0.4px] text-text-primary">
                  Twoje poranne treningi
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/workout-flow')}
                className="flex-row items-center gap-[5px] py-[7px] pl-2 active:opacity-75">
                <Text className="text-[12px] font-bold text-neon-bright">Wszystkie</Text>
                <AppIcon
                  name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                  size={13}
                  color="#A3E635"
                />
              </Pressable>
            </View>

            {plansLoading ? (
              <GlassCard contentClassName="min-h-[86px] flex-row items-center justify-center gap-[11px] p-[18px]">
                <ActivityIndicator color="#A3E635" />
                <Text className="text-[13px] text-text-primary">Ładowanie Twoich planów…</Text>
              </GlassCard>
            ) : plansError ? (
              <GlassCard contentClassName="gap-3 p-[17px]">
                <Text className="text-[13px] leading-[19px] text-red-200">{plansError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void reloadPlans();
                    void reloadSessions();
                  }}
                  className="self-start rounded-xl bg-red-400/10 px-[11px] py-[7px]">
                  <Text className="text-[12px] font-bold text-red-300">Spróbuj ponownie</Text>
                </Pressable>
              </GlassCard>
            ) : plans.length > 0 ? (
              <View className="gap-[10px]">
                {plans.slice(0, 3).map((workout) => (
                  <WorkoutPlanCard
                    key={workout.id}
                    workout={workout}
                    onPress={() => router.push({ pathname: '/workout-session', params: { planId: workout.id } })}
                  />
                ))}
              </View>
            ) : (
              <GlassCard contentClassName="gap-2 p-[18px]">
                <Text className="text-[14px] font-extrabold text-text-primary">
                  Zacznij od własnego planu
                </Text>
                <Text className="text-[12px] leading-[18px] text-text-muted">
                  Dodaj ćwiczenia i zapisz trening na swoim koncie.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/create-workout')}
                  className="mt-[5px] self-start flex-row items-center gap-2 py-2">
                  <Text className="text-[12px] font-extrabold text-neon-bright">Utwórz plan</Text>
                  <AppIcon name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} color="#4ADE80" />
                </Pressable>
              </GlassCard>
            )}
          </View>
        </View>
        </ScrollView>
      </LocalBlurTargetContext.Provider>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroBorder: {
    borderRadius: HERO_RADIUS,
    padding: 1,
    width: '100%',
  },
  heroInner: {
    borderRadius: HERO_RADIUS - 1,
    overflow: 'hidden',
  },
  heroContent: {
    padding: 25,
  },
  planContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  planIcon: {
    alignItems: 'center',
    backgroundColor: '#0E110F',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  progressGlow: Platform.select({
    web: { boxShadow: '0 0 8px rgba(74, 222, 128, 0.4)' } as ViewStyle,
    default: {
      shadowColor: '#4ADE80',
      shadowOpacity: 0.4,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 0 },
    },
  }),
});
