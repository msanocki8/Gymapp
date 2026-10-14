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
    backgroundColor: 'rgba(213, 230, 216, 0.04)',
    borderColor: 'rgba(235, 242, 235, 0.13)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000000',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  lime: {
    backgroundColor: 'rgba(177, 230, 97, 0.06)',
    borderColor: 'rgba(235, 242, 235, 0.13)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000000',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  mint: {
    backgroundColor: 'rgba(100, 199, 151, 0.045)',
    borderColor: 'rgba(235, 242, 235, 0.13)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
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
  style,
  contentStyle,
}: GlassPanelProps) {
  const blurTarget = useContext(GlassBlurTargetContext);
  const surfaceStyle = toneStyles[tone];
  const platformStyle: GlassSurfaceStyle = Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(24px) saturate(165%)',
        WebkitBackdropFilter: 'blur(24px) saturate(165%)',
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.06), transparent 52%)',
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
      {Platform.OS !== 'web' && (
        <BlurView
          blurTarget={blurTarget ?? undefined}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          intensity={40}
          tint="dark"
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none', borderRadius: radius, overflow: 'hidden' }]}
        />
      )}
      <View style={{ pointerEvents: 'none' }} className="absolute left-6 right-6 top-0 h-px bg-white/15" />
      <View className={`relative z-10 ${contentClassName ?? ''}`} style={contentStyle}>{children}</View>
    </View>
  );

  if (Platform.OS === 'web') return panel;

  return <Animated.View entering={FadeInDown.delay(delay).duration(440)}>{panel}</Animated.View>;
}
