import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PropsWithChildren, useContext } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { GlassBlurTargetContext } from '@/components/glass-blur-context';

type GlassPanelProps = PropsWithChildren<{
  className: string;
  tone?: 'neutral' | 'lime' | 'mint';
  delay?: number;
  radius?: number;
  blurIntensity?: number;
  style?: StyleProp<ViewStyle>;
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
}>;

type GlassSurfaceStyle = ViewStyle & {
  backdropFilter?: string;
  WebkitBackdropFilter?: string;
  backgroundImage?: string;
  boxShadow?: string;
};

const toneStyles = {
  neutral: {
    backgroundColor: 'rgba(9, 13, 10, 0.46)',
    borderColor: 'rgba(235, 242, 235, 0.11)',
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  lime: {
    backgroundColor: 'rgba(13, 17, 10, 0.48)',
    borderColor: 'rgba(235, 242, 235, 0.11)',
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  mint: {
    backgroundColor: 'rgba(8, 15, 11, 0.48)',
    borderColor: 'rgba(235, 242, 235, 0.11)',
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
} as const;

export function GlassPanel({
  children,
  className,
  contentClassName,
  tone = 'neutral',
  delay = 0,
  radius = 26,
  blurIntensity = 22,
  style,
  contentStyle,
}: GlassPanelProps) {
  const blurTarget = useContext(GlassBlurTargetContext);
  const surfaceStyle = toneStyles[tone];
  const platformStyle: GlassSurfaceStyle = Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.04), transparent 52%)',
        boxShadow: surfaceStyle.boxShadow,
      }
    : {
        shadowColor: surfaceStyle.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
        elevation: 4,
      };

  const panel = (
    <View
      className={`relative overflow-hidden border ${className}`}
      style={[
        {
          backgroundColor: surfaceStyle.backgroundColor,
          borderColor: surfaceStyle.borderColor,
          borderTopColor: surfaceStyle.borderTopColor,
          borderWidth: 1,
          borderRadius: radius,
        },
        platformStyle,
        style,
      ]}>
      {Platform.OS !== 'web' && blurIntensity > 0 && (
        <BlurView
          blurTarget={blurTarget ?? undefined}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          intensity={blurIntensity}
          tint="dark"
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none', zIndex: 0, borderRadius: radius, overflow: 'hidden' }]}
        />
      )}
      <View style={{ pointerEvents: 'none', zIndex: 0 }} className="absolute left-6 right-6 top-0 h-px bg-white/15" />
      <View className={`relative z-10 ${contentClassName ?? ''}`} style={[{ position: 'relative', zIndex: 1 }, contentStyle]}>
        {children}
      </View>
    </View>
  );

  if (Platform.OS === 'web') return panel;

  return <Animated.View entering={FadeInDown.delay(delay).duration(440)}>{panel}</Animated.View>;
}
