import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

export type SaveOverlayItem = { name: string; detail: string };
export type SaveOverlayStatus = 'saving' | 'success' | 'error';
export type SaveOverlayResult = 'success' | 'error';
type TileState = 'pending' | 'active' | 'done' | 'error';
type Phase = 'spin' | 'list' | 'flash';

const MAX_ITEMS = 3;
const LIST_AFTER_MS = 450;
const TICK_START_MS = 900;
const TICK_INTERVAL_MS = 600;
const SLOW_AFTER_MS = 8000;
const SUCCESS_HOLD_MS = 450;
const FLASH_MS = 650;
const ERROR_HOLD_MS = 1100;
const TILE_HEIGHT = 74;
const TILE_GAP = 12;
const CHECK_SIZE = 34;
const CHECK_PATH_LENGTH = 24;
const SPARK_COUNT = 8;
const blurMethod = Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined;
const smooth = Easing.bezier(0.65, 0, 0.35, 1);

const AnimatedPath = Animated.createAnimatedComponent(Path);

function haptic(kind: 'tick' | 'success' | 'error') {
  if (Platform.OS === 'web') return;
  const feedback = kind === 'tick'
    ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : Haptics.notificationAsync(kind === 'success'
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error);
  void feedback.catch(() => undefined);
}

function SpinnerOrb() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.set(withRepeat(withTiming(360, { duration: 700, easing: Easing.linear }), -1));
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  return (
    <Animated.View entering={ZoomIn.duration(260)} exiting={ZoomOut.duration(200)} style={styles.orbWrap}>
      <Animated.View style={[styles.orbRing, ringStyle]}>
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Defs>
            <SvgLinearGradient id="saveOrbTail" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#A3E635" stopOpacity={0} />
              <Stop offset="1" stopColor="#BEF264" />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={36}
            cy={36}
            r={33}
            stroke="url(#saveOrbTail)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="120 400"
            fill="none"
          />
        </Svg>
      </Animated.View>
      <LinearGradient
        colors={['#22C55E', '#A3E635']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.orb}
      />
    </Animated.View>
  );
}

function Spark({ angle, burst }: { angle: number; burst: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const progress = burst.get();
    const distance = 30 * progress;
    return {
      opacity: progress > 0 && progress < 1 ? 1 - progress : 0,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
        { scale: 1 - progress * 0.6 },
      ],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.spark, style]} />;
}

