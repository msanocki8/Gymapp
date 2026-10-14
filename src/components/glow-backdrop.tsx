import { Platform, View, ViewStyle } from 'react-native';
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
            ...(Platform.OS === 'web' ? { filter: 'blur(84px)' } : {}),
          } as GlowOrbStyle,
        ]}
      />
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
            ...(Platform.OS === 'web' ? { filter: 'blur(90px)' } : {}),
          } as GlowOrbStyle,
        ]}
      />
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
            ...(Platform.OS === 'web' ? { filter: 'blur(90px)' } : {}),
          } as GlowOrbStyle,
        ]}
      />
    </View>
  );
}
