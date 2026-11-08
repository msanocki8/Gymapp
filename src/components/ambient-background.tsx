import type { ComponentRef, RefObject } from 'react';
import { BlurTargetView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

type AmbientBackgroundProps = {
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
};

export function AmbientBackground({ blurTarget }: AmbientBackgroundProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BlurTargetView
        ref={blurTarget}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}>
        <View className="absolute inset-0 bg-ink-950" />
        <View className="absolute -right-[246px] -top-[138px] h-[390px] w-[390px] rounded-full bg-[#22C55E]/[0.35]" />
        <View className="absolute -right-[250px] top-[320px] h-[300px] w-[300px] rounded-full bg-[#A3E635]/[0.12]" />
        <View className="absolute -bottom-[220px] -left-[280px] h-[370px] w-[370px] rounded-full bg-[#22C55E]/[0.2]" />
      </BlurTargetView>
      <View className="absolute -right-[196px] -top-[112px] h-[290px] w-[290px] rounded-full bg-[#22C55E]/[0.08]" />
    </View>
  );
}
