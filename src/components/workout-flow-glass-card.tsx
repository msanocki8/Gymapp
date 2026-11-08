import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useContext, type PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { GlassBlurTargetContext } from '@/components/glass-blur-context';

type CardTone = 'default' | 'featured' | 'plan';
type CrossPlatformShadow = ViewStyle & { boxShadow?: string };

const blurMethod = Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined;
const cardShadow: CrossPlatformShadow = Platform.select({
  web: { boxShadow: '0 10px 28px rgba(0, 0, 0, 0.26)' },
  default: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
}) ?? {};
const gradients: Record<CardTone, readonly [string, string, ...string[]]> = {
  default: ['rgba(255,255,255,0.07)', 'rgba(34,197,94,0.1)', 'rgba(0,0,0,0.4)'],
  featured: ['rgba(34,197,94,0.18)', 'rgba(12,30,17,0.3)', 'rgba(0,0,0,0.52)'],
  plan: ['rgba(74,222,128,0.14)', 'rgba(34,197,94,0.08)', 'rgba(0,0,0,0.48)'],
};

export function WorkoutFlowGlassCard({
  children,
  tone = 'default',
  style,
  contentStyle,
  glow = false,
}: PropsWithChildren<{
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
}>) {
  const blurTarget = useContext(GlassBlurTargetContext);

  return (
    <View
      className="relative min-w-0 overflow-hidden rounded-[26px] border bg-black/40"
      style={[styles.shell, cardShadow, glow && styles.glow, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView
          pointerEvents="none"
          blurMethod={blurMethod}
          blurTarget={blurTarget ?? undefined}
          intensity={22}
          tint="dark"
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
      ) : null}
      <LinearGradient
        pointerEvents="none"
        colors={gradients[tone]}
        locations={[0, 0.48, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {tone === 'plan' ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(34,197,94,0.15)', 'rgba(74,222,128,0.04)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, styles.planAccent]}
        />
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 26,
    borderWidth: 1,
  },
  glow: {
    borderColor: 'rgba(74,222,128,0.24)',
  },
  blur: {
    borderRadius: 26,
  },
  planAccent: {
    width: '56%',
  },
  content: {
    padding: 17,
    position: 'relative',
    zIndex: 1,
  },
});
