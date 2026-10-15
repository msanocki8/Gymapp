import { useContext, useState } from 'react';
import { BlurView } from 'expo-blur';
import {
  Image,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Exercise } from '@/constants/exercise-library';
import { workoutColors } from '@/components/workout-ui';
import { BodyView, getBodyView, MuscleEngagementMap } from '@/components/muscle-engagement-map';
import { GlassBlurTargetContext } from '@/components/glass-blur-context';
import { WorkoutSession } from '@/hooks/use-gym-app';

type DetailTab = 'O ćwiczeniu' | 'Poziom' | 'Statystyki' | 'Historia';

const detailTabs: DetailTab[] = ['O ćwiczeniu', 'Poziom', 'Statystyki', 'Historia'];

export function ExerciseDetailModal({
  exercise,
  sessions = [],
  onClose,
}: {
  exercise: Exercise | null;
  sessions?: WorkoutSession[];
  onClose: () => void;
}) {
  const blurTarget = useContext(GlassBlurTargetContext);
  const [tab, setTab] = useState<DetailTab>('O ćwiczeniu');
  const [showLoggingHelp, setShowLoggingHelp] = useState(false);
  const [muscleViewState, setMuscleViewState] = useState<{ exerciseId: string; view: BodyView } | null>(null);

  if (!exercise) return null;

  const muscleView = muscleViewState?.exerciseId === exercise.id
    ? muscleViewState.view
    : getBodyView(exercise);
  const primaryMuscles = exercise.primaryMuscles ?? [exercise.category];
  const secondaryMuscles = exercise.secondaryMuscles ?? ['Stabilizatory i mięśnie pomocnicze'];
  const exerciseHistory = sessions.flatMap((session) => {
    const performance = session.exercisePerformance?.find((item) => item.name === exercise.name);
    return performance ? [{ session, performance }] : [];
  });

  return (
    <View className="flex-1 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950" style={styles.sheet}>
          <View style={styles.handle} />
          <View className="flex-row items-center justify-between px-5 pb-4">
            <View className="min-w-0 flex-1 pr-3">
              <Text style={styles.eyebrow}>{exercise.category.toLocaleUpperCase('pl-PL')} · {exercise.level.toLocaleUpperCase('pl-PL')}</Text>
              <Text className="min-w-0 shrink" style={styles.title} numberOfLines={2} ellipsizeMode="tail">{exercise.name}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Zamknij" onPress={onClose} className="items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 active:opacity-70" style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView horizontal style={styles.tabScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
            {detailTabs.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === item }}
                onPress={() => setTab(item)}
                className={`mr-2 rounded-full border px-4 py-2.5 ${tab === item ? 'border-lime-400/40 bg-lime-400/10' : 'border-zinc-800 bg-zinc-900'}`}>
                <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView className="min-w-0 flex-1" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {tab === 'O ćwiczeniu' ? (
              <>
                <View className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900" style={styles.demoCard}>
                  {exercise.image ? (
                    <Image source={{ uri: exercise.image }} resizeMode="cover" style={styles.demoImage} />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-zinc-900">
                      <Text style={styles.customExerciseGlyph}>{exercise.name.slice(0, 1).toLocaleUpperCase('pl-PL')}</Text>
                    </View>
                  )}
                  <View className="absolute inset-0 bg-black/30" />
                  <View className="absolute bottom-3 left-3 rounded-full border border-zinc-600/70 bg-zinc-950/80 px-3 py-2">
                    <Text style={styles.demoBadge}>PODGLĄD TECHNIKI</Text>
                  </View>
                  <View className="absolute right-3 top-3 rounded-full bg-lime-400/15 px-3 py-2">
                    <Text style={styles.demoBadgeAccent}>RUCH KONTROLOWANY</Text>
                  </View>
                </View>

                <Text style={styles.description}>{exercise.description}</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showLoggingHelp }}
                  onPress={() => setShowLoggingHelp((current) => !current)}
                  className="flex-row items-center justify-between rounded-2xl border border-lime-400/25 bg-lime-400/5 px-4 active:opacity-75"
                  style={styles.loggingButton}>
                  <View className="min-w-0 flex-1">
                    <Text style={styles.loggingEyebrow}>SZYBKA WSKAZÓWKA</Text>
                    <Text style={styles.loggingTitle}>Jak zapisywać serie?</Text>
                  </View>
                  <Text style={styles.loggingArrow}>{showLoggingHelp ? '−' : '+'}</Text>
                </Pressable>
                {showLoggingHelp && (
                  <View className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3" style={styles.loggingHelp}>
                    <Text style={styles.bodyText}>Wpisz ciężar użyty w serii oraz liczbę poprawnych powtórzeń. Zapisuj ten sam sposób liczenia dla każdej serii, aby łatwo porównywać progres.</Text>
                  </View>
                )}

                <View className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4" style={[styles.muscleCard, styles.glassMuscleCard]}>
                  {Platform.OS !== 'web' && blurTarget ? (
                    <BlurView
                      blurTarget={blurTarget}
                      blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
                      intensity={35}
                      tint="dark"
                      pointerEvents="none"
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <View style={styles.muscleCardContent}>
                    <View className="flex-row items-center justify-between">
                      <View className="min-w-0 flex-1">
                        <Text style={styles.panelEyebrow}>MAPA ZAANGAŻOWANIA</Text>
                        <Text style={styles.panelTitle}>Pracujące mięśnie</Text>
                      </View>
                      <Text style={styles.muscleLegend}>PODGLĄD</Text>
                    </View>
                    <MuscleEngagementMap
                      exercise={exercise}
                      view={muscleView}
                      onViewChange={(view) => setMuscleViewState({ exerciseId: exercise.id, view })}
                    />
                    <View className="flex-row flex-wrap" style={styles.muscleLegendRow}>
                      <MuscleLegend color="#B7FF35" title="Główne" muscles={primaryMuscles} />
                      <MuscleLegend color="#45E8F2" title="Pomocnicze" muscles={secondaryMuscles} />
                    </View>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.panelEyebrow}>POTRZEBNY SPRZĘT</Text>
                  <View className="mt-3 flex-row items-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <View className="mr-3 rounded-xl bg-zinc-800 px-3 py-2"><Text style={styles.equipmentIcon}>↗</Text></View>
                    <Text className="min-w-0 flex-1" style={styles.bodyText}>{exercise.equipment}</Text>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.panelEyebrow}>KROK PO KROKU</Text>
                  {exercise.steps.map((step, index) => (
                    <View key={`${exercise.id}-step-${index}`} className="mt-3 flex-row items-start rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-3">
                      <View className="mr-3 items-center justify-center rounded-xl bg-lime-400/10" style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{String(index + 1).padStart(2, '0')}</Text>
                      </View>
                      <Text className="min-w-0 flex-1" style={styles.bodyText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <DetailEmptyState tab={tab} exerciseName={exercise.name} history={exerciseHistory} />
            )}
            <View style={styles.bottomSpace} />
          </ScrollView>
    </View>
  );
}

function MuscleLegend({ color, title, muscles }: { color: string; title: string; muscles: string[] }) {
  return (
    <View className="min-w-0 flex-1" style={styles.muscleLegendItem}>
      <View className="flex-row items-center">
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendTitle}>{title}</Text>
      </View>
      <Text className="min-w-0" style={styles.muscleNames}>{muscles.join(' · ')}</Text>
    </View>
  );
}

