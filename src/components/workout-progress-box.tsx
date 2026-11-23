import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ObsidianCard } from '@/components/obsidian-card';

export type ExerciseProgressState = 'done' | 'partial' | 'todo';

const RING_SIZE = 96;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function PlayGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M7.5 4.8v14.4c0 .8.9 1.3 1.6.9l11.4-7.2c.6-.4.6-1.4 0-1.8L9.1 3.9c-.7-.4-1.6.1-1.6.9z" fill="#06210D" />
    </Svg>
  );
}

/** One card: rest countdown ring, finished exercises (e.g. 1/7), workout time and the rest controls. */
export function WorkoutProgressBox({
  exerciseStates,
  elapsedLabel,
  restRemainingSeconds,
  restTotalSeconds,
  onPrimaryPress,
  onAddRest,
  onLayout,
}: {
  exerciseStates: ExerciseProgressState[];
  elapsedLabel: string;
  restRemainingSeconds: number;
  restTotalSeconds: number;
  onPrimaryPress: () => void;
  onAddRest: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const total = exerciseStates.length;
  const done = exerciseStates.filter((state) => state === 'done').length;
  const resting = restRemainingSeconds > 0;
  const restShare = resting && restTotalSeconds > 0 ? Math.min(1, restRemainingSeconds / restTotalSeconds) : 1;

  return (
    <View onLayout={onLayout}>
      <ObsidianCard contentStyle={styles.content}>
        <View style={styles.top}>
          <View
            style={styles.ring}
            accessible
            accessibilityLabel={resting ? `Przerwa, zostało ${formatSeconds(restRemainingSeconds)}` : 'Przerwa zakończona, gotowy do serii'}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="#A3E635"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_LENGTH * restShare} ${RING_LENGTH}`}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <Text numberOfLines={1} style={[styles.ringValue, !resting && styles.ringValueReady]}>
              {resting ? formatSeconds(restRemainingSeconds) : 'Gotowy'}
            </Text>
            <Text style={styles.ringLabel}>{resting ? 'PRZERWA' : 'DO SERII'}</Text>
          </View>

          <View
            style={styles.progress}
            accessible
            accessibilityLabel={`Zrobione ćwiczenia: ${done} z ${total}`}>
            <Text style={styles.label}>ZROBIONE ĆWICZENIA</Text>
            <Text style={styles.count}>
              <Text style={styles.countDone}>{done}</Text>
              <Text style={styles.countTotal}>/{total}</Text>
            </Text>
            <View style={styles.segments}>
              {exerciseStates.map((state, index) => (
                <View key={index} style={styles.segment}>
                  {state === 'done' ? <View style={[styles.segmentFill, styles.segmentDone]} /> : null}
                  {state === 'partial' ? <View style={[styles.segmentFill, styles.segmentPartial]} /> : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottom}>
          <View style={styles.elapsed} accessible accessibilityLabel={`Czas treningu ${elapsedLabel}`}>
            <View style={styles.elapsedRow}>
              <View style={styles.liveDot} />
              <Text style={styles.elapsedValue}>{elapsedLabel}</Text>
            </View>
            <Text style={styles.label}>CZAS TRENINGU</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dodaj 15 sekund przerwy"
            onPress={onAddRest}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addText}>+15 s</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={resting ? 'Pomiń przerwę' : 'Rozpocznij serię i 90-sekundową przerwę'}
            onPress={onPrimaryPress}
            style={({ pressed }) => [styles.primaryPressable, pressed && styles.pressed]}>
            <LinearGradient
              colors={['#22C55E', '#A3E635']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primary}>
              <PlayGlyph />
              <Text style={styles.primaryText}>{resting ? 'POMIŃ' : 'SERIA'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ObsidianCard>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  ring: {
    alignItems: 'center',
    height: RING_SIZE,
    justifyContent: 'center',
    width: RING_SIZE,
  },
  ringValue: {
    color: '#F5F7F6',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  ringValueReady: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  ringLabel: {
    color: '#8A948C',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 1,
  },
  progress: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: '#8A948C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  count: {
    marginTop: 4,
  },
  countDone: {
    color: '#A3E635',
    fontSize: 54,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: -2.5,
  },
  countTotal: {
    color: '#5F6A62',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  segment: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4,
    flex: 1,
    height: 7,
    overflow: 'hidden',
  },
  segmentFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  segmentDone: {
    backgroundColor: '#A3E635',
    right: 0,
  },
  segmentPartial: {
    backgroundColor: '#4ADE80',
    width: '50%',
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    height: 1,
    marginVertical: 14,
  },
  bottom: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  elapsed: {
    flex: 1,
    minWidth: 0,
  },
  elapsedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 3,
  },
  liveDot: {
    backgroundColor: '#4ADE80',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  elapsedValue: {
    color: '#F5F7F6',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#0B0D0B',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 62,
  },
  addText: {
    color: '#D9F99D',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryPressable: {
    borderRadius: 999,
  },
  primary: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    minWidth: 110,
  },
  primaryText: {
    color: '#06210D',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
