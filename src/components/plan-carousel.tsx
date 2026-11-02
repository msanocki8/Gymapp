import { useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { GlassBlurTargetContext } from '@/components/glass-blur-context';
import type { WorkoutPlan } from '@/hooks/use-gym-app';

type WebScrollSnapStyle = ViewStyle & { scrollSnapType?: string };
type WebItemSnapStyle = ViewStyle & { scrollSnapAlign?: string };

const CARD_GAP = 10;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = 235;

const webScrollSnapStyle: WebScrollSnapStyle = Platform.OS === 'web'
  ? { scrollSnapType: 'x mandatory' }
  : {};

const webItemSnapStyle: WebItemSnapStyle = Platform.OS === 'web'
  ? { scrollSnapAlign: 'start' }
  : {};

function PlanCard({
  plan,
  width,
  onPress,
  onEdit,
  onDelete,
  deleting,
}: {
  plan: WorkoutPlan;
  width: number;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting: boolean;
}) {
  const blurTarget = useContext(GlassBlurTargetContext);
  const badge = plan.focus.split('·')[0]?.trim();
  const exerciseRows = plan.exerciseConfigs?.length
    ? plan.exerciseConfigs.slice(0, 2).map((exercise) => ({
        name: exercise.name,
        details: exercise.sets.length
          ? `${exercise.sets.length} × ${exercise.sets[0]?.reps || '—'}`
          : null,
      }))
    : plan.exercises.slice(0, 2).map((name) => ({ name, details: null }));

  return (
    <View style={[styles.card, webItemSnapStyle, { width }]}>
      {Platform.OS !== 'web' ? (
        <BlurView
          blurTarget={blurTarget ?? undefined}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          intensity={22}
          tint="dark"
          style={styles.cardBlur}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start: ${plan.name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}>
        <View style={styles.cardTop}>
          <View style={styles.planIcon}>
            <SymbolView
              name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }}
              size={19}
              tintColor="#86efac"
            />
          </View>
          {badge ? (
            <View style={styles.planBadge}>
              <Text numberOfLines={1} style={styles.planBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>

        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.planTitle}>
          {plan.name}
        </Text>
        <Text numberOfLines={1} style={styles.planMeta}>
          {plan.duration} min · {plan.exercises.length} ćw.
        </Text>

        <View style={styles.divider} />

        <View style={styles.exerciseRows}>
          {[0, 1].map((index) => {
            const exercise = exerciseRows[index];
            return (
              <View key={exercise?.name ?? `empty-${index}`} style={styles.exerciseRow}>
                <Text numberOfLines={1} style={styles.exerciseName}>
                  {exercise?.name ?? ''}
                </Text>
                <Text numberOfLines={1} style={styles.exerciseDetails}>
                  {exercise?.details ?? ''}
                </Text>
              </View>
            );
          })}
        </View>

      </Pressable>
      <View style={styles.cardActions}>
        <View style={styles.secondaryActions}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edytuj plan ${plan.name}`}
              onPress={onEdit}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.cardPressed]}>
              <SymbolView
                name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                size={14}
                tintColor="#aab4a8"
              />
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Usuń plan ${plan.name}`}
              accessibilityState={{ disabled: deleting }}
              disabled={deleting}
              onPress={onDelete}
              style={({ pressed }) => [styles.secondaryButton, styles.deleteButton, pressed && styles.cardPressed]}>
              {deleting ? (
                <ActivityIndicator color="#fca5a5" size="small" />
              ) : (
                <SymbolView
                  name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                  size={14}
                  tintColor="#fca5a5"
                />
              )}
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start: ${plan.name}`}
          onPress={onPress}
          style={({ pressed }) => [styles.startButtonPressable, pressed && styles.cardPressed]}>
          <LinearGradient
            colors={['#22c55e', '#a3e635']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButton}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              size={14}
              tintColor="#04210f"
            />
            <Text style={styles.startButtonText}>Start</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

export function PlanCarousel({
  plans,
  onEdit,
  onDelete,
  deletingPlanId,
}: {
  plans: WorkoutPlan[];
  onEdit?: (plan: WorkoutPlan) => void;
  onDelete?: (plan: WorkoutPlan) => void;
  deletingPlanId?: string | null;
}) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const measuredWidth = viewportWidth || Math.min(screenWidth, 560);
  const cardWidth = plans.length === 1
    ? Math.max(measuredWidth - HORIZONTAL_PADDING * 2, 0)
    : Math.min(CARD_WIDTH, screenWidth * 0.75);
  const snapInterval = cardWidth + CARD_GAP;

  function updateActiveIndex(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (snapInterval <= 0) return;
    const nextIndex = Math.min(
      plans.length - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.x / snapInterval)),
    );
    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  }

  if (plans.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          TWOJE PLANY · {plans.length}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nowy plan"
          onPress={() => router.push('/create-workout')}
          style={({ pressed }) => pressed && styles.headerButtonPressed}>
          <LinearGradient
            colors={['#bef264', '#84e04a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerButton}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={14}
              tintColor="#1a2e05"
            />
            <Text style={styles.headerButtonText}>Nowy plan</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={plans}
        keyExtractor={(plan) => plan.id}
        renderItem={({ item }) => (
          <PlanCard
            plan={item}
            width={cardWidth}
            onEdit={onEdit ? () => onEdit(item) : undefined}
            onDelete={onDelete ? () => onDelete(item) : undefined}
            deleting={deletingPlanId === item.id}
            onPress={() => router.push({
              pathname: '/workout-session',
              params: { planId: item.id },
            })}
          />
        )}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={plans.length > 1 ? snapInterval : undefined}
        snapToAlignment="start"
        nestedScrollEnabled
        scrollEventThrottle={50}
        onScroll={updateActiveIndex}
        onMomentumScrollEnd={updateActiveIndex}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          setViewportWidth((current) => current === nextWidth ? current : nextWidth);
        }}
        style={[styles.list, webScrollSnapStyle]}
        contentContainerStyle={styles.listContent}
      />

      {plans.length >= 2 && plans.length <= 5 ? (
        <View style={styles.pagination} accessibilityLabel={`Plan ${activeIndex + 1} z ${plans.length}`}>
          {plans.map((plan, index) => (
            <View
              key={plan.id}
              style={[styles.dot, index === activeIndex ? styles.activeDot : styles.inactiveDot]}
            />
          ))}
        </View>
      ) : plans.length > 5 ? (
        <Text style={styles.pageCount}>{activeIndex + 1} / {plans.length}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 36,
    paddingHorizontal: 1,
  },
  headerTitle: {
    color: '#22c55e',
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  headerButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  headerButtonText: {
    color: '#1a2e05',
    fontSize: 12,
    fontWeight: '800',
  },
  headerButtonPressed: {
    opacity: 0.82,
  },
  list: {
    flexGrow: 0,
    width: '100%',
  },
  startButtonPressable: {
    flex: 1,
    minWidth: 0,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  card: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(13,18,14,0.96)' : 'rgba(9,13,10,0.64)',
    borderColor: 'rgba(235,242,235,0.13)',
    borderRadius: 24,
    borderWidth: 0.5,
    overflow: 'hidden',
    padding: 14,
  },
  cardBlur: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
  },
  cardMain: {
    flexShrink: 0,
    gap: 10,
    minWidth: 0,
    position: 'relative',
    zIndex: 1,
  },
  cardPressed: {
    opacity: 0.86,
  },
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    position: 'relative',
    zIndex: 1,
  },
  secondaryActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  deleteButton: {
    backgroundColor: 'rgba(127,29,29,0.3)',
    borderColor: 'rgba(248,113,113,0.7)',
    borderWidth: 1.5,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  planIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.16)',
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 14,
    borderWidth: 0.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  planBadge: {
    backgroundColor: 'rgba(190,242,100,0.12)',
    borderRadius: 999,
    maxWidth: '70%',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planBadgeText: {
    color: '#bef264',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  planTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  planMeta: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  exerciseRows: {
    height: 52,
    justifyContent: 'space-between',
  },
  exerciseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    height: 22,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  exerciseName: {
    color: '#9ca3af',
    flex: 1,
    fontSize: 11,
    minWidth: 0,
  },
  exerciseDetails: {
    color: '#9ca3af',
    flexShrink: 0,
    fontSize: 10,
    maxWidth: '38%',
    textAlign: 'right',
  },
  startButton: {
    alignItems: 'center',
    borderRadius: 13,
    flexDirection: 'row',
    gap: 9,
    height: 40,
    justifyContent: 'center',
    minWidth: 0,
    width: '100%',
  },
  startButtonText: {
    color: '#04210f',
    fontSize: 13,
    fontWeight: '900',
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 6,
    marginBottom: 12,
  },
  dot: {
    borderRadius: 3,
    height: 6,
  },
  activeDot: {
    backgroundColor: '#22c55e',
    width: 22,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 6,
  },
  pageCount: {
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 12,
    textAlign: 'center',
  },
});
