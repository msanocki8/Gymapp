import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

import type { MuscleBarRow } from '@/lib/plan-muscles';

type CrossPlatformShadow = ViewStyle & { boxShadow?: string };

const shadow: CrossPlatformShadow = Platform.select<CrossPlatformShadow>({
  web: { boxShadow: '0 10px 24px rgba(0, 0, 0, 0.55)' },
  default: {
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
}) ?? {};

const edge = ['rgba(163,230,53,0.45)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(163,230,53,0.15)'] as const;
const edgeHighlighted = ['#A3E635', 'rgba(163,230,53,0.35)', 'rgba(163,230,53,0.15)', '#A3E635'] as const;
const fill = ['#121412', '#060706'] as const;

/** Deep black card with a lime-to-transparent edge and a faint top sheen. */
export function ObsidianCard({
  children,
  radius = 22,
  highlighted = false,
  style,
  contentStyle,
}: PropsWithChildren<{
  radius?: number;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  return (
    <LinearGradient
      colors={highlighted ? edgeHighlighted : edge}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius, padding: 1 }, shadow, style]}>
      <LinearGradient
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.inner, { borderRadius: radius - 1 }]}>
        <View pointerEvents="none" style={styles.sheen} />
        <View style={contentStyle}>{children}</View>
      </LinearGradient>
    </LinearGradient>
  );
}

export function MuscleBars({ rows, labelWidth = 84 }: { rows: MuscleBarRow[]; labelWidth?: number }) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>Brak przypisanych mięśni dla ćwiczeń z tego planu.</Text>;
  }
  return (
    <View style={styles.bars}>
      {rows.map((row) => (
        <View
          key={row.key}
          style={styles.barRow}
          accessible
          accessibilityLabel={`${row.label}: ${row.caption}, ${Math.round(row.share * 100)} procent`}>
          <Text numberOfLines={1} style={[styles.barLabel, { width: labelWidth }]}>{row.label}</Text>
          <View style={styles.track}>
            {row.share > 0 ? (
              <LinearGradient
                colors={['#22C55E', '#A3E635']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.fill, { width: `${Math.max(6, Math.round(row.share * 100))}%` as DimensionValue }]}
              />
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.caption}>{row.caption}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    overflow: 'hidden',
  },
  sheen: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    height: 1,
    left: 14,
    position: 'absolute',
    right: 14,
    top: 0,
  },
  bars: {
    gap: 6,
  },
  barRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  barLabel: {
    color: '#C9D1CB',
    fontSize: 11.5,
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
    height: '100%',
  },
  caption: {
    color: '#7F8983',
    fontSize: 10.5,
    minWidth: 46,
    textAlign: 'right',
  },
  empty: {
    color: '#7F8983',
    fontSize: 11.5,
  },
});
