import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { activeWorkout, useActiveWorkout } from '@/lib/active-workout-store';

// Fizyczne wycięcie iPhone'a (14 Pro i nowsze): 126×37, 11 px od góry.
const NOTCH_WIDTH = 126;
const NOTCH_HEIGHT = 37;
const NOTCH_TOP = 11;
const ISLAND_WIDTH = 160;
const ISLAND_HEIGHT = 92;
const COMPACT_HEIGHT = 54;
const RING = 42;
const RING_STROKE = 4;
const RING_RADIUS = (RING - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const SPRING = { damping: 14, stiffness: 170, mass: 0.9 };

type CrossPlatformShadow = ViewStyle & { boxShadow?: string };
const glowShadow: CrossPlatformShadow = Platform.select<CrossPlatformShadow>({
  web: { boxShadow: '0 0 18px rgba(74, 222, 128, 0.35)' },
  default: {
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
}) ?? {};

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return { minutes: String(minutes).padStart(2, '0'), seconds: String(seconds).padStart(2, '0') };
}

/** Lokalny zegar – tyka tylko wtedy, gdy wyspa jest widoczna (reszta aplikacji się nie przerysowuje). */
function useElapsedSeconds(startTime: number | null, running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const refresh = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(refresh);
      clearInterval(timer);
    };
  }, [running]);
  return startTime === null ? 0 : Math.floor((now - startTime) / 1000);
}

/**
 * Pływająca „Dynamic Island” (wariant C2) dla zminimalizowanego treningu.
 * W PWA na iPhonie z wycięciem kładzie się NA wycięciu (top 11 px, szer. 160 px – nie wchodzi pod godzinę
 * i baterię) i rośnie w dół; treść jest pod wycięciem. Na innych ekranach stoi pod paskiem stanu.
 */
export function WorkoutDynamicIsland() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const isActive = useActiveWorkout((state) => state.isActive);
  const isMinimized = useActiveWorkout((state) => state.isMinimized);
  const startTime = useActiveWorkout((state) => state.startTime);
  const planName = useActiveWorkout((state) => state.planName);
  const planId = useActiveWorkout((state) => state.planId);
  const isQuickStart = useActiveWorkout((state) => state.isQuickStart);
  const done = useActiveWorkout((state) => state.doneExercises);
  const total = useActiveWorkout((state) => state.totalExercises);

  const onWorkoutScreen = pathname.startsWith('/workout-session');
  const visible = isActive && isMinimized && !onWorkoutScreen;
  const elapsed = useElapsedSeconds(startTime, visible);
  const clock = formatClock(elapsed);

  // Na iPhonie z wycięciem (PWA) wyspa wyrasta z wycięcia; bez wycięcia – zwykła pigułka pod paskiem stanu.
  const overNotch = Platform.OS === 'web' && insets.top >= 40;
  const top = overNotch ? NOTCH_TOP : insets.top + 8;
  const fullHeight = overNotch ? ISLAND_HEIGHT : COMPACT_HEIGHT;
  const contentTop = overNotch ? NOTCH_HEIGHT + 5 : 6;

  const width = useSharedValue(NOTCH_WIDTH);
  const height = useSharedValue(overNotch ? NOTCH_HEIGHT : 0);
  const opacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const breath = useSharedValue(0.35);

  useEffect(() => {
    if (visible) {
      opacity.set(withTiming(1, { duration: reducedMotion ? 0 : 120 }));
      width.set(reducedMotion ? ISLAND_WIDTH : withSpring(ISLAND_WIDTH, SPRING));
      height.set(reducedMotion ? fullHeight : withSpring(fullHeight, SPRING));
      contentOpacity.set(withTiming(1, { duration: reducedMotion ? 0 : 220 }));
      if (!reducedMotion) {
        breath.set(withRepeat(withSequence(
          withTiming(0.9, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ), -1));
      }
    } else {
      contentOpacity.set(withTiming(0, { duration: reducedMotion ? 0 : 100 }));
      width.set(withTiming(NOTCH_WIDTH, { duration: reducedMotion ? 0 : 240 }));
      height.set(withTiming(overNotch ? NOTCH_HEIGHT : 0, { duration: reducedMotion ? 0 : 240 }));
      opacity.set(withTiming(0, { duration: reducedMotion ? 0 : 260 }));
      breath.set(0.35);
    }
  }, [visible, reducedMotion, fullHeight, overNotch, width, height, opacity, contentOpacity, breath]);

  const islandStyle = useAnimatedStyle(() => ({
    width: width.get(),
    height: height.get(),
    marginLeft: -width.get() / 2,
    opacity: opacity.get(),
  }));
  const borderStyle = useAnimatedStyle(() => ({ opacity: breath.get() }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.get() }));

  const share = total > 0 ? Math.min(1, done / total) : 0;

  function openWorkout() {
    activeWorkout.restore();
    if (isQuickStart) {
      router.push({ pathname: '/workout-session', params: { quick: '1' } });
    } else if (planId) {
      router.push({ pathname: '/workout-session', params: { planId } });
    }
  }

  if (!isActive) return null;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.island, { top }, glowShadow, islandStyle]}>
        <Animated.View pointerEvents="none" style={[styles.border, borderStyle]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Trening w tle: ${planName}, ${clock.minutes} minut ${clock.seconds} sekund, ${done} z ${total} ćwiczeń. Wróć do treningu`}
          onPress={openWorkout}
          style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.content, { top: contentTop }, contentStyle]}>
            <View style={styles.ring}>
              <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
                <Circle cx={RING / 2} cy={RING / 2} r={RING_RADIUS} stroke="rgba(255,255,255,0.14)" strokeWidth={RING_STROKE} fill="none" />
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RING_RADIUS}
                  stroke="#A3E635"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${RING_LENGTH * share} ${RING_LENGTH}`}
                  transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                />
              </Svg>
              <Text style={styles.ringValue}>
                {done}
                <Text style={styles.ringTotal}>/{total}</Text>
              </Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.clock}>
                {clock.minutes}:<Text style={styles.clockSeconds}>{clock.seconds}</Text>
              </Text>
              <Text numberOfLines={1} style={styles.planName}>{planName.toLocaleUpperCase('pl-PL')}</Text>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, "SF Mono", Menlo, monospace' });

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    elevation: 9999,
    zIndex: 9999,
  },
  island: {
    backgroundColor: '#000000',
    borderRadius: 26,
    left: '50%',
    overflow: 'hidden',
    position: 'absolute',
  },
  border: {
    ...StyleSheet.absoluteFill,
    borderColor: '#4ADE80',
    borderRadius: 26,
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    height: 44,
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
  },
  ring: {
    alignItems: 'center',
    height: RING,
    justifyContent: 'center',
    width: RING,
  },
  ringValue: {
    color: '#F5F7F6',
    fontSize: 12,
    fontWeight: '900',
  },
  ringTotal: {
    color: '#8A948C',
    fontSize: 9,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  clock: {
    color: '#F5F7F6',
    fontFamily: MONO,
    fontSize: 21,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  clockSeconds: {
    color: '#A3E635',
  },
  planName: {
    color: '#86EFAC',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 2,
  },
});
