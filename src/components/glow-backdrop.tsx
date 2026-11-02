import { Platform, StyleSheet, View } from 'react-native';

export function GlowBackdrop() {
  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.webBackdrop]}>
        <View
          style={[
            styles.webGlow,
            {
              top: -130,
              right: -150,
              width: 470,
              height: 470,
              backgroundColor: 'rgba(34, 197, 94, 0.3)',
            },
          ]}
        />
        <View
          style={[
            styles.webGlow,
            {
              bottom: -280,
              left: -180,
              width: 520,
              height: 520,
              backgroundColor: 'rgba(83, 230, 165, 0.28)',
            },
          ]}
        />
        <View
          style={[
            styles.webGlow,
            {
              top: '42%',
              left: '58%',
              width: 210,
              height: 210,
              backgroundColor: 'rgba(181, 240, 102, 0.26)',
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
          right: '-12%',
          top: 72,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(34, 197, 94, 0.3)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '8%',
          top: 400,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(83, 230, 165, 0.22)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '18%',
          bottom: -192,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: 'rgba(181, 240, 102, 0.18)',
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
