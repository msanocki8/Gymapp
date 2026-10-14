import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GlassPanel } from '@/components/glass-panel';
import { GlassScreen } from '@/components/glass-screen';
import { useGymApp } from '@/hooks/use-gym-app';

const accent = '#22C55E';

export default function DashboardScreen() {
  const router = useRouter();
  const { userName, plans, plansLoading, plansError, reloadPlans, sessions } = useGymApp();
  const initials = userName.trim().slice(0, 1).toLocaleUpperCase() || 'T';
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklyWorkoutCount = sessions.filter((session) => session.completedAt >= weekStart.getTime()).length;
  const completedWeeklyGoal = Math.min(weeklyWorkoutCount, 3);
  const indicatorPulse = useSharedValue(0);

  useEffect(() => {
    indicatorPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [indicatorPulse]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: 0.68 + indicatorPulse.value * 0.32,
    transform: [{ scale: 0.85 + indicatorPulse.value * 0.15 }],
  }));

  return (
    <GlassScreen edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-[560px] px-4 pb-8 pt-3 sm:px-5 sm:pt-5">
          <View className="mb-7 flex-row items-center justify-between">
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#07150D]">
                <SymbolView name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} size={21} tintColor={accent} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[10px] font-bold tracking-[2px] text-white/55">GYM LOG</Text>
                <Text className="mt-1 text-[11px] font-medium text-white/75" numberOfLines={1}>
                  Twoje prywatne zapiski
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Otwórz konto, ${userName}`}
              onPress={() => router.push('/account')}
              className="ml-3 h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] active:scale-95">
              <Text className="text-lg font-extrabold text-white">{initials}</Text>
              <View className="absolute bottom-0.5 right-0 h-3 w-3 rounded-full border-2 border-ink-950 bg-[#22C55E]" />
            </Pressable>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-white/55">Dzień dobry,</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              className="mt-1 shrink text-[34px] font-black leading-[40px] tracking-tight text-white">
              {userName}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-white/55">
              Gotowy na jeszcze jeden dobry dzień? <Text className="text-[#22C55E]">✦</Text>
            </Text>
          </View>

          <GlassPanel className="mb-5 rounded-[24px] px-5 py-4" delay={70} contentClassName="flex-row items-center justify-between gap-4">
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-bold tracking-[1.8px] text-white/45">TWÓJ TYDZIEŃ</Text>
              <View className="mt-1 flex-row items-baseline">
                <Text className="text-[25px] font-extrabold leading-8 text-[#22C55E]">{completedWeeklyGoal}</Text>
                <Text className="text-sm font-semibold text-white/50"> / 3 treningi</Text>
              </View>
            </View>
            <View className="flex-row gap-2" accessibilityLabel={`${weeklyWorkoutCount} z 3 treningów wykonane`}>
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  className={`h-2.5 w-6 rounded-full ${index < completedWeeklyGoal ? 'bg-neon' : 'bg-white/10'}`}
                />
              ))}
            </View>
          </GlassPanel>

          <GlassPanel tone="lime" radius={30} className="mb-7" delay={140} contentClassName="p-5 sm:p-6">
            <View className="mb-5 flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-row items-center gap-2 rounded-full border border-neon/25 bg-neon/10 px-3 py-2">
                <Animated.View className="h-2 w-2 shrink-0 rounded-full bg-neon" style={indicatorStyle} />
                <Text className="shrink text-[9px] font-extrabold tracking-[1.2px] text-neon" numberOfLines={1}>
                  KROK 1 Z 3 · CZAS NA RUCH
                </Text>
              </View>
              <SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={18} tintColor={accent} />
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              className="text-[27px] font-black leading-[34px] tracking-tight text-white">
              Zrób coś swojego.
            </Text>
            <Text className="mt-2 max-w-[310px] text-[13px] leading-[19px] text-white/55">
              Nawet najmniejszy ruch się liczy. Załóż buty i idź po swoje.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/workout-flow')}
              className="mt-5 min-h-[54px] flex-row items-center justify-center gap-3 rounded-2xl bg-neon px-4 active:scale-[0.98]">
              <SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={17} tintColor="#07110A" />
              <Text
                numberOfLines={1}
                className="shrink text-center text-sm font-extrabold text-[#07110A]">
                Rozpocznij trening
              </Text>
            </Pressable>
            <View className="mt-4 flex-row items-center gap-2">
              <SymbolView name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }} size={14} tintColor={accent} />
              <Text className="min-w-0 flex-1 text-[11px] font-medium leading-4 text-white/50">
                Twój plan. Twoje tempo. Twój progres.
              </Text>
            </View>
          </GlassPanel>

          <View className="mb-3 flex-row items-end justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-bold tracking-[1.8px] text-neon">DODANE PLANY</Text>
              <Text className="mt-1 text-[20px] font-extrabold leading-6 text-white" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                Twoje poranne treningi
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/workout-flow')}
              hitSlop={8}
              className="shrink-0 flex-row items-center pb-1">
              <Text className="text-xs font-bold text-neon">Wszystkie</Text>
              <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={14} tintColor={accent} />
            </Pressable>
          </View>

          {plansLoading ? (
            <View className="mb-4 flex-row items-center gap-2">
              <ActivityIndicator color={accent} size="small" />
              <Text className="text-xs text-white/50">Wczytywanie Twoich planów…</Text>
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

          <View className="gap-3">
            {plans.slice(0, 3).map((plan, index) => (
              <GlassPanel
                key={plan.id}
                tone={index === 1 ? 'mint' : 'neutral'}
                delay={220 + index * 75}
                className="rounded-[22px]"
                contentClassName="min-h-[78px]">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rozpocznij ${plan.name}, ${plan.duration} minut`}
                  onPress={() => router.push('/workout-flow')}
                  className="min-h-[78px] flex-row items-center gap-2.5 p-3 active:bg-white/[0.06]">
                  <View className={`h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${index === 1 ? 'bg-mint/10' : 'bg-neon/10'}`}>
                    <SymbolView
                      name={{ ios: index === 1 ? 'figure.run' : 'dumbbell.fill', android: index === 1 ? 'directions_run' : 'fitness_center', web: index === 1 ? 'directions_run' : 'fitness_center' }}
                      size={20}
                      tintColor={index === 1 ? '#83F3C0' : accent}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[14px] font-bold text-white" numberOfLines={1} ellipsizeMode="tail">
                      {plan.name}
                    </Text>
                    <Text className="mt-1 text-[11px] text-white/45" numberOfLines={1} ellipsizeMode="tail">
                      {plan.focus}
                    </Text>
                  </View>
                  <View className="min-w-[48px] shrink-0 items-end gap-1">
                    <Text className="text-[11px] font-bold text-white" numberOfLines={1}>{plan.duration} min</Text>
                    <Text className="text-[9px] font-semibold tracking-wide text-white/35" numberOfLines={1}>{plan.exercises.length} ĆW.</Text>
                  </View>
                  <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={13} tintColor="#899284" />
                </Pressable>
              </GlassPanel>
            ))}
          </View>

          {plans.length === 0 ? (
            <GlassPanel className="mt-3 rounded-[22px] p-4" contentClassName="flex-row items-center gap-3">
              <SymbolView name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }} size={20} tintColor={accent} />
              <Text className="min-w-0 flex-1 text-xs leading-5 text-white/60">
                Dodaj swój pierwszy plan, a będzie czekał tutaj na kolejny trening.
              </Text>
            </GlassPanel>
          ) : null}

          <View className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
            <SymbolView name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }} size={13} tintColor="#83F3C0" />
            <Text className="shrink text-center text-[11px] font-medium text-white/45" numberOfLines={2}>
              Regularność wygrywa z perfekcją. Działaj po swojemu.
            </Text>
          </View>
          <View className="h-5" />
        </View>
      </ScrollView>
    </GlassScreen>
  );
}
