import { Platform, View, ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

type GlowOrbStyle = ViewStyle & {
  filter?: string;
};

function GlowHalo({ id, color, opacity }: { id: string; color: string; opacity: number }) {
  return (
    <Svg
      pointerEvents="none"
      style={{ position: 'absolute', left: -110, top: -110 }}
      width={520}
      height={520}
      viewBox="0 0 520 520">
      <Defs>
        <RadialGradient id={id} cx="260" cy="260" r="260" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.48" stopColor={color} stopOpacity={opacity * 0.58} />
          <Stop offset="0.78" stopColor={color} stopOpacity={opacity * 0.2} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="260" cy="260" rx="260" ry="260" fill={`url(#${id})`} />
    </Svg>
  );
}

export function GlowBackdrop() {
  const limeGlow = useSharedValue(0);
  const mintGlow = useSharedValue(0);

  useEffect(() => {
    limeGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    mintGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [limeGlow, mintGlow]);

  const limeStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + limeGlow.value * 0.24,
    transform: [{ scale: 0.92 + limeGlow.value * 0.12 }],
  }));
  const mintStyle = useAnimatedStyle(() => ({
    opacity: 0.38 + mintGlow.value * 0.22,
    transform: [{ scale: 0.94 + mintGlow.value * 0.1 }],
  }));

  return (
    <View style={[{ pointerEvents: 'none' }]} className="absolute inset-0 overflow-hidden">
      <Animated.View
        style={[
          limeStyle,
          {
            position: 'absolute',
            right: '-12%',
            top: 72,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: 'rgba(34, 197, 94, 0.3)',
            shadowColor: '#22c55e',
            shadowOpacity: 0.58,
            shadowRadius: 52,
            shadowOffset: { width: 0, height: 0 },
            elevation: 18,
            ...(Platform.OS === 'web' ? { filter: 'blur(84px)' } : {}),
          } as GlowOrbStyle,
        ]}>
        <GlowHalo id="lime-orb-halo" color="#22c55e" opacity={0.32} />
      </Animated.View>
      <Animated.View
        style={[
          mintStyle,
          {
            position: 'absolute',
            left: '8%',
            top: 400,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: 'rgba(83, 230, 165, 0.22)',
            shadowColor: '#53e6a5',
            shadowOpacity: 0.42,
            shadowRadius: 48,
            shadowOffset: { width: 0, height: 0 },
            elevation: 16,
            ...(Platform.OS === 'web' ? { filter: 'blur(90px)' } : {}),
          } as GlowOrbStyle,
        ]}>
        <GlowHalo id="mint-orb-halo" color="#53e6a5" opacity={0.28} />
      </Animated.View>
      <Animated.View
        style={[
          mintStyle,
          {
            position: 'absolute',
            right: '18%',
            bottom: -192,
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: 'rgba(181, 240, 102, 0.18)',
            shadowColor: '#b5f066',
            shadowOpacity: 0.36,
            shadowRadius: 50,
            shadowOffset: { width: 0, height: 0 },
            elevation: 15,
            ...(Platform.OS === 'web' ? { filter: 'blur(90px)' } : {}),
          } as GlowOrbStyle,
        ]}>
        <GlowHalo id="lime-orb-lower-halo" color="#b5f066" opacity={0.26} />
      </Animated.View>
    </View>
  );
}