function DetailEmptyState({
  tab,
  exerciseName,
  history,
}: {
  tab: DetailTab;
  exerciseName: string;
  history: { session: WorkoutSession; performance: NonNullable<WorkoutSession['exercisePerformance']>[number] }[];
}) {
  const loggedSets = history.flatMap(({ performance }) => performance.sets);
  const weights = loggedSets.map((set) => Number(set.weight)).filter((weight) => Number.isFinite(weight) && weight > 0);
  const descriptions = tab === 'Poziom'
    ? `Porównania dla „${exerciseName}” pojawią się tutaj, gdy dostępne będą dane treningowe.`
    : tab === 'Statystyki'
      ? 'Po zapisaniu pierwszych serii zobaczysz tu zmiany ciężaru, powtórzeń i objętości.'
      : 'Zapisane treningi zawierające to ćwiczenie pojawią się w tym miejscu.';
  const title = tab === 'Poziom' ? 'Twoja pozycja' : tab;

  if (tab === 'Historia' && history.length > 0) {
    return (
      <View style={styles.historyList}>
        {history.slice(0, 10).map(({ session, performance }) => (
          <View key={`${session.id}-${performance.name}`} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <View className="flex-row items-center justify-between">
              <Text style={styles.historyDate}>{session.date}</Text>
              <Text style={styles.historyDuration}>{session.duration} MIN</Text>
            </View>
            <Text style={styles.historyWorkoutName}>{session.name}</Text>
            <Text style={styles.historyPerformance}>
              {performance.sets.map((set) => `${set.weight || '—'} kg × ${set.reps || '—'}`).join('   ·   ')}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (tab === 'Statystyki' && history.length > 0) {
    return (
      <View className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <Text style={styles.panelEyebrow}>ZAPISANE WYNIKI</Text>
        <Text style={styles.statsExerciseName}>{exerciseName}</Text>
        <View className="mt-5 flex-row" style={styles.statsRow}>
          <StatTile label="SERIE" value={`${loggedSets.length}`} />
          <StatTile label="SESJE" value={`${history.length}`} />
          <StatTile label="MAX KG" value={weights.length > 0 ? `${Math.max(...weights)}` : '—'} />
        </View>
      </View>
    );
  }

  return (
    <View className="items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-8" style={styles.emptyState}>
      <View className="items-center justify-center rounded-2xl bg-lime-400/10" style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>{tab === 'Historia' ? '↺' : tab === 'Poziom' ? '↗' : '⌁'}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{descriptions}</Text>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-zinc-950 px-2 py-3">
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, maxHeight: '100%', borderRadius: 26, backgroundColor: '#090C0A', paddingTop: 9 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#586258', marginBottom: 15 },
  eyebrow: { color: workoutColors.neon, fontSize: 9, fontWeight: '800', letterSpacing: 1.15, marginBottom: 5 },
  title: { color: workoutColors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  closeButton: { height: 40, width: 40 },
  closeText: { color: workoutColors.text, fontSize: 25, lineHeight: 27, marginTop: -2 },
  tabBar: { alignItems: 'center', flexDirection: 'row', height: 42, paddingHorizontal: 20 },
  tabScroll: { flexGrow: 0, flexShrink: 0, height: 42 },
  tabText: { color: '#A3ADA2', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: workoutColors.neon },
  content: { paddingHorizontal: 20, paddingTop: 3, paddingBottom: 28 },
  demoCard: { height: 188, backgroundColor: '#181E19' },
  demoImage: { height: '100%', width: '100%' },
  customExerciseGlyph: { color: workoutColors.neon, fontSize: 56, fontWeight: '900' },
  demoBadge: { color: '#E6EDE5', fontSize: 8, fontWeight: '800', letterSpacing: 0.85 },
  demoBadgeAccent: { color: workoutColors.neon, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  description: { color: '#B5BEB4', fontSize: 13, lineHeight: 20, marginTop: 15, marginBottom: 16 },
  loggingButton: { alignItems: 'center', flexDirection: 'row', minHeight: 68, paddingHorizontal: 15 },
  loggingEyebrow: { color: '#A8B39F', fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  loggingTitle: { color: workoutColors.text, fontSize: 13, fontWeight: '800', marginTop: 5 },
  loggingArrow: { color: workoutColors.neon, fontSize: 23, fontWeight: '500', marginLeft: 12 },
  loggingHelp: { marginTop: 8 },
  bodyText: { color: '#B4BDB3', fontSize: 12, lineHeight: 18 },
  muscleCard: { marginTop: 17 },
  glassMuscleCard: { backgroundColor: 'rgba(24, 30, 25, 0.2)', borderColor: 'rgba(126, 150, 130, 0.24)', overflow: 'hidden', position: 'relative' },
  muscleCardContent: { position: 'relative', zIndex: 1 },
  panelEyebrow: { color: '#8F9A8E', fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  panelTitle: { color: workoutColors.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  muscleLegend: { color: '#879286', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  muscleLegendRow: { gap: 12, marginTop: 5 },
  muscleLegendItem: { minWidth: 0, paddingTop: 12, borderTopColor: '#303A31', borderTopWidth: StyleSheet.hairlineWidth },
  legendDot: { borderRadius: 5, height: 8, marginRight: 7, width: 8 },
  legendTitle: { color: '#E8EEE7', fontSize: 10, fontWeight: '800' },
  muscleNames: { color: '#A4AEA3', fontSize: 10, lineHeight: 16, marginTop: 7 },
  infoSection: { marginTop: 19 },
  equipmentIcon: { color: workoutColors.neon, fontSize: 16, fontWeight: '800' },
  stepNumber: { height: 34, width: 34 },
  stepNumberText: { color: workoutColors.neon, fontSize: 10, fontWeight: '900' },
  bottomSpace: { height: 22 },
  emptyState: { marginTop: 24, minHeight: 220, justifyContent: 'center' },
  emptyIcon: { height: 54, width: 54 },
  emptyIconText: { color: workoutColors.neon, fontSize: 25, fontWeight: '800' },
  emptyTitle: { color: workoutColors.text, fontSize: 17, fontWeight: '800', marginTop: 16 },
  emptyDescription: { color: '#9CA69B', fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  historyList: { gap: 10, paddingTop: 3 },
  historyDate: { color: workoutColors.neon, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  historyDuration: { color: '#9CA69B', fontSize: 8, fontWeight: '800', letterSpacing: 0.65 },
  historyWorkoutName: { color: workoutColors.text, fontSize: 14, fontWeight: '800', marginTop: 10 },
  historyPerformance: { color: '#A5AFA4', fontSize: 10, lineHeight: 16, marginTop: 6 },
  statsExerciseName: { color: workoutColors.text, fontSize: 18, fontWeight: '800', marginTop: 7 },
  statsRow: { gap: 8 },
  statLabel: { color: '#899489', fontSize: 7, fontWeight: '800', letterSpacing: 0.65, textAlign: 'center' },
  statValue: { color: workoutColors.neon, fontSize: 18, fontWeight: '900', marginTop: 5, textAlign: 'center' },
});
