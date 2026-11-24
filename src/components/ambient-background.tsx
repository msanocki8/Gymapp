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
        <View style={styles.base} />
        <View style={styles.topGlow} />
        <View style={styles.middleGlow} />
        <View style={styles.bottomGlow} />
      </BlurTargetView>
      <View style={styles.outerGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#050706',
  },
  topGlow: {
    position: 'absolute',
    right: -246,
    top: -138,
    width: 390,
    height: 390,
    borderRadius: 195,
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  middleGlow: {
    position: 'absolute',
    right: -250,
    top: 320,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(163, 230, 53, 0.12)',
  },
  bottomGlow: {
    position: 'absolute',
    left: -280,
    bottom: -220,
    width: 370,
    height: 370,
    borderRadius: 185,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  outerGlow: {
    position: 'absolute',
    right: -196,
    top: -112,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
});
