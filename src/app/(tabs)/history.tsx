import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { APP_BOTTOM_BAR_CONTENT_HEIGHT } from '@/components/app-bottom-bar';
import { GlassPanel } from '@/components/glass-panel';
import { GlassScreen } from '@/components/glass-screen';
import { MuscleBars, ObsidianCard } from '@/components/obsidian-card';
import { exerciseLibrary } from '@/constants/exercise-library';
import { WorkoutSession, useGymApp } from '@/hooks/use-gym-app';
import { calculateMuscleVolume } from '@/lib/muscle-volume';
import { lastTrainedAtByArea, sumSetsByArea } from '@/lib/plan-muscles';

function SessionDetails({
  session,
  onBack,
  onDelete,
  deleting,
}: {
  session: WorkoutSession;
  onBack: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Usuń trening ${session.name} z ${session.date}`}
              accessibilityState={{ disabled: deleting }}
              disabled={deleting}
              onPress={onDelete}
              className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl border border-red-400/35 bg-red-500/[0.08] active:opacity-80">
              {deleting ? (
                <ActivityIndicator color="#FCA5A5" />
              ) : (
                <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} tintColor="#FCA5A5" />
              )}
              <Text className="text-sm font-extrabold text-red-300">Usuń trening</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </GlassScreen>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS_SHOWN = 8;
const MONTHS = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'];

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function weekDateLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function workoutCountForm(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (count === 1) return 'trening';
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return 'treningi';
  return 'treningów';
}

function setsLabel(count: number) {
  const rounded = Number.isInteger(count) ? count : Math.round(count * 10) / 10;
  if (rounded === 1) return '1 seria';
  const whole = Math.floor(rounded);
  if (whole === rounded && whole % 10 >= 2 && whole % 10 <= 4 && (whole % 100 < 12 || whole % 100 > 14)) return `${rounded} serie`;
  return `${String(rounded).replace('.', ',')} serii`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const { sessions, sessionsLoading, sessionsError, reloadSessions, deleteSession } = useGymApp();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'minutes' | 'workouts'>('minutes');
  const [now] = useState(() => Date.now());
  const totalMinutes = sessions.reduce((total, session) => total + session.duration, 0);
  const lastSevenDaysCount = sessions.filter((session) => session.completedAt >= now - 7 * DAY_MS).length;
  const thisWeekStart = startOfWeek(new Date(now));
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, index) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - (WEEKS_SHOWN - 1 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = sessions.filter((session) => session.completedAt >= start.getTime() && session.completedAt < end.getTime());
    return {
      key: start.getTime(),
      label: weekDateLabel(start),
      minutes: inWeek.reduce((total, session) => total + session.duration, 0),
      workouts: inWeek.length,
      current: index === WEEKS_SHOWN - 1,
    };
  });
  const chartValues = weeks.map((week) => (chartMetric === 'minutes' ? week.minutes : week.workouts));
  const chartMax = Math.max(1, ...chartValues);

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const areaSets = useMemo(() => sumSetsByArea(calculateMuscleVolume({
    exercises: [],
    sessions: sessions.map((session) => ({
      completedAt: session.completedAt,
      exercisePerformance: session.exercisePerformance?.map((exercise) => ({
        exerciseId: exercise.exerciseId ?? exerciseLibrary.find((item) => item.name === exercise.name)?.id,
        name: exercise.name,
        sets: exercise.sets.map((set) => ({ ...set, completed: true })),
      })),
    })),
    period: 'week',
    timeZone: localTimeZone,
  })), [sessions, localTimeZone]);
  const lastTrained = useMemo(() => lastTrainedAtByArea(sessions), [sessions]);
  const areaMax = Math.max(0, ...areaSets.map((area) => area.sets));
  const neglected = areaSets
    .filter((area) => area.sets === 0)
    .map((area) => ({ ...area, last: lastTrained.get(area.key) }))
    .sort((a, b) => (a.last ?? 0) - (b.last ?? 0))[0];
  const neglectedText = neglected && sessions.length > 0
    ? neglected.last
      ? `${neglected.label} bez serii od ${Math.max(1, Math.floor((now - neglected.last) / DAY_MS))} dni`
      : `${neglected.label} jeszcze bez żadnej serii`
    : null;

  const removeSession = async (session: WorkoutSession) => {
    setDeletingSessionId(session.id);
    setDeleteError(null);
    try {
      await deleteSession(session.id);
      setSelectedSession(null);
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
    return (
      <SessionDetails
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
        onDelete={() => confirmRemoveSession(selectedSession)}
        deleting={deletingSessionId === selectedSession.id}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AmbientBackground blurTarget={blurTarget} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: APP_BOTTOM_BAR_CONTENT_HEIGHT + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.flexShrink}>
              <Text style={styles.eyebrow}>STATYSTYKI</Text>
              <Text style={styles.title}>Historia</Text>
              <Text style={styles.subtitle}>Regularność robi robotę.</Text>
            </View>
            <View style={styles.headerIcon}>
              <SymbolView name={{ ios: 'chart.bar.xaxis', android: 'monitoring', web: 'monitoring' }} size={20} tintColor="#A3E635" />
            </View>
          </View>

          <ObsidianCard radius={24} contentStyle={styles.statsRow}>
            {[
              { value: String(sessions.length), unit: '', label: workoutCountForm(sessions.length).toUpperCase(), color: '#A3E635' },
              {
                value: totalMinutes >= 60 ? String(Math.floor(totalMinutes / 60)) : String(totalMinutes),
                unit: totalMinutes >= 60 ? ' h' : ' min',
                label: 'W RUCHU',
                color: '#4ADE80',
              },
              { value: String(lastSevenDaysCount), unit: '', label: 'OSTATNIE 7 DNI', color: '#BEF264' },
            ].map((stat, index) => (
              <View key={stat.label} style={[styles.stat, index < 2 && styles.statDivider]}>
                <Text style={styles.statValue}>
                  {sessionsLoading ? '…' : stat.value}
                  <Text style={styles.statUnit}>{stat.unit}</Text>
                </Text>
                <Text numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
                <View style={[styles.statLine, { backgroundColor: stat.color }]} />
              </View>
            ))}
          </ObsidianCard>

          <ObsidianCard radius={24} contentStyle={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.flexShrink}>
                <Text style={styles.cardTitle}>{chartMetric === 'minutes' ? 'Minuty' : 'Treningi'}</Text>
                <Text style={styles.cardSubtitle}>ostatnie {WEEKS_SHOWN} tygodni</Text>
              </View>
              <View accessibilityRole="tablist" style={styles.toggle}>
                {(['workouts', 'minutes'] as const).map((metric) => {
                  const selected = chartMetric === metric;
                  return (
                    <Pressable
                      key={metric}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setChartMetric(metric)}
                      style={[styles.toggleItem, selected && styles.toggleItemOn]}>
                      <Text style={[styles.toggleText, selected && styles.toggleTextOn]}>
                        {metric === 'minutes' ? 'Minuty' : 'Treningi'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.chart}>
              {weeks.map((week, index) => {
                const value = chartValues[index];
                return (
                  <View
                    key={week.key}
                    style={styles.chartColumn}
                    accessible
                    accessibilityLabel={`Tydzień ${week.label}: ${value} ${chartMetric === 'minutes' ? 'minut' : workoutCountForm(value)}`}>
                    {value > 0 ? <Text style={styles.chartValue}>{value}</Text> : null}
                    {value > 0 ? (
                      <LinearGradient
                        colors={['#BEF264', '#22C55E']}
                        style={[
                          styles.chartBar,
                          { height: `${Math.max(8, Math.round((value / chartMax) * 82))}%` as DimensionValue },
                          week.current && styles.chartBarCurrent,
                        ]}
                      />
                    ) : (
                      <View style={styles.chartBarEmpty} />
                    )}
                    <Text style={[styles.chartLabel, week.current && styles.chartLabelCurrent]}>{week.label}</Text>
                  </View>
                );
              })}
            </View>
          </ObsidianCard>

          <ObsidianCard radius={24} contentStyle={styles.card}>
            <Text style={styles.cardTitle}>Mięśnie w tym tygodniu</Text>
            <Text style={styles.cardSubtitle}>serie główne + pomocnicze (0,5)</Text>
            <View style={styles.musclesBars}>
              <MuscleBars
                labelWidth={74}
                rows={areaSets.map((area) => ({
                  key: area.key,
                  label: area.label,
                  share: areaMax > 0 ? area.sets / areaMax : 0,
                  caption: setsLabel(area.sets),
                }))}
              />
            </View>
            {neglectedText ? <Text style={styles.warning}>{neglectedText}</Text> : null}
          </ObsidianCard>

          <View style={styles.sectionHeader}>
            <View style={styles.flexShrink}>
              <Text style={styles.eyebrow}>{sessions.length} {sessions.length === 1 ? 'ZAPISANY' : sessions.length >= 2 && sessions.length <= 4 ? 'ZAPISANE' : 'ZAPISANYCH'}</Text>
              <Text style={styles.sectionTitle}>Ostatnie treningi</Text>
            </View>
          </View>
          {deleteError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>{deleteError}</Text>
          ) : null}
          {sessionsLoading ? (
            <ObsidianCard contentStyle={styles.infoCard}>
              <ActivityIndicator color="#A3E635" />
              <Text style={styles.infoText}>Wczytywanie historii treningów…</Text>
            </ObsidianCard>
          ) : sessionsError ? (
            <ObsidianCard contentStyle={styles.errorCard}>
              <Text accessibilityRole="alert" style={styles.errorText}>{sessionsError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => { void reloadSessions(); }}
                style={styles.retryButton}>
                <Text style={styles.retryText}>Spróbuj ponownie</Text>
              </Pressable>
            </ObsidianCard>
          ) : sessions.length > 0 ? (
            <View style={styles.list}>
              {sessions.map((session) => {
                const date = new Date(session.completedAt);
                return (
                  <Pressable
                    key={session.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Zobacz szczegóły treningu ${session.name} z ${session.date}`}
                    onPress={() => setSelectedSession(session)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ObsidianCard contentStyle={styles.sessionRow}>
                      <View style={styles.dateTile}>
                        <Text style={styles.dateDay}>{date.getDate()}</Text>
                        <Text style={styles.dateMonth}>{MONTHS[date.getMonth()]}</Text>
                      </View>
                      <View style={styles.sessionCopy}>
                        <Text numberOfLines={1} style={styles.sessionTitle}>{session.name}</Text>
                        <Text numberOfLines={1} style={styles.sessionFocus}>{session.focus}</Text>
                      </View>
                      <View style={styles.sessionMeta}>
                        <Text style={styles.sessionDuration}>{session.duration} min</Text>
                        <Text style={styles.sessionExercises}>{session.completedExercises}/{session.totalExercises} ćw.</Text>
                      </View>
                      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor="#A3E635" />
                    </ObsidianCard>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ObsidianCard contentStyle={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Tu pojawi się Twój progres</Text>
              <Text style={styles.emptyText}>
                Zakończony trening zapisze się automatycznie. Na razie nie ma tu żadnych wpisów.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/workout-flow')}
                style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Wybierz trening</Text>
              </Pressable>
            </ObsidianCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000', flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1, minWidth: 0 },
  page: { alignSelf: 'center', gap: 12, maxWidth: 560, paddingHorizontal: 18, paddingTop: 20, width: '100%' },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  eyebrow: { color: '#A3E635', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#F5F7F6', fontSize: 32, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: '#8A948C', fontSize: 13.5, marginTop: 2 },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(4,8,6,0.6)',
    borderColor: 'rgba(163,230,53,0.3)',
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  statsRow: { flexDirection: 'row', paddingVertical: 16 },
  stat: { alignItems: 'center', flex: 1, minWidth: 0, paddingHorizontal: 4 },
  statDivider: { borderRightColor: 'rgba(255,255,255,0.07)', borderRightWidth: 1 },
  statValue: { color: '#F5F7F6', fontSize: 25, fontWeight: '900' },
  statUnit: { color: '#7F8983', fontSize: 13, fontWeight: '700' },
  statLabel: { color: '#7F8983', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9, marginTop: 2 },
  statLine: { borderRadius: 2, height: 3, marginTop: 8, width: 26 },
  card: { padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  cardTitle: { color: '#F5F7F6', fontSize: 17, fontWeight: '900' },
  cardSubtitle: { color: '#7F8983', fontSize: 12, marginTop: 2 },
  toggle: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999, flexDirection: 'row', padding: 3 },
  toggleItem: { borderRadius: 999, justifyContent: 'center', minHeight: 32, paddingHorizontal: 11 },
  toggleItemOn: { backgroundColor: 'rgba(163,230,53,0.16)' },
  toggleText: { color: '#7F8983', fontSize: 11.5, fontWeight: '800' },
  toggleTextOn: { color: '#D9F99D' },
  chart: { alignItems: 'flex-end', flexDirection: 'row', gap: 7, height: 150, marginTop: 16 },
  chartColumn: { alignItems: 'center', flex: 1, gap: 5, height: '100%', justifyContent: 'flex-end' },
  chartValue: { color: '#C9D1CB', fontSize: 10, fontWeight: '800' },
  chartBar: { borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, width: '100%' },
  chartBarCurrent: { borderColor: '#E8FFAA', borderWidth: 1.5 },
  chartBarEmpty: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 8, width: '100%' },
  chartLabel: { color: '#7F8983', fontSize: 10, fontWeight: '800' },
  chartLabelCurrent: { color: '#A3E635' },
  musclesBars: { marginTop: 12 },
  warning: { color: '#FACC15', fontSize: 12.5, fontWeight: '700', marginTop: 10 },
  sectionHeader: { flexDirection: 'row', marginTop: 10 },
  sectionTitle: { color: '#F5F7F6', fontSize: 19, fontWeight: '900', marginTop: 3 },
  list: { gap: 10 },
  sessionRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateTile: {
    alignItems: 'center',
    backgroundColor: '#0B0D0B',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    width: 46,
  },
  dateDay: { color: '#F5F7F6', fontSize: 17, fontWeight: '900', lineHeight: 19 },
  dateMonth: { color: '#A3E635', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  sessionCopy: { flex: 1, minWidth: 0 },
  sessionTitle: { color: '#F5F7F6', fontSize: 15, fontWeight: '900' },
  sessionFocus: { color: '#7F8983', fontSize: 12, marginTop: 2 },
  sessionMeta: { alignItems: 'flex-end' },
  sessionDuration: { color: '#F5F7F6', fontSize: 14, fontWeight: '900' },
  sessionExercises: { color: '#4ADE80', fontSize: 11, fontWeight: '800', marginTop: 2 },
  infoCard: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 18 },
  infoText: { color: '#C9D1CB', fontSize: 13, fontWeight: '600' },
  errorCard: { gap: 12, padding: 18 },
  errorText: { color: '#FECACA', fontSize: 13, lineHeight: 19 },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  retryText: { color: '#F5F7F6', fontSize: 13, fontWeight: '800' },
  emptyCard: { gap: 8, padding: 18 },
  emptyTitle: { color: '#F5F7F6', fontSize: 16, fontWeight: '900' },
  emptyText: { color: '#8A948C', fontSize: 13, lineHeight: 19 },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: '#A3E635',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  emptyButtonText: { color: '#07150C', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
