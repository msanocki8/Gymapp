import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { WorkoutScreen, workoutColors } from '@/components/workout-ui';
import { useAuth } from '@/hooks/use-auth';
import { useGymApp } from '@/hooks/use-gym-app';
import { requireSupabase } from '@/lib/supabase';
import { parseSharedWorkoutPlan, type SharedWorkoutPlan } from '@/lib/shared-workout-plan';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function SharedWorkoutPlanScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addPlan } = useGymApp();
  const [loadedPlan, setLoadedPlan] = useState<{
    token: string;
    plan: SharedWorkoutPlan | null;
    error: string | null;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const validToken = uuidPattern.test(token);
  const currentPlan = loadedPlan?.token === token ? loadedPlan : null;
  const plan = currentPlan?.plan ?? null;
  const loading = validToken && currentPlan === null;
  const error = validToken
    ? currentPlan?.error ?? null
    : 'Ten link jest nieprawidłowy lub wygasł.';

  useEffect(() => {
    let active = true;
    if (!uuidPattern.test(token)) return () => { active = false; };

    void Promise.resolve()
      .then(() => requireSupabase().rpc('get_shared_workout_plan', { p_token: token }))
      .then(({ data, error: rpcError }) => {
        if (!active) return;
        if (rpcError) {
          setLoadedPlan({
            token,
            plan: null,
            error: 'Nie udało się pobrać planu. Spróbuj ponownie później.',
          });
          return;
        }
        const sharedPlan = parseSharedWorkoutPlan(data[0]);
        setLoadedPlan({
          token,
          plan: sharedPlan,
          error: sharedPlan ? null : 'Ten link jest nieprawidłowy lub wygasł.',
        });
      })
      .catch(() => {
        if (active) {
          setLoadedPlan({
            token,
            plan: null,
            error: 'Nie udało się pobrać planu. Spróbuj ponownie później.',
          });
        }
      });

    return () => { active = false; };
  }, [token]);

  async function importPlan() {
    if (!plan || importing || authLoading) return;
    if (!user) {
      router.push({
        pathname: '/(auth)/login',
        params: { returnTo: `/share/${token}` },
      });
      return;
    }

    setImporting(true);
    setActionError(null);
    setNotice(null);
    try {
      await addPlan({ ...plan, source: 'imported' });
      setNotice('Plan dodany do Twoich planów.');
    } catch (importError) {
      setActionError(importError instanceof Error ? importError.message : 'Nie udało się dodać planu.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <WorkoutScreen maxWidth={680} edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 48 }}>
        <View className="mx-auto w-full max-w-[560px] flex-1">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/training')}
            className="mb-8 self-start rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5">
            <Text className="text-sm font-bold text-white/75">Wróć</Text>
          </Pressable>

          <Text className="text-[10px] font-bold tracking-[2px] text-neon">UDOSTĘPNIONY TRENING</Text>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={workoutColors.neon} />
              <Text className="mt-3 text-sm text-white/55">Wczytywanie planu…</Text>
            </View>
          ) : error && !plan ? (
            <View className="mt-5 rounded-3xl border border-red-400/20 bg-red-400/[0.06] p-5">
              <Text accessibilityRole="alert" className="text-sm leading-6 text-red-200">{error}</Text>
            </View>
          ) : plan ? (
            <>
              <Text className="mb-2 mt-3 text-[30px] font-black tracking-tight text-white">{plan.name}</Text>
              <Text className="mb-6 text-sm text-white/50">{plan.focus} · {plan.duration} min</Text>

              <View className="gap-3">
                {(plan.exerciseConfigs?.length
                  ? plan.exerciseConfigs
                  : plan.exercises.map((name) => ({ name, sets: [] }))).map((exercise, index) => (
                  <View key={`${exercise.name}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <Text className="text-sm font-bold text-white">{index + 1}. {exercise.name}</Text>
                    {exercise.sets.length ? (
                      <Text className="mt-2 text-xs leading-5 text-white/55">
                        {exercise.sets.map((set) => `${set.weight ? `${set.weight} kg × ` : ''}${set.reps || '—'}`).join('  ·  ')}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>

              {actionError ? <Text accessibilityRole="alert" className="mt-4 text-sm leading-5 text-red-200">{actionError}</Text> : null}
              {notice ? <Text accessibilityRole="alert" className="mt-4 text-sm font-bold text-neon">{notice}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: importing || authLoading }}
                disabled={importing || authLoading}
                onPress={() => { void importPlan(); }}
                className="mt-7 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-neon px-5 active:opacity-80">
                {importing ? <ActivityIndicator color="#07110A" /> : null}
                <Text className="text-sm font-extrabold text-[#07110A]">
                  {importing ? 'Dodawanie planu…' : 'Dodaj do moich planów'}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </WorkoutScreen>
  );
}
