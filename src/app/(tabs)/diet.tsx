import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { AmbientBackground } from '@/components/ambient-background';
import { APP_BOTTOM_BAR_CONTENT_HEIGHT } from '@/components/app-bottom-bar';
import { AppleFilledIcon } from '@/components/diet/apple-icon';
import { DietSummaryCard } from '@/components/diet/diet-summary-card';
import { MealSection } from '@/components/diet/meal-section';
import { WorkoutButton } from '@/components/workout-ui';
import { useDietDay } from '@/hooks/use-diet';
import { formatDayLabel, MEALS, shiftDateKey, toLocalDateKey, ZERO, type MealKey } from '@/lib/nutrition';
import type { DietEntry } from '@/services/diet-repository';

function confirmRemove(entry: DietEntry, onConfirm: () => void) {
  const message = `Usunąć „${entry.name}” (${Math.round(entry.kcal)} kcal)?`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Usunąć produkt?', message, [
    { text: 'Zostaw', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: onConfirm },
  ]);
}

function TargetIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke="#A3E635" strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={4.5} stroke="#A3E635" strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={1.3} fill="#A3E635" />
    </Svg>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke="#A3E635" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function DietScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const todayKey = toLocalDateKey(new Date());
  const [dateKey, setDateKey] = useState(todayKey);
  const day = useDietDay(dateKey);
  const { reload } = day;

  // Po powrocie z „Dodaj produkt” / „Twój cel” – świeże dane.
  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  const openAdd = (meal: MealKey) => router.push({ pathname: '/diet-add', params: { meal, date: dateKey } });
  const openBarcode = (meal: MealKey) => router.push({ pathname: '/diet-add', params: { meal, date: dateKey, mode: 'barcode' } });
  const openPhoto = (meal: MealKey) => router.push({ pathname: '/diet-add', params: { meal, date: dateKey, mode: 'vision' } });

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AmbientBackground blurTarget={blurTarget} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: APP_BOTTOM_BAR_CONTENT_HEIGHT + insets.bottom + 12 }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <AppleFilledIcon />
            </View>
            <View style={styles.titles}>
              <Text style={styles.eyebrow}>DIETA</Text>
              <Text style={styles.title}>Twój dzień</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Twój cel i zapotrzebowanie"
              onPress={() => router.push('/diet-profile')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <TargetIcon />
            </Pressable>
          </View>

          <View style={styles.days}>
            <Pressable accessibilityLabel="Poprzedni dzień" hitSlop={10} onPress={() => setDateKey((key) => shiftDateKey(key, -1))}>
              <Chevron direction="left" />
            </Pressable>
            <Pressable onPress={() => setDateKey(todayKey)} accessibilityLabel="Wróć do dziś">
              <Text style={styles.dayLabel}>{formatDayLabel(dateKey, todayKey)}</Text>
            </Pressable>
            <Pressable accessibilityLabel="Następny dzień" hitSlop={10} onPress={() => setDateKey((key) => shiftDateKey(key, 1))}>
              <Chevron direction="right" />
            </Pressable>
          </View>

          {day.isLoading && !day.entries.length ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#A3E635" />
            </View>
          ) : day.targets ? (
            <DietSummaryCard eaten={day.eaten} targets={day.targets} />
          ) : (
            <View style={styles.setup}>
              <Text style={styles.setupTitle}>Ustal swoje zapotrzebowanie</Text>
              <Text style={styles.setupText}>
                Podaj wzrost, wagę, wiek i cel (redukcja, utrzymanie, masa) – policzymy kalorie i makro na każdy dzień.
              </Text>
              <WorkoutButton label="Ustaw cel" onPress={() => router.push('/diet-profile')} />
            </View>
          )}

          {day.error ? <Text style={styles.error}>{day.error}</Text> : null}

          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>POSIŁKI</Text>
            <Text style={styles.sectionTitle}>Co dziś zjadłeś</Text>
          </View>

          {MEALS.map((meal) => (
            <MealSection
              key={meal.key}
              meal={meal.key}
              label={meal.label}
              total={day.byMeal[meal.key] ?? ZERO}
              entries={day.entries.filter((entry) => entry.meal === meal.key)}
              onAdd={() => openAdd(meal.key)}
              onScanBarcode={() => openBarcode(meal.key)}
              onScanPhoto={() => openPhoto(meal.key)}
              onRemove={(entry) => confirmRemove(entry, () => void day.remove(entry.id))}
            />
          ))}
          {day.entries.length ? <Text style={styles.hint}>Przytrzymaj produkt, aby go usunąć.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000', flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  page: { alignSelf: 'center', gap: 12, maxWidth: 560, paddingHorizontal: 16, paddingTop: 12, width: '100%' },
  header: { alignItems: 'center', columnGap: 10, flexDirection: 'row' },
  logo: {
    alignItems: 'center',
    backgroundColor: '#0B0F0C',
    borderBottomColor: '#000000',
    borderBottomWidth: 3,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 11,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  titles: { flex: 1 },
  eyebrow: { color: '#A3E635', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#F5F7F2', fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  days: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  dayLabel: { color: '#F5F7F2', fontSize: 13.5, fontWeight: '800' },
  loading: { alignItems: 'center', height: 230, justifyContent: 'center' },
  setup: {
    backgroundColor: '#0E120F',
    borderColor: 'rgba(163,230,53,0.25)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  setupTitle: { color: '#F5F7F2', fontSize: 18, fontWeight: '900' },
  setupText: { color: '#9AA69F', fontSize: 13, lineHeight: 19 },
  error: { color: '#FCA5A5', fontSize: 13 },
  sectionHead: { marginTop: 8 },
  sectionEyebrow: { color: '#A3E635', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  sectionTitle: { color: '#F5F7F2', fontSize: 20, fontWeight: '900' },
  hint: { color: '#5F6962', fontSize: 11.5, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
