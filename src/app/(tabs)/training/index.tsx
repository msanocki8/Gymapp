import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { cssInterop } from 'nativewind';
import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ScrollViewInstance, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import glassTokens from '@/constants/glass-tokens.json';
import { APP_BOTTOM_BAR_CONTENT_HEIGHT } from '@/components/app-bottom-bar';
import { AmbientBackground } from '@/components/ambient-background';
import { AppSidePanel } from '@/components/app-side-panel';
import { GymFlame, GymLogoTile } from '@/components/gym-flame';
import { HomeLastWorkout } from '@/components/home-last-workout';
import { ObsidianCard } from '@/components/obsidian-card';
import { useGymApp } from '@/hooks/use-gym-app';
import { useAuth } from '@/hooks/use-auth';
import { countWorkoutsThisWeek } from '@/lib/workout-goal';
import { FilledPlayIcon } from '@/components/filled-play-icon';

type CrossPlatformShadowStyle = ViewStyle & { boxShadow?: string };

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

const LocalBlurTargetContext = createContext<RefObject<ComponentRef<typeof View> | null> | null>(null);
const startButtonGradient = [
  glassTokens.gradients.startButton[0],
  glassTokens.gradients.startButton[1],
] as const;

cssInterop(LinearGradient, { className: 'style' });

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

export default function TrainingHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const weekDays = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const isToday = dayStart.toDateString() === today.toDateString();
      const trained = sessions.some((session) =>
        session.completedAt >= dayStart.getTime() && session.completedAt < dayEnd.getTime());

      return {
        key: dayStart.toISOString(),
        label: ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'][index],
        isToday,
        trained,
      };
    });
  }, [sessions]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void reloadPlans();
      void reloadSessions();
    }, [reloadPlans, reloadSessions]),
  );

  return (
    <View className="flex-1 bg-[#0A0D0B]">
      <AmbientBackground blurTarget={blurTarget} />
      <LocalBlurTargetContext.Provider value={blurTarget}>
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: insets.top,
            paddingBottom: APP_BOTTOM_BAR_CONTENT_HEIGHT + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-[560px] gap-[22px]">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3">
              <GymLogoTile size={54} />
              <View className="gap-[3px]">
                <Text accessibilityRole="header" className="text-[18px] font-black tracking-[2.4px] text-text-primary">
                  GYM<Text className="text-neon-lime">LOG</Text>
                </Text>
                <Text className="text-[11px] font-semibold tracking-[1.6px] text-text-muted">
                  TWÓJ DZIENNIK TRENINGOWY
                </Text>
              </View>
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

          <ObsidianCard contentStyle={styles.weekCard}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-neon-lime" style={styles.weekDot} />
                <Text className="text-[11px] font-black tracking-[2px] text-text-muted">TWÓJ TYDZIEŃ</Text>
              </View>
              <Text className="text-[13px] font-semibold text-neon-lime">
                {sessionsLoading ? '…' : completedWorkouts} / {weeklyWorkoutGoal} cel
              </Text>
            </View>
            <View className="mt-4 flex-row justify-between">
              {weekDays.map((day) => {
                const variant = day.trained ? 'lit' : day.isToday ? 'today' : 'off';
                return (
                  <View
                    key={day.key}
                    accessible
                    accessibilityLabel={`${day.label}${day.isToday ? ', dzisiaj' : ''}${day.trained ? ', trening zrobiony' : ''}`}
                    className="items-center gap-1">
                    <GymFlame size={25} variant={variant} />
                    <Text className={`text-[10px] font-bold ${day.isToday ? 'text-neon-lime' : 'text-text-muted'}`}>
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            {sessionsError ? (
              <Text className="mt-3 text-[12px] leading-[18px] text-red-300">
                Nie udało się pobrać postępów. Spróbuj odświeżyć ekran.
              </Text>
            ) : null}
          </ObsidianCard>

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

          <HomeLastWorkout
            sessions={sessions}
            loading={sessionsLoading}
            error={sessionsError}
            onRetry={() => {
              void reloadSessions();
            }}
            onOpenHistory={() => router.push('/(tabs)/history')}
            onStart={() => router.push('/workout-flow')}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  weekCard: {
    gap: 0,
    padding: 16,
  },
  weekDot: Platform.select({
    web: { boxShadow: '0 0 10px rgba(163, 230, 53, 0.65)' } as ViewStyle,
    default: {
      shadowColor: '#A3E635',
      shadowOpacity: 0.75,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
  }),
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
});
