import { useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import type { WorkoutPlan } from '@/hooks/use-gym-app';

type WebScrollSnapStyle = ViewStyle & { scrollSnapType?: string };
type WebItemSnapStyle = ViewStyle & { scrollSnapAlign?: string };

const CARD_GAP = 10;
const HORIZONTAL_PADDING = 0;
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
    <View style={[webItemSnapStyle, { width }, styles.planCard]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#171D18', '#101511', '#0B0E0C']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(74,222,128,0.12)', 'rgba(74,222,128,0.025)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, styles.planAccent]}
      />
      <View style={styles.planTop}>
        <View style={styles.planIcon}>
          <SymbolView
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            size={12}
            tintColor="#4ADE80"
          />
        </View>
        {badge ? (
          <View style={styles.planBadge}>
            <Text numberOfLines={1} style={styles.planBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} ellipsizeMode="tail" style={styles.planTitle}>
        {plan.name}
      </Text>
      <Text numberOfLines={1} style={styles.planMeta}>
        {plan.duration} min · {plan.exercises.length} ćw.
      </Text>

      <View style={styles.planDivider} />

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

      <View style={styles.cardActions}>
        <View style={styles.cardActionsContent}>
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
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
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
    borderRadius: 16,
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
    // Replaced by WorkoutCard - kept for reference
  },
  cardBlur: {
    // Removed - WorkoutCard handles
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
  },
  contentContainer: {
    flexShrink: 0,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.86,
  },
  cardActions: {
    marginTop: 6,
  },
  cardActionsContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    minHeight: 38,
    justifyContent: 'space-between',
  },
  secondaryActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#0A0E0B',
    borderColor: 'rgba(153,177,159,0.26)',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  deleteButton: {
    backgroundColor: '#130B0C',
    borderColor: 'rgba(248,113,113,0.48)',
    borderWidth: 1,
  },
  cardTop: {
    // Replaced by planTop
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  exerciseRows: {
    height: 46,
    justifyContent: 'space-between',
  },
  exerciseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 19,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  exerciseName: {
    color: '#D5D8D6',
    flex: 1,
    fontSize: 10,
    minWidth: 0,
  },
  exerciseDetails: {
    color: '#B8BFBA',
    flexShrink: 0,
    fontSize: 9,
    maxWidth: '38%',
    textAlign: 'right',
  },
  startButton: {
    alignItems: 'center',
    borderColor: 'rgba(217,255,143,0.64)',
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    height: 38,
    justifyContent: 'center',
    minWidth: 0,
    width: '100%',
    paddingHorizontal: 12,
  },
  startButtonText: {
    color: '#061207',
    fontSize: 11,
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
  planTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  planIcon: {
    alignItems: 'center',
    backgroundColor: '#0B100C',
    borderColor: 'rgba(74,222,128,0.28)',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  planBadge: {
    backgroundColor: 'rgba(163,230,53,0.12)',
    borderColor: 'rgba(163,230,53,0.42)',
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '70%',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  planBadgeText: {
    color: '#D9F99D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  planDivider: {
    backgroundColor: 'rgba(191,207,195,0.14)',
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  planAccent: {
    width: '72%',
  },
  planCard: {
    backgroundColor: '#0B0E0C',
    borderColor: 'rgba(180,198,185,0.2)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    gap: 9,
    ...Platform.select({
      web: { boxShadow: '0 12px 26px rgba(0, 0, 0, 0.42), 0 0 20px rgba(34, 197, 94, 0.09)' },
      default: {
        elevation: 5,
        shadowColor: '#22C55E',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  planTitle: {
    color: '#F5F7F6',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.25,
    lineHeight: 18,
  },
  planMeta: {
    color: '#A3E635',
    fontSize: 10,
    fontWeight: '700',
  },
});
