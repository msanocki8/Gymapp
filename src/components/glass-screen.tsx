import { PropsWithChildren, useRef } from 'react';
import { BlurTargetView } from 'expo-blur';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

import { GlassBlurTargetContext } from '@/components/glass-blur-context';
import { GlowBackdrop } from '@/components/glow-backdrop';

type GlassScreenProps = PropsWithChildren<{
  className?: string;
  edges?: SafeAreaViewProps['edges'];
  style?: StyleProp<ViewStyle>;
}>;

export function GlassScreen({ children, className = '', edges, style }: GlassScreenProps) {
  const blurTarget = useRef<View>(null);

  return (
    <GlassBlurTargetContext.Provider value={blurTarget}>
      <SafeAreaView
        className={`relative flex-1 bg-ink-950 ${className}`}
        edges={edges}
        style={style}>
        <BlurTargetView
          ref={blurTarget}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
          <View className="absolute inset-0 bg-ink-950" />
          <GlowBackdrop />
        </BlurTargetView>
        {children}
      </SafeAreaView>
    </GlassBlurTargetContext.Provider>
  );
}
