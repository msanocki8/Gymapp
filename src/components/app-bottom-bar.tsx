import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import type { ComponentProps } from 'react';
import Animated, {
  Easing,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

export type AppTabName = 'training' | 'history' | 'account';

type CrossPlatformShadow = ViewStyle & { boxShadow?: string };
type IconName = ComponentProps<typeof SymbolView>['name'];

const blurMethod = Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined;
const BAR_HEIGHT = 64;
const FAB_SIZE = 66;
const WEB_BOTTOM_GAP = 12;
// The button's centre sits this far below the top edge of the bar, so it rises 21 px above it.
const FAB_CENTER_BELOW_TOP = 12;
const FAB_OVERHANG = FAB_SIZE / 2 - FAB_CENTER_BELOW_TOP;
export const APP_BOTTOM_BAR_CONTENT_HEIGHT =
  BAR_HEIGHT + FAB_OVERHANG + (Platform.OS === 'web' ? WEB_BOTTOM_GAP : 0);
const MORPH_MS = 600;
const morphEasing = Easing.bezier(0.65, 0, 0.35, 1);
const startMorph = makeMutable(0);

const icons: Record<AppTabName | 'ai', IconName> = {
  training: { ios: 'house', android: 'home', web: 'home' },
  history: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  ai: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  account: { ios: 'person', android: 'person', web: 'person' },
};

const fabGlow: CrossPlatformShadow = Platform.select<CrossPlatformShadow>({
  web: { boxShadow: '0 0 16px rgba(163, 230, 53, 0.45)' },
  default: {
    elevation: 12,
    shadowColor: '#A3E635',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
}) ?? {};

function PlayGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" style={{ marginLeft: 2 }}>
      <Path d="M7.5 4.8v14.4c0 .8.9 1.3 1.6.9l11.4-7.2c.6-.4.6-1.4 0-1.8L9.1 3.9c-.7-.4-1.6.1-1.6.9z" fill="#06210D" />
    </Svg>
  );
}

function BoltGlyph() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M13.2 2.5 5 13.6c-.4.6 0 1.4.7 1.4H11l-1.3 6.4c-.2.9 1 1.4 1.5.7L19 11c.4-.6 0-1.4-.7-1.4H13l1.7-6.3c.2-.9-1-1.4-1.5-.8z" fill="#06210D" />
    </Svg>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? '#F2F5F2' : '#8A948C';
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <SymbolView name={icon} size={22} tintColor={color} />
      <View style={[styles.indicator, active && styles.indicatorActive]} />
    </Pressable>
  );
}

export function AppBottomBar({
  activeTab,
  bottomInset,
  onNavigate,
  onStart,
  onAiCoach,
  startActive = false,
  aiActive = false,
}: {
  activeTab: AppTabName | null;
  bottomInset: number;
  onNavigate: (tab: AppTabName) => void;
  onStart: () => void;
  onAiCoach: () => void;
  startActive?: boolean;
  aiActive?: boolean;
}) {
  const bottomPadding = Platform.OS === 'web'
    ? Math.max(bottomInset - WEB_BOTTOM_GAP, 0)
    : Math.max(bottomInset, 10);
  const reducedMotion = useReducedMotion();
  const morph = startMorph;

  useEffect(() => {
    if (!startActive) return;
    morph.set(reducedMotion ? 1 : withTiming(1, { duration: MORPH_MS, easing: morphEasing }));
    return () => {
      morph.set(reducedMotion ? 0 : withTiming(0, { duration: MORPH_MS, easing: morphEasing }));
    };
  }, [startActive, reducedMotion, morph]);

  const playStyle = useAnimatedStyle(() => ({
    opacity: 1 - morph.get(),
    transform: [{ rotate: `${morph.get() * 180}deg` }, { scale: 1 - morph.get() * 0.4 }],
  }));
  const boltStyle = useAnimatedStyle(() => ({
    opacity: morph.get(),
    transform: [{ rotate: `${(morph.get() - 1) * 180}deg` }, { scale: 0.6 + morph.get() * 0.4 }],
  }));

  return (
    <View nativeID="app-bottom-bar" pointerEvents="box-none" style={[styles.bar, { paddingBottom: bottomPadding }]}>
      {/* The row is tall enough to hold the raised button, so every pixel of it stays tappable. */}
      <View pointerEvents="box-none" style={styles.row}>
        <View pointerEvents="none" style={styles.pillBackground}>
          <BlurView blurMethod={blurMethod} intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
        <View accessibilityRole="tablist" style={styles.tabs}>
          <TabButton label="Treningi" icon={icons.training} active={activeTab === 'training'} onPress={() => onNavigate('training')} />
          <TabButton label="Historia" icon={icons.history} active={activeTab === 'history'} onPress={() => onNavigate('history')} />
          <View style={styles.fabSlot} />
          <TabButton label="AI Coach" icon={icons.ai} active={aiActive} onPress={onAiCoach} />
          <TabButton label="Konto" icon={icons.account} active={activeTab === 'account'} onPress={() => onNavigate('account')} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={startActive ? 'Wybierasz trening' : 'Wybierz i rozpocznij trening'}
          accessibilityState={{ selected: startActive }}
          onPress={onStart}
          style={({ pressed }) => [styles.fab, fabGlow, pressed && styles.fabPressed]}>
          <LinearGradient
            colors={['#22C55E', '#A3E635']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabCore}>
            <Animated.View style={[styles.glyph, playStyle]}>
              <PlayGlyph />
            </Animated.View>
            <Animated.View style={[styles.glyph, boltStyle]}>
              <BoltGlyph />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    bottom: Platform.OS === 'web' ? WEB_BOTTOM_GAP : 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  row: {
    height: BAR_HEIGHT + FAB_OVERHANG,
    maxWidth: 500,
    position: 'relative',
    width: '92%',
  },
  pillBackground: {
    backgroundColor: 'rgba(8,10,9,0.9)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    bottom: 0,
    height: BAR_HEIGHT,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
  },
  tabs: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    height: BAR_HEIGHT,
    justifyContent: 'space-around',
    left: 0,
    paddingHorizontal: 8,
    position: 'absolute',
    right: 0,
  },
  tab: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  indicator: {
    borderRadius: 2,
    height: 3,
    marginTop: 5,
    width: 18,
  },
  indicatorActive: {
    backgroundColor: '#A3E635',
  },
  fabSlot: {
    width: 70,
  },
  fab: {
    backgroundColor: '#050706',
    borderColor: 'rgba(163,230,53,0.9)',
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    height: FAB_SIZE,
    left: '50%',
    marginLeft: -FAB_SIZE / 2,
    padding: 3,
    position: 'absolute',
    top: 0,
    width: FAB_SIZE,
    zIndex: 2,
  },
  fabCore: {
    alignItems: 'center',
    borderRadius: FAB_SIZE / 2,
    flex: 1,
    justifyContent: 'center',
  },
  glyph: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  pressed: {
    opacity: 0.75,
  },
});
