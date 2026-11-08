import { Platform, StyleSheet, View } from 'react-native';

export function GlowBackdrop() {
  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.webBackdrop]}>
        <View
          style={[
            styles.webGlow,
            {
              top: -100,
              right: -120,
              width: 360,
              height: 360,
              backgroundColor: 'rgba(22, 101, 52, 0.55)',
            },
          ]}
        />
        <View
          style={[
            styles.webGlow,
            {
              top: 330,
              right: -30,
              width: 220,
              height: 220,
              backgroundColor: 'rgba(77, 80, 30, 0.35)',
            },
          ]}
        />
        <View
          style={[
            styles.webGlow,
            {
              bottom: -200,
              left: -150,
              width: 320,
              height: 320,
              backgroundColor: 'rgba(22, 101, 52, 0.5)',
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.nativeBackdrop} className="absolute inset-0 overflow-hidden">
      <View
        style={{
          position: 'absolute',
          right: -120,
          top: -100,
          width: 360,
          height: 360,
          borderRadius: 180,
          backgroundColor: 'rgba(22, 101, 52, 0.55)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -30,
          top: 330,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(77, 80, 30, 0.35)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -150,
          bottom: -200,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: 'rgba(22, 101, 52, 0.5)',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeBackdrop: { pointerEvents: 'none' },
  webBackdrop: { pointerEvents: 'none', overflow: 'hidden' },
  webGlow: { position: 'absolute', borderRadius: 999 },
});
