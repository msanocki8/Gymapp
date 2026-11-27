import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Nagłówek ekranów modułu Dieta: ‹ wstecz + eyebrow + tytuł. */
export function DietHeader({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Wróć"
        hitSlop={8}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/diet'))}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M15 5l-7 7 7 7" stroke="#A3E635" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View style={styles.titles}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function DietField({ label, suffix, ...props }: TextInputProps & { label: string; suffix?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput placeholderTextColor="#5F6962" selectionColor="#A3E635" style={styles.input} {...props} />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export const dietUi = StyleSheet.create({
  sectionEyebrow: { color: '#A3E635', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  muted: { color: '#8A948C', fontSize: 12.5, lineHeight: 18 },
  error: { color: '#FCA5A5', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const styles = StyleSheet.create({
  header: { alignItems: 'center', columnGap: 12, flexDirection: 'row', marginBottom: 4 },
  back: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  titles: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#A3E635', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#F5F7F2', fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  field: { flex: 1, gap: 6, minWidth: 0 },
  fieldLabel: { color: '#9AA69F', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(163,230,53,0.22)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 14,
  },
  input: { color: '#F5F7F2', flex: 1, fontSize: 16, fontWeight: '700', height: '100%', minWidth: 0 },
  suffix: { color: '#7F8983', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: 'rgba(163,230,53,0.14)', borderColor: '#A3E635' },
  chipText: { color: '#C9D1CB', fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: '#D9F99D' },
  pressed: { opacity: 0.75 },
});
