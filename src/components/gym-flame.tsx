import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

const OUTER = 'M50 4C58 14 68 22 72 34C75 30 76 26 75 21C83 30 86 44 86 58C86 78 70 94 50 94C30 94 14 78 14 58C14 46 18 36 24 28C25 34 27 38 31 41C32 27 40 14 50 4Z';
const INNER = 'M50 38C55 46 60 50 61 56C63 54 64 52 64 49C69 55 71 62 71 69C71 81 62 89 50 89C38 89 29 81 29 69C29 62 31 56 36 50C36 54 37 57 39 58C40 50 44 44 50 38Z';

export type GymFlameVariant = 'lit' | 'off' | 'today';

export function GymFlame({
  size,
  variant = 'lit',
  dumbbell = false,
}: {
  size: number;
  variant?: GymFlameVariant;
  dumbbell?: boolean;
}) {
  const id = `flame${useId().replace(/:/g, '')}`;

  if (variant === 'off') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={OUTER} fill="#1C221E" stroke="#1C221E" strokeWidth={3.5} strokeLinejoin="round" />
        <Path d={INNER} fill="#262E28" stroke="#262E28" strokeWidth={3.5} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (variant === 'today') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={OUTER} fill="none" stroke="#4ADE80" strokeWidth={6} strokeDasharray="9 7" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id={`${id}o`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2EC041" />
          <Stop offset="1" stopColor="#95E235" />
        </SvgLinearGradient>
        <SvgLinearGradient id={`${id}i`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#BFF45C" />
          <Stop offset="1" stopColor="#EFFFB4" />
        </SvgLinearGradient>
      </Defs>
      <Path d={OUTER} fill={`url(#${id}o)`} stroke={`url(#${id}o)`} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d={INNER} fill={`url(#${id}i)`} stroke={`url(#${id}i)`} strokeWidth={3.5} strokeLinejoin="round" />
      {dumbbell ? (
        <G transform="translate(50 71) scale(0.7273)" fill="#0F2E1A">
          <Rect x={-22} y={-6.5} width={6} height={13} rx={3} />
          <Rect x={-16.5} y={-11} width={8} height={22} rx={3.5} />
          <Rect x={-9.5} y={-3} width={19} height={6} rx={3} />
          <Rect x={8.5} y={-11} width={8} height={22} rx={3.5} />
          <Rect x={16} y={-6.5} width={6} height={13} rx={3} />
        </G>
      ) : null}
    </Svg>
  );
}

export function GymLogoTile({ size }: { size: number }) {
  const id = `logoGlow${useId().replace(/:/g, '')}`;
  const radius = Math.round(size * 0.26);
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: radius }]}>
      <LinearGradient
        colors={['#151A16', '#0B0F0C']}
        style={[styles.tileFace, { borderRadius: radius }]}>
        <Svg width={size} height={size - 3} viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#22C55E" stopOpacity={0.32} />
              <Stop offset="1" stopColor="#22C55E" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={50} cy={62} rx={70} ry={60} fill={`url(#${id})`} />
        </Svg>
        <GymFlame size={Math.round(size * 0.74)} dumbbell />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#000000',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  tileFace: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginBottom: 3,
    overflow: 'hidden',
  },
});
