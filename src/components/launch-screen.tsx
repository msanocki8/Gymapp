import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// Symetryczny płomień z logo (viewBox 0 0 100 100) – lewa połowa to lustrzane odbicie prawej.
const OUTER = 'M50 4C58 14 68 22 72 34C75 30 76 26 75 21C83 30 86 44 86 58C86 78 70 94 50 94C30 94 14 78 14 58C14 44 17 30 25 21C24 26 25 30 28 34C32 22 42 14 50 4Z';
const INNER = 'M50 38C55 46 60 50 61 56C63 54 64 52 64 49C69 55 71 62 71 69C71 81 62 89 50 89C38 89 29 81 29 69C29 62 31 55 36 49C36 52 37 54 39 56C40 50 45 46 50 38Z';
const RIGHT_HALF = 'M50 4C58 14 68 22 72 34C75 30 76 26 75 21C83 30 86 44 86 58C86 78 70 94 50 94';
const LEFT_HALF = 'M50 4C42 14 32 22 28 34C25 30 24 26 25 21C17 30 14 44 14 58C14 78 30 94 50 94';
const HALF_LENGTH = 148; // zmierzona długość połówki konturu (147,3) + zapas
const SPARK = 'M0 -6C1 -2 2 -1 6 0C2 1 1 2 0 6C-1 2 -2 1 -6 0C-2 -1 -1 -2 0 -6Z';

const LOGO = 132;
const BG = '#070908'; // ten sam kolor co natywny splash (app.json) – bez mignięcia
const MIN_VISIBLE_MS = 2700;
const ease = Easing.bezier(0.4, 0, 0.2, 1);
const pop = Easing.bezier(0.2, 1.2, 0.4, 1);

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

let shownThisLaunch = false;

/**
 * Ekran ładowania (wariant 2 „Rysowany płomień”): kontur rysuje się symetrycznie od czubka,
 * płomień napełnia się zielenią od dołu, wskakuje jasne serce i hantel, potem napis GymLog.
 * Znika (fade 350 ms), gdy minęła animacja ORAZ aplikacja jest gotowa (`ready`).
 */