function SaveTile({ item, index, state }: { item: SaveOverlayItem; index: number; state: TileState }) {
  const fill = useSharedValue(0);
  const check = useSharedValue(0);
  const dash = useSharedValue(CHECK_PATH_LENGTH);
  const burst = useSharedValue(0);
  const sweep = useSharedValue(0);
  const bump = useSharedValue(1);
  const pulse = useSharedValue(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (state === 'done') {
      check.set(withSpring(1, { damping: 9, stiffness: 220 }));
      dash.set(withDelay(110, withTiming(0, { duration: 280, easing: smooth })));
      fill.set(withTiming(1, { duration: 500, easing: smooth }));
      burst.set(0);
      burst.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
      sweep.set(0);
      sweep.set(withTiming(1, { duration: 700, easing: Easing.bezier(0.4, 0, 0.2, 1) }));
      bump.set(withSequence(withTiming(1.035, { duration: 140 }), withSpring(1, { damping: 10 })));
    }
    if (state === 'active') {
      pulse.set(withRepeat(withTiming(1, { duration: 650 }), -1, true));
    } else {
      cancelAnimation(pulse);
      pulse.set(0);
    }
  }, [state, check, dash, fill, burst, sweep, bump, pulse]);

  const tileStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(fill.get(), [0, 1], ['rgba(255,255,255,0.10)', 'rgba(163,230,53,0.45)']),
    transform: [{ scale: bump.get() }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.get(),
    transform: [{ scaleX: fill.get() }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.get() > 0 && sweep.get() < 1 ? 1 : 0,
    transform: [{ translateX: -width + sweep.get() * width * 2 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.get() }],
  }));
  const haloStyle = useAnimatedStyle(() => {
    const progress = burst.get();
    return {
      opacity: progress > 0 && progress < 1 ? 0.9 * (1 - progress) : 0,
      transform: [{ scale: 0.6 + progress * 1.2 }],
    };
  });
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.get() * 0.65,
    transform: [{ scale: 1 + pulse.get() * 0.08 }],
  }));
  const checkPathProps = useAnimatedProps(() => ({
    strokeDashoffset: dash.get(),
  }));

  const isError = state === 'error';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(14)}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.tile, tileStyle, isError && styles.tileError]}>
      <Animated.View pointerEvents="none" style={[styles.tileFill, fillStyle]}>
        <LinearGradient
          colors={['rgba(34,197,94,0.20)', 'rgba(163,230,53,0.06)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sweepStyle]}>
        <LinearGradient
          colors={['rgba(190,242,100,0)', 'rgba(190,242,100,0.28)', 'rgba(190,242,100,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[styles.tileIcon, state === 'done' && styles.tileIconDone]}>
        <Text style={[styles.tileIconText, state === 'done' && styles.tileIconTextDone]}>⤡</Text>
      </View>
      <View style={styles.tileCopy}>
        <Text numberOfLines={1} style={[styles.tileName, state === 'done' && styles.tileNameDone]}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.tileDetail}>{item.detail}</Text>
      </View>

      <View style={styles.checkBox}>
        <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
        {Array.from({ length: SPARK_COUNT }, (_, sparkIndex) => (
          <Spark key={sparkIndex} angle={(sparkIndex / SPARK_COUNT) * Math.PI * 2} burst={burst} />
        ))}
        {isError ? (
          <View style={styles.checkError}>
            <Text style={styles.checkErrorText}>✕</Text>
          </View>
        ) : (
          <>
            <Animated.View style={[styles.checkRing, state === 'active' && styles.checkRingActive, state === 'active' && pulseStyle]} />
            <Animated.View style={[styles.checkFill, checkStyle]}>
              <LinearGradient
                colors={['#E8FFAA', '#A3E635', '#22C55E']}
                locations={[0, 0.45, 1]}
                start={{ x: 0.2, y: 0.1 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Svg width={CHECK_SIZE} height={CHECK_SIZE} viewBox="0 0 34 34" style={StyleSheet.absoluteFill}>
              <AnimatedPath
                d="M10 17.5 L15 22 L24 12.5"
                fill="none"
                stroke="#07150C"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={CHECK_PATH_LENGTH}
                animatedProps={checkPathProps}
              />
            </Svg>
          </>
        )}
      </View>
    </Animated.View>
  );
}

export function WorkoutSaveOverlay({
  items,
  status,
  onFinished,
}: {
  items: SaveOverlayItem[];
  status: SaveOverlayStatus;
  onFinished: (result: SaveOverlayResult) => void;
}) {
  const reducedMotion = useReducedMotion();
  const visibleItems = items.slice(0, MAX_ITEMS);
  const total = Math.max(1, visibleItems.length);
  const [phase, setPhase] = useState<Phase>('spin');
  const [checked, setChecked] = useState(0);
  const [lastReady, setLastReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const statusRef = useRef(status);
  const onFinishedRef = useRef(onFinished);
  const finishedRef = useRef(false);
  const railFill = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    statusRef.current = status;
    onFinishedRef.current = onFinished;
  });

  const finish = useCallback((result: SaveOverlayResult) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishedRef.current(result);
  }, []);

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    if (reducedMotion) return () => clearTimeout(slowTimer);

    const timers = [slowTimer, setTimeout(() => setPhase((current) => (current === 'spin' ? 'list' : current)), LIST_AFTER_MS)];
    for (let index = 0; index < total - 1; index += 1) {
      timers.push(setTimeout(() => {
        if (statusRef.current === 'error') return;
        setChecked((current) => Math.max(current, index + 1));
        haptic('tick');
      }, TICK_START_MS + index * TICK_INTERVAL_MS));
    }
    timers.push(setTimeout(() => setLastReady(true), TICK_START_MS + (total - 1) * TICK_INTERVAL_MS));
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, total]);

  // The last tick waits for the save to be confirmed, so it never claims success too early.
  useEffect(() => {
    if (reducedMotion || status !== 'success' || !lastReady || checked !== total - 1) return;
    const timer = setTimeout(() => {
      setChecked(total);
      haptic('success');
    }, 0);
    return () => clearTimeout(timer);
  }, [reducedMotion, status, lastReady, checked, total]);

  useEffect(() => {
    if (reducedMotion || status !== 'success' || checked !== total) return;
    const flashTimer = setTimeout(() => setPhase('flash'), SUCCESS_HOLD_MS);
    const doneTimer = setTimeout(() => finish('success'), SUCCESS_HOLD_MS + FLASH_MS);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(doneTimer);
    };
  }, [reducedMotion, status, checked, total, finish]);

  useEffect(() => {
    if (status !== 'error') return;
    if (reducedMotion) {
      finish('error');
      return;
    }
    haptic('error');
    const showErrorTimer = setTimeout(() => {
      setPhase('list');
      setFailed(true);
    }, 0);
    const timer = setTimeout(() => finish('error'), ERROR_HOLD_MS);
    return () => {
      clearTimeout(showErrorTimer);
      clearTimeout(timer);
    };
  }, [reducedMotion, status, finish]);

  useEffect(() => {
    if (!reducedMotion || status !== 'success') return;
    const timer = setTimeout(() => finish('success'), 250);
    return () => clearTimeout(timer);
  }, [reducedMotion, status, finish]);

  useEffect(() => {
    railFill.set(withTiming(Math.max(0, checked - 1) * (TILE_HEIGHT + TILE_GAP), { duration: 500, easing: smooth }));
  }, [checked, railFill]);

  useEffect(() => {
    if (phase === 'flash') flash.set(withTiming(1, { duration: FLASH_MS, easing: Easing.bezier(0.7, 0, 0.2, 1) }));
  }, [phase, flash]);

  const railStyle = useAnimatedStyle(() => ({ height: railFill.get() }));
  const listStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, flash.get() * 2.5),
    transform: [{ scale: 1 - flash.get() * 0.1 }],
  }));
  const flashStyle = useAnimatedStyle(() => {
    const progress = flash.get();
    return {
      opacity: progress === 0 ? 0 : progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4,
      transform: [{ scale: 0.4 + progress * 25.6 }],
    };
  });

  const label = status === 'error'
    ? 'Nie udało się zapisać treningu'
    : status === 'success'
      ? 'Trening zapisany'
      : 'Zapisuję trening';

  const tileState = (index: number): TileState => {
    if (failed && index === checked) return 'error';
    if (index < checked) return 'done';
    if (index === checked && phase === 'list') return 'active';
    return 'pending';
  };

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(220)}
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityViewIsModal
      style={styles.root}>
      {Platform.OS !== 'web' ? (
        <BlurView pointerEvents="none" blurMethod={blurMethod} intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <View pointerEvents="none" style={styles.dim} />

      {reducedMotion ? (
        <View style={styles.center}>
          <View style={styles.staticCard}>
            {status === 'error' ? null : <ActivityIndicator color="#A3E635" />}
            <Text style={styles.staticText}>{status === 'error' ? 'Nie udało się zapisać' : 'Zapisuję trening…'}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          {phase === 'spin' ? <SpinnerOrb /> : null}
          {phase !== 'spin' ? (
            <Animated.View style={[styles.list, listStyle]}>
              {total > 1 ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.rail,
                    { top: TILE_HEIGHT / 2, height: (total - 1) * (TILE_HEIGHT + TILE_GAP) },
                  ]}>
                  <Animated.View style={[styles.railFill, railStyle]} />
                </View>
              ) : null}
              {visibleItems.map((item, index) => (
                <SaveTile key={`${item.name}-${index}`} item={item} index={index} state={tileState(index)} />
              ))}
              {slow && status === 'saving' ? (
                <Animated.Text entering={FadeIn.duration(300)} style={styles.slow}>
                  Słabe połączenie, dalej zapisuję…
                </Animated.Text>
              ) : null}
            </Animated.View>
          ) : null}
          <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]}>
            <LinearGradient
              colors={['#BEF264', '#22C55E', '#0C3A1A']}
              locations={[0, 0.6, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    elevation: 50,
    zIndex: 50,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  orbWrap: {
    alignItems: 'center',
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  orbRing: {
    ...StyleSheet.absoluteFill,
  },
  orb: {
    borderRadius: 28,
    height: 56,
    width: 56,
    ...Platform.select({
      web: { boxShadow: '0 0 26px rgba(163,230,53,0.55)' },
      default: {
        elevation: 10,
        shadowColor: '#A3E635',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
    }),
  },
  list: {
    gap: TILE_GAP,
    maxWidth: 460,
    width: '100%',
  },
  rail: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'absolute',
    right: 14 + CHECK_SIZE / 2 - 1,
    width: 2,
  },
  railFill: {
    backgroundColor: '#A3E635',
    borderRadius: 2,
    width: '100%',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: 'rgba(6,10,8,0.82)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    height: TILE_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: 14,
    ...Platform.select({
      web: { boxShadow: '0 14px 30px rgba(0,0,0,0.45)' },
      default: {
        elevation: 6,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
    }),
  },
  tileError: {
    borderColor: 'rgba(248,113,113,0.6)',
  },
  tileFill: {
    ...StyleSheet.absoluteFill,
    transformOrigin: 'left',
  },
  tileIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(240,171,252,0.10)',
    borderColor: 'rgba(240,171,252,0.22)',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  tileIconDone: {
    backgroundColor: 'rgba(163,230,53,0.14)',
    borderColor: 'rgba(163,230,53,0.35)',
  },
  tileIconText: {
    color: '#F0ABFC',
    fontSize: 18,
  },
  tileIconTextDone: {
    color: '#D9F99D',
  },
  tileCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  tileName: {
    color: '#F5F7F6',
    fontSize: 15,
    fontWeight: '800',
  },
  tileNameDone: {
    color: '#E8FFAA',
  },
  tileDetail: {
    color: '#9AA69F',
    fontSize: 12,
  },
  checkBox: {
    alignItems: 'center',
    height: CHECK_SIZE,
    justifyContent: 'center',
    width: CHECK_SIZE,
  },
  checkRing: {
    ...StyleSheet.absoluteFill,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: CHECK_SIZE / 2,
    borderWidth: 2,
  },
  checkRingActive: {
    borderColor: '#A3E635',
  },
  checkFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: CHECK_SIZE / 2,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 0 18px rgba(163,230,53,0.7)' },
      default: {
        elevation: 6,
        shadowColor: '#A3E635',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      },
    }),
  },
  checkError: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: CHECK_SIZE / 2,
    justifyContent: 'center',
  },
  checkErrorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  halo: {
    borderColor: '#BEF264',
    borderRadius: (CHECK_SIZE + 12) / 2,
    borderWidth: 2,
    height: CHECK_SIZE + 12,
    position: 'absolute',
    width: CHECK_SIZE + 12,
  },
  spark: {
    backgroundColor: '#BEF264',
    borderRadius: 3,
    height: 5,
    position: 'absolute',
    width: 5,
  },
  slow: {
    color: '#9AA69F',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  flash: {
    borderRadius: 30,
    height: 60,
    overflow: 'hidden',
    position: 'absolute',
    width: 60,
  },
  staticCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(6,10,8,0.9)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  staticText: {
    color: '#F5F7F6',
    fontSize: 15,
    fontWeight: '800',
  },
});
