import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { GlassPanel } from '@/components/glass-panel';
import { GlassScreen } from '@/components/glass-screen';
import { NeonText } from '@/components/neon-text';
import { WorkoutSession, useGymApp } from '@/hooks/use-gym-app';

function SessionDetails({ session, onBack }: { session: WorkoutSession; onBack: () => void }) {
  const setCount = session.exercisePerformance?.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0;

  return (
    <GlassScreen edges={['top']}>
      <View className="flex-1">
        <View className="mx-auto w-full max-w-[560px] flex-row items-center gap-3 px-5 pb-4 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Wróć do historii"
            onPress={onBack}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] active:bg-white/10">
            <Text className="text-3xl leading-9 text-white">‹</Text>
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-[10px] font-extrabold tracking-[2px]" style={{ color: '#83F3C0' }}>PODSUMOWANIE TRENINGU</Text>
            <Text className="mt-1 text-xl font-black tracking-tight text-white" numberOfLines={1}>{session.name}</Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/10">
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={19} tintColor="#22C55E" />
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="mx-auto w-full max-w-[560px] px-5" style={{ paddingTop: 12, paddingBottom: 40, rowGap: 28 }}>
            <GlassPanel tone="lime" radius={18} className="mb-0" style={{ overflow: 'hidden', borderRadius: 18 }} contentStyle={{ padding: 20 }}>
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-[#83F3C0]/25 bg-[#83F3C0]/10">
                  <SymbolView name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} size={22} tintColor="#83F3C0" />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="self-start rounded-full border border-[#22C55E]/25 bg-[#22C55E]/15 px-2.5 py-1">
                    <Text className="text-[9px] font-extrabold tracking-[1px]" style={{ color: '#83F3C0' }}>ZAKOŃCZONY</Text>
                  </View>
                  <Text className="mt-2 text-sm font-bold text-white/75" numberOfLines={1}>{session.focus}</Text>
                </View>
              </View>
              <View className="mt-5 flex-row items-center border-t border-white/[0.14]" style={{ marginTop: 20, paddingTop: 16 }}>
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} size={15} tintColor="#B1C0B4" />
                  <Text className="min-w-0 flex-1 text-xs font-semibold text-white/75" numberOfLines={1}>{session.date}</Text>
                </View>
                <View className="ml-3 flex-row items-center gap-2">
                  <SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={15} tintColor="#B1C0B4" />
                  <Text className="text-xs font-semibold text-white/75">{session.duration} min</Text>
                </View>
              </View>
            </GlassPanel>

            <View className="mt-1 flex-row items-end justify-between">
              <View>
                <Text className="text-[10px] font-extrabold tracking-[1.8px]" style={{ color: '#83F3C0' }}>TWÓJ WYNIK</Text>
                <Text className="mt-2 text-[22px] font-black" style={{ color: '#F4F7F0' }}>Trening w liczbach</Text>
              </View>
              <Text className="pb-1 text-xs font-semibold" style={{ color: '#B9C7BC' }}>{session.totalExercises} ćw.</Text>
            </View>

            <View className="flex-row gap-3" style={{ columnGap: 12 }}>
              <GlassPanel
                tone="neutral"
                radius={16}
                className="min-w-0 flex-1"
                style={{ overflow: 'hidden', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(220,240,224,0.22)' }}
                contentClassName="gap-2"
                contentStyle={{ padding: 16 }}>
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center bg-[#22C55E]/10" style={{ borderRadius: 10 }}>
                  <SymbolView name={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }} size={18} tintColor="#22C55E" />
                  </View>
                  <Text style={{ color: '#F4F7F0', fontSize: 22, lineHeight: 27, fontWeight: '900' }}>
                    {session.completedExercises}<Text style={{ color: '#C4D0C6', fontSize: 15, fontWeight: '700' }}>/{session.totalExercises}</Text>
                  </Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#E2F2E5', fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.7 }}>
                  ĆWICZENIA
                </Text>
              </GlassPanel>
              <GlassPanel
                tone="mint"
                radius={16}
                className="min-w-0 flex-1"
                style={{ overflow: 'hidden', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(131,243,192,0.28)' }}
                contentClassName="gap-2"
                contentStyle={{ padding: 16 }}>
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center bg-[#83F3C0]/10" style={{ borderRadius: 10 }}>
                  <SymbolView name={{ ios: 'repeat', android: 'repeat', web: 'repeat' }} size={18} tintColor="#83F3C0" />
                  </View>
                  <Text style={{ color: '#F4F7F0', fontSize: 22, lineHeight: 27, fontWeight: '900' }}>{setCount}</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: '#D7FFF0', fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.5 }}>
                  ZAPISANE SERIE
                </Text>
              </GlassPanel>
            </View>

            <View className="mt-2 flex-row items-end justify-between border-t border-[#83F3C0]/25 pt-6" style={{ paddingTop: 24 }}>
              <View>
                <Text className="text-[10px] font-extrabold tracking-[1.8px]" style={{ color: '#83F3C0' }}>SZCZEGÓŁY SESJI</Text>
                <Text className="mt-2 text-[22px] font-black" style={{ color: '#F4F7F0' }}>Ćwiczenia</Text>
              </View>
              {session.exercisePerformance?.length ? (
                <Text className="text-xs font-semibold" style={{ color: '#B9C7BC' }}>{session.exercisePerformance.length} zapisane</Text>
              ) : null}
            </View>
            {session.exercisePerformance?.length ? (
              <View style={{ rowGap: 22 }}>
                {session.exercisePerformance.map((exercise, exerciseIndex) => (
                  <GlassPanel
                    key={`${exercise.name}-${exerciseIndex}`}
                    tone={exerciseIndex % 2 === 0 ? 'neutral' : 'mint'}
                    radius={16}
                    className="mb-0"
                    style={{ overflow: 'hidden', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(220,240,224,0.2)' }}
                    contentStyle={{ padding: 18 }}>
                    <View className="flex-row items-center gap-4 border-b border-[#83F3C0]/20 pb-5" style={{ paddingBottom: 18 }}>
                      <View className="h-12 w-12 items-center justify-center border border-[#83F3C0]/25 bg-[#22C55E]/10" style={{ borderRadius: 12 }}>
                        <Text className="text-sm font-black" style={{ color: '#83F3C0' }}>{String(exerciseIndex + 1).padStart(2, '0')}</Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-base font-extrabold" style={{ color: '#F4F7F0' }} numberOfLines={2}>{exercise.name}</Text>
                        <Text className="mt-2 text-xs font-semibold" style={{ color: '#D4DDD4' }}>
                          {exercise.sets.length} {exercise.sets.length === 1 ? 'zapisana seria' : 'zapisane serie'}
                        </Text>
                      </View>
                      <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={16} tintColor="#738078" />
                    </View>
                    <View className="mt-5 flex-row gap-3" style={{ marginTop: 22 }}>
                      <View className="w-[28%] flex-row items-center px-2">
                        <Text className="text-[10px] font-extrabold tracking-wide" style={{ color: '#83F3C0' }}>SERIA</Text>
                      </View>
                      <View className="min-w-0 flex-1 items-center justify-center px-2 py-3" style={{ backgroundColor: 'rgba(131,243,192,0.07)', borderColor: 'rgba(131,243,192,0.2)', borderWidth: 1, borderRadius: 10, paddingVertical: 13 }}>
                        <Text className="text-[10px] font-extrabold tracking-wide" style={{ color: '#CFFFEA' }}>CIĘŻAR</Text>
                      </View>
                      <View className="min-w-0 flex-1 items-center justify-center px-2 py-3" style={{ backgroundColor: 'rgba(131,243,192,0.07)', borderColor: 'rgba(131,243,192,0.2)', borderWidth: 1, borderRadius: 10, paddingVertical: 13 }}>
                        <Text className="text-[10px] font-extrabold tracking-wide" style={{ color: '#CFFFEA' }}>POWTÓRZENIA</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 16, rowGap: 14 }}>
                      {exercise.sets.map((set, setIndex) => (
                        <View key={`${exercise.name}-set-${setIndex}`} className="flex-row items-center gap-3 px-3 py-4" style={{ backgroundColor: 'rgba(131,243,192,0.075)', borderColor: 'rgba(131,243,192,0.2)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 18 }}>
                          <View className="w-[28%] flex-row items-center gap-2 px-1">
                            <View className="h-8 w-8 items-center justify-center border border-[#83F3C0]/25 bg-[#22C55E]/15" style={{ borderRadius: 10 }}>
                              <Text className="text-xs font-black" style={{ color: '#83F3C0' }}>{setIndex + 1}</Text>
                            </View>
                            <Text className="text-[10px] font-bold" style={{ color: '#E3EEE5' }}>SERIA</Text>
                          </View>
                          <View className="min-w-0 flex-1 items-center">
                            <Text className="text-base font-extrabold" style={{ color: set.weight.trim() ? '#83F3C0' : '#F4F7F0' }}>
                              {set.weight.trim() ? `${set.weight} kg` : '—'}
                            </Text>
                          </View>
                          <View className="min-w-0 flex-1 items-center">
                            <Text className="text-base font-extrabold" style={{ color: set.reps.trim() ? '#83F3C0' : '#F4F7F0' }}>
                              {set.reps.trim() || '—'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </GlassPanel>
                ))}
              </View>
            ) : (
              <View className="items-center rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] px-6 py-8">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
                  <SymbolView name={{ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }} size={22} tintColor="#7C8980" />
                </View>
                <Text className="mt-4 text-base font-extrabold text-white">Brak zapisanych serii</Text>
                <Text className="mt-2 text-center text-sm leading-5 text-white/55">
                  W tym treningu nie oznaczono żadnej serii jako wykonanej. Zaznaczaj fajką ukończone serie, aby zapisać ich ciężar i liczbę powtórzeń.
                </Text>
              </View>
            )}

            {session.notes?.trim() ? (
              <View className="rounded-[22px] border border-[#83F3C0]/10 bg-[#83F3C0]/[0.04] p-4">
                <View className="flex-row items-center gap-2">
                  <SymbolView name={{ ios: 'note.text', android: 'description', web: 'description' }} size={15} tintColor="#83F3C0" />
                  <Text className="text-[10px] font-extrabold tracking-[1px] text-[#83F3C0]">NOTATKA</Text>
                </View>
                <Text className="mt-3 text-sm leading-5 text-white/80">{session.notes.trim()}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </GlassScreen>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { sessions, sessionsLoading, sessionsError, reloadSessions, deleteSession } = useGymApp();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const today = new Date();
  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    const nextDay = date.getTime() + 24 * 60 * 60 * 1000;
    return {
      label: ['N', 'P', 'W', 'Ś', 'C', 'P', 'S'][date.getDay()],
      count: sessions.filter((session) => session.completedAt >= date.getTime() && session.completedAt < nextDay).length,
    };
  });
  const weekSessionCount = activity.reduce((total, day) => total + day.count, 0);
  const totalMinutes = sessions.reduce((total, session) => total + session.duration, 0);
  const activityMax = Math.max(1, ...activity.map((day) => day.count));
  const workoutCountForm = (count: number) => {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;
    if (count === 1) return 'trening';
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return 'treningi';
    return 'treningów';
  };
  const savedWord = sessions.length === 1 ? 'zapisany' : sessions.length >= 2 && sessions.length <= 4 ? 'zapisane' : 'zapisanych';

  const removeSession = async (session: WorkoutSession) => {
    setDeletingSessionId(session.id);
    setDeleteError(null);
    try {
      await deleteSession(session.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Nie udało się usunąć treningu.');
    } finally {
      setDeletingSessionId(null);
    }
  };
  const confirmRemoveSession = (session: WorkoutSession) => {
    const message = `Czy na pewno chcesz usunąć trening „${session.name}”?`;
    const onConfirm = () => { void removeSession(session); };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
      return;
    }

    Alert.alert('Usunąć trening?', message, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: onConfirm },
    ]);
  };

  if (selectedSession) {
    return <SessionDetails session={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  return (
    <GlassScreen edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-[560px] px-5 pb-10 pt-6">
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <NeonText className="text-[10px] font-bold tracking-[2px]">STATYSTYKI</NeonText>
              <Text className="mt-2 text-[32px] font-black tracking-tight text-white">Historia</Text>
              <Text className="mt-1 text-sm text-white/50">Regularność robi robotę.</Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <SymbolView name={{ ios: 'chart.bar.xaxis', android: 'monitoring', web: 'monitoring' }} size={20} tintColor="#22C55E" />
            </View>
          </View>

          <GlassPanel className="mb-4 rounded-[24px] py-5" delay={70} contentClassName="flex-row items-center">
            <View className="flex-1 items-center gap-1">
              <Text className="text-[26px] font-black text-white">{sessions.length}</Text>
              <Text className="text-[9px] font-bold tracking-[1.2px] text-white/40">{workoutCountForm(sessions.length).toUpperCase()}</Text>
            </View>
            <View className="h-10 w-px bg-white/10" />
            <View className="flex-1 items-center gap-1">
              <Text className="text-[26px] font-black text-white">
                {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}` : `${totalMinutes}`}
                <Text className="text-sm text-white/45">{totalMinutes >= 60 ? ' h' : ' min'}</Text>
              </Text>
              <Text className="text-[9px] font-bold tracking-[1.2px] text-white/40">W RUCHU</Text>
            </View>
            <View className="h-10 w-px bg-white/10" />
            <View className="flex-1 items-center gap-1">
              <NeonText className="text-[26px] font-black">{weekSessionCount}</NeonText>
              <Text className="text-[9px] font-bold tracking-[1.2px] text-white/40">TEN TYDZIEŃ</Text>
            </View>
          </GlassPanel>

          <GlassPanel className="mb-7 rounded-[26px] p-5" delay={150}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-white">Aktywność</Text>
                <Text className="mt-1 text-xs text-white/45">ostatnie 7 dni · {weekSessionCount} {workoutCountForm(weekSessionCount)}</Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-neon/10">
                <SymbolView name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }} size={18} tintColor="#22C55E" />
              </View>
            </View>
            <View className="mt-6 h-36 flex-row justify-between gap-3">
              {activity.map((day, index) => (
                <View key={`${day.label}-${index}`} className="flex-1 items-center justify-end gap-2">
                  <View className="w-full flex-1 items-center justify-end">
                    <View
                      className={`w-full max-w-[30px] rounded-full ${day.count > 0 ? 'bg-neon' : 'bg-white/10'}`}
                      style={{ height: `${day.count > 0 ? Math.max(12, (day.count / activityMax) * 100) : 5}%` }}
                    />
                  </View>
                  <Text className={`text-[10px] font-bold ${day.count > 0 ? 'text-neon' : 'text-white/35'}`}>{day.label}</Text>
                </View>
              ))}
            </View>
          </GlassPanel>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[20px] font-extrabold text-white">Ostatnie treningi</Text>
            <Text className="text-xs font-semibold text-white/40">{sessions.length} {savedWord}</Text>
          </View>
          {deleteError ? (
            <Text accessibilityRole="alert" className="mb-3 text-sm leading-5 text-red-200">{deleteError}</Text>
          ) : null}
          {sessionsLoading ? (
            <GlassPanel className="rounded-[22px] p-5">
              <View className="flex-row items-center gap-3">
                <ActivityIndicator color="#22C55E" />
                <Text className="text-sm font-semibold text-white/65">Wczytywanie historii treningów…</Text>
              </View>
            </GlassPanel>
          ) : sessionsError ? (
            <GlassPanel className="rounded-[22px] p-5">
              <Text accessibilityRole="alert" className="text-sm leading-5 text-red-200">{sessionsError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => { void reloadSessions(); }}
                className="mt-4 min-h-[44px] items-center justify-center self-start rounded-xl bg-white/10 px-4">
                <Text className="text-sm font-bold text-white">Spróbuj ponownie</Text>
              </Pressable>
            </GlassPanel>
          ) : sessions.length > 0 ? (
            <View className="gap-3">
              {sessions.map((session, index) => (
                <GlassPanel key={session.id} tone={index % 2 === 1 ? 'mint' : 'neutral'} delay={220 + index * 70} className="rounded-[22px]" contentClassName="flex-row items-start">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Zobacz szczegóły treningu ${session.name} z ${session.date}`}
                    onPress={() => setSelectedSession(session)}
                    className="min-w-0 flex-1 flex-row items-start gap-3 p-4 active:bg-white/[0.04]">
                    <View className={`h-12 w-12 items-center justify-center rounded-2xl ${index % 2 === 1 ? 'bg-mint/10' : 'bg-neon/10'}`}>
                      <SymbolView name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} size={20} tintColor={index % 2 === 1 ? '#83F3C0' : '#22C55E'} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-bold text-white">{session.name}</Text>
                      <Text className="mt-1 text-[11px] text-white/45">{session.focus}</Text>
                      <Text className="mt-1 text-[10px] text-white/30">{session.date}</Text>
                      {session.notes?.trim() ? (
                        <View className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2">
                          <Text className="text-[9px] font-bold tracking-wide text-white/40">NOTATKA</Text>
                          <Text className="mt-1 text-xs leading-[17px] text-white/70" numberOfLines={3}>
                            {session.notes.trim()}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="items-end gap-1">
                      <Text className="text-xs font-bold text-white">{session.duration} min</Text>
                      <Text className="text-[9px] font-bold tracking-wide text-neon/70">
                        {session.completedExercises}/{session.totalExercises} ĆW.
                      </Text>
                      <Text className="mt-1 text-[10px] font-bold text-white/40">SZCZEGÓŁY ›</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Usuń trening ${session.name} z ${session.date}`}
                    accessibilityState={{ disabled: deletingSessionId === session.id }}
                    disabled={deletingSessionId === session.id}
                    onPress={() => confirmRemoveSession(session)}
                    className="mr-2 mt-3 h-11 w-11 items-center justify-center rounded-xl active:bg-red-500/15">
                    {deletingSessionId === session.id ? (
                      <ActivityIndicator color="#FCA5A5" />
                    ) : (
                      <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} tintColor="#FCA5A5" />
                    )}
                  </Pressable>
                </GlassPanel>
              ))}
            </View>
          ) : (
            <GlassPanel className="rounded-[22px] p-5">
              <Text className="text-base font-extrabold text-white">Tu pojawi się Twój progres</Text>
              <Text className="mt-2 text-sm leading-5 text-white/50">
                Zakończony trening zapisze się automatycznie. Na razie nie ma tu żadnych wpisów.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/workout-flow')}
                className="mt-5 min-h-[48px] items-center justify-center rounded-2xl bg-neon px-4">
                <Text className="text-sm font-extrabold text-ink-950">Wybierz trening</Text>
              </Pressable>
            </GlassPanel>
          )}
        </View>
      </ScrollView>
    </GlassScreen>
  );
}