export function LaunchScreen({ ready, onShown }: { ready: boolean; onShown?: () => void }) {
  const reducedMotion = useReducedMotion();
  const [animationDone, setAnimationDone] = useState(false);
  const [visible, setVisible] = useState(!shownThisLaunch);

  const draw = useSharedValue(0);
  const fill = useSharedValue(0);
  const outline = useSharedValue(1);
  const glow = useSharedValue(0);
  const heart = useSharedValue(0);
  const dumbbell = useSharedValue(0);
  const word = useSharedValue(0);
  const spark = useSharedValue(0);
  const screen = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    onShown?.();
    if (reducedMotion) {
      draw.set(1); fill.set(1); outline.set(0); glow.set(0.6); heart.set(1); dumbbell.set(1); word.set(1);
      const timer = setTimeout(() => setAnimationDone(true), 600);
      return () => clearTimeout(timer);
    }
    draw.set(withTiming(1, { duration: 900, easing: ease }));
    fill.set(withDelay(800, withTiming(1, { duration: 800, easing: ease })));
    outline.set(withDelay(1700, withTiming(0, { duration: 300 })));
    glow.set(withDelay(1400, withSequence(
      withTiming(0.8, { duration: 600 }),
      withRepeat(withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true),
    )));
    heart.set(withDelay(1550, withTiming(1, { duration: 450, easing: pop })));
    dumbbell.set(withDelay(1850, withTiming(1, { duration: 400, easing: pop })));
    word.set(withDelay(2100, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) })));
    spark.set(withDelay(2100, withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }), -1, true)));
    const timer = setTimeout(() => setAnimationDone(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible, reducedMotion, onShown, draw, fill, outline, glow, heart, dumbbell, word, spark]);

  useEffect(() => {
    if (!visible || !animationDone || !ready) return;
    shownThisLaunch = true;
    screen.set(withTiming(0, { duration: reducedMotion ? 0 : 350 }, (finished) => {
      if (finished) scheduleOnRN(setVisible, false);
    }));
  }, [visible, animationDone, ready, reducedMotion, screen]);

  const outlineProps = useAnimatedProps(() => ({
    strokeDashoffset: HALF_LENGTH * (1 - draw.get()),
    strokeOpacity: outline.get(),
  }));
  const fillProps = useAnimatedProps(() => ({
    y: 100 * (1 - fill.get()),
    height: 100 * fill.get(),
  }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.get() }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const heartStyle = useAnimatedStyle(() => ({
    opacity: heart.get(),
    transform: [{ scale: 0.4 + 0.6 * heart.get() }],
  }));
  const dumbbellStyle = useAnimatedStyle(() => ({
    opacity: dumbbell.get(),
    transform: [{ scale: 0.4 + 0.6 * dumbbell.get() }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.get(),
    transform: [{ translateY: 12 * (1 - word.get()) }],
  }));
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: word.get() * (0.25 + 0.65 * spark.get()),
    transform: [{ scale: 0.6 + 0.4 * spark.get() }],
  }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="auto" style={[styles.screen, screenStyle]} accessibilityLabel="Ładowanie GymLog">
      <View style={styles.center}>
        <View style={styles.logo}>
          {/* Poświata pod płomieniem (działa także bez filtrów rozmycia na telefonie) */}
          <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
            <Svg width={LOGO * 2} height={LOGO * 2}>
              <Defs>
                <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#4ADE80" stopOpacity={0.55} />
                  <Stop offset="1" stopColor="#4ADE80" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={LOGO} cy={LOGO * 1.08} rx={LOGO * 0.62} ry={LOGO * 0.66} fill="url(#launchGlow)" />
            </Svg>
          </Animated.View>

          {/* Napełnianie zielenią + rysowany kontur */}
          <Svg width={LOGO} height={LOGO} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="launchFire" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#2EC041" />
                <Stop offset="1" stopColor="#95E235" />
              </SvgLinearGradient>
              <ClipPath id="launchClip">
                <Path d={OUTER} />
              </ClipPath>
            </Defs>
            <G clipPath="url(#launchClip)">
              <AnimatedRect x={0} width={100} fill="url(#launchFire)" animatedProps={fillProps} />
            </G>
            {[RIGHT_HALF, LEFT_HALF].map((d) => (
              <AnimatedPath
                key={d}
                d={d}
                fill="none"
                stroke="#A3E635"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${HALF_LENGTH} ${HALF_LENGTH}`}
                animatedProps={outlineProps}
              />
            ))}
          </Svg>

          {/* Jasne serce z połyskiem */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, heartStyle]}>
            <Svg width={LOGO} height={LOGO} viewBox="0 0 100 100">
              <Defs>
                <SvgLinearGradient id="launchHeart" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#BFF45C" />
                  <Stop offset="1" stopColor="#EFFFB4" />
                </SvgLinearGradient>
              </Defs>
              <Path d="M23 62C22 52 25 44 30 37" fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={4.5} strokeLinecap="round" />
              <Path d={INNER} fill="url(#launchHeart)" />
            </Svg>
          </Animated.View>

          {/* Hantel – dokładnie na osi płomienia */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, dumbbellStyle]}>
            <Svg width={LOGO} height={LOGO} viewBox="0 0 100 100">
              <G transform="translate(50 71) scale(0.7273)" fill="#0F2E1A">
                <Rect x={-22} y={-6.5} width={6} height={13} rx={3} />
                <Rect x={-16.5} y={-11} width={8} height={22} rx={3.5} />
                <Rect x={-9.5} y={-3} width={19} height={6} rx={3} />
                <Rect x={8.5} y={-11} width={8} height={22} rx={3.5} />
                <Rect x={16} y={-6.5} width={6} height={13} rx={3} />
              </G>
            </Svg>
          </Animated.View>

          {/* Dwie iskry, symetrycznie */}
          {[0.14, 0.86].map((x) => (
            <Animated.View
              key={x}
              pointerEvents="none"
              style={[styles.spark, { left: LOGO * x - 7, top: LOGO * 0.18 - 7 }, sparkStyle]}>
              <Svg width={14} height={14} viewBox="-7 -7 14 14">
                <Path d={SPARK} fill="#D9F99D" />
              </Svg>
            </Animated.View>
          ))}
        </View>

        <Animated.View style={wordStyle}>
          <Text style={styles.word} accessibilityRole="header">
            Gym<Text style={styles.wordAccent}>Log</Text>
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: BG,
    elevation: 10000,
    justifyContent: 'center',
    zIndex: 10000,
  },
  center: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  logo: {
    height: LOGO,
    width: LOGO,
  },
  glow: {
    height: LOGO * 2,
    left: -LOGO / 2,
    position: 'absolute',
    top: -LOGO / 2,
    width: LOGO * 2,
  },
  spark: {
    height: 14,
    position: 'absolute',
    width: 14,
  },
  word: {
    color: '#F5F7F2',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 44,
    marginTop: 22,
    textAlign: 'center',
  },
  wordAccent: {
    color: '#7DDB3F',
  },
});
