import { Platform, StyleSheet, Text, View } from 'react-native';
import type { DimensionValue, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { progress, type Macros } from '@/lib/nutrition';

type CrossPlatformShadow = ViewStyle & { boxShadow?: string };

const RING = 150;
const STROKE = 12;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const shadow: CrossPlatformShadow = Platform.select<CrossPlatformShadow>({
  web: { boxShadow: '0 12px 26px rgba(0, 0, 0, 0.6)' },
  default: { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 18 },
}) ?? {};

const MACROS = [
  { key: 'protein', label: 'Białko', color: '#4ADE80' },
  { key: 'carbs', label: 'Węgle', color: '#A3E635' },
  { key: 'fat', label: 'Tłuszcze', color: '#D9F99D' },
] as const;

export function formatKcal(value: number) {
  return Math.round(value).toLocaleString('pl-PL').replace(/ | /g, ' ');
}

function formatGrams(value: number) {
  return String(Math.round(value));
}

/** Box „Kafel z wargą”: zjedzone · kółko „kcal zostało” · cel, pod spodem 3 paski makro. */
export function DietSummaryCard({ eaten, targets }: { eaten: Macros; targets: Macros }) {
  const left = targets.kcal - eaten.kcal;
  const share = progress(eaten.kcal, targets.kcal);
  const over = left < 0;

  return (
    <View style={[styles.lip, shadow]}>
      <View style={styles.card}>
        <View pointerEvents="none" style={styles.topLight} />
        <View style={styles.top}>
          <View style={styles.side}>
            <Text style={styles.sideValue}>{formatKcal(eaten.kcal)}</Text>
            <Text style={styles.sideLabel}>zjedzone</Text>
          </View>
          <View style={styles.ring} accessibilityLabel={`${over ? 'Przekroczono o' : 'Zostało'} ${formatKcal(Math.abs(left))} kcal`}>
            <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgGradient id="dietRing" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={over ? '#F59E0B' : '#22C55E'} />
                  <Stop offset="1" stopColor={over ? '#F87171' : '#A3E635'} />
                </SvgGradient>
              </Defs>
              <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} fill="none" />
              {share > 0 ? (
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  stroke="url(#dietRing)"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${CIRCUMFERENCE * share} ${CIRCUMFERENCE}`}
                  transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                />
              ) : null}
            </Svg>
            <Text style={styles.ringValue}>{formatKcal(Math.abs(left))}</Text>
            <Text style={styles.ringLabel}>{over ? 'kcal ponad cel' : 'kcal zostało'}</Text>
          </View>
          <View style={styles.side}>
            <Text style={styles.sideValue}>{formatKcal(targets.kcal)}</Text>
            <Text style={styles.sideLabel}>cel</Text>
          </View>
        </View>
        <View style={styles.macros}>
          {MACROS.map((macro) => (
            <View key={macro.key} style={styles.macro}>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { backgroundColor: macro.color, width: `${progress(eaten[macro.key], targets[macro.key]) * 100}%` as DimensionValue }]} />
              </View>
              <Text style={styles.macroValue}>
                <Text style={styles.macroValueStrong}>{formatGrams(eaten[macro.key])}</Text>/{formatGrams(targets[macro.key])}g
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Ciemna „warga” 6 px wystaje spod karty – jak przyciski w stylu Duolingo.
  lip: {
    backgroundColor: '#020302',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 28,
    borderWidth: 1,
  },
  card: {
    backgroundColor: '#0E120F',
    borderRadius: 27,
    marginBottom: 6,
    overflow: 'hidden',
    padding: 18,
    paddingBottom: 18,
  },
  topLight: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    height: 1,
    left: 20,
    position: 'absolute',
    right: 20,
    top: 0,
  },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  side: { alignItems: 'center', width: 80 },
  sideValue: { color: '#4ADE80', fontSize: 19, fontVariant: ['tabular-nums'], fontWeight: '900' },
  sideLabel: { color: '#8A948C', fontSize: 10, fontWeight: '800' },
  ring: { alignItems: 'center', height: RING, justifyContent: 'center', width: RING },
  ringValue: { color: '#F5F7F2', fontSize: 26, fontVariant: ['tabular-nums'], fontWeight: '900' },
  ringLabel: { color: '#9AA69F', fontSize: 10.5, fontWeight: '700' },
  macros: { columnGap: 10, flexDirection: 'row', marginTop: 16 },
  macro: { flex: 1, minWidth: 0 },
  macroLabel: { color: '#C9D1CB', fontSize: 11, fontWeight: '800' },
  track: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 7, marginTop: 5, overflow: 'hidden' },
  fill: { borderRadius: 4, height: '100%' },
  macroValue: { color: '#8A948C', fontSize: 11, marginTop: 4 },
  macroValueStrong: { color: '#F5F7F2', fontWeight: '700' },
});
