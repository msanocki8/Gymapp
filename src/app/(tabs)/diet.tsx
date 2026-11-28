import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type AddAction = 'search' | 'barcode' | 'vision' | 'vision-detailed';

const ADD_OPTIONS: { mode: AddAction; title: string; detail: string; icon: 'manual' | 'barcode' | 'camera' | 'ai' }[] = [
  { mode: 'search', title: 'Dodaj swój produkt', detail: 'Wyszukaj produkt lub wpisz własne wartości.', icon: 'manual' },
  { mode: 'barcode', title: 'Zeskanuj kod QR', detail: 'Odczytaj kod QR lub kreskowy produktu.', icon: 'barcode' },
  { mode: 'vision', title: 'Zrób zdjęcie', detail: 'Rozpoznaj składniki i oszacuj wartości odżywcze.', icon: 'camera' },
  { mode: 'vision-detailed', title: 'Dokładny pomiar z agentem AI', detail: 'Dodaj zdjęcie i opisz danie dokładniej.', icon: 'ai' },
];

function AddOptionIcon({ icon }: { icon: (typeof ADD_OPTIONS)[number]['icon'] }) {
  const stroke = '#A3E635';
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      {icon === 'manual' ? (
        <Path d="M12 5v14M5 12h14" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      ) : null}
      {icon === 'barcode' ? (
        <Path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14" stroke={stroke} strokeWidth={1.6} />
      ) : null}
      {icon === 'camera' ? (
        <>
          <Path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4v-10Z" stroke={stroke} strokeWidth={1.7} strokeLinejoin="round" />
          <Circle cx={12} cy={13} r={3} stroke={stroke} strokeWidth={1.7} />
        </>
      ) : null}
      {icon === 'ai' ? (
        <>
          <Path d="M12 3 13.7 9.3 20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
          <Path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" fill={stroke} />
        </>
      ) : null}
    </Svg>
  );
}

export default function DietScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const todayKey = toLocalDateKey(new Date());
  const [dateKey, setDateKey] = useState(todayKey);
  const [menuMeal, setMenuMeal] = useState<MealKey | null>(null);
  const day = useDietDay(dateKey);
  const { reload } = day;

  // Po powrocie z „Dodaj produkt” / „Twój cel” – świeże dane.
  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  const openAddAction = (mode: AddAction) => {
    if (!menuMeal) return;
    const meal = menuMeal;
    setMenuMeal(null);
    router.push({ pathname: '/diet-add', params: { meal, date: dateKey, mode } });
  };
  const menuMealLabel = MEALS.find((meal) => meal.key === menuMeal)?.label ?? '';

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
              onAdd={() => setMenuMeal(meal.key)}
              onRemove={(entry) => confirmRemove(entry, () => void day.remove(entry.id))}
            />
          ))}
          {day.entries.length ? <Text style={styles.hint}>Przytrzymaj produkt, aby go usunąć.</Text> : null}
        </View>
      </ScrollView>
      <Modal
        visible={menuMeal !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setMenuMeal(null)}>
        <View style={styles.sheetOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zamknij menu dodawania"
            onPress={() => setMenuMeal(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.addSheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Dodaj do: {menuMealLabel}</Text>
            <Text style={styles.sheetSubtitle}>Wybierz sposób dodania posiłku</Text>
            <View style={styles.optionList}>
              {ADD_OPTIONS.map((option) => (
                <Pressable
                  key={option.mode}
                  accessibilityRole="button"
                  onPress={() => openAddAction(option.mode)}
                  style={({ pressed }) => [styles.addOption, pressed && styles.pressed]}>
                  <View style={styles.optionIcon}>
                    <AddOptionIcon icon={option.icon} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDetail}>{option.detail}</Text>
                  </View>
                  <Chevron direction="right" />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  sheetOverlay: {
    backgroundColor: 'rgba(0,0,0,0.68)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  addSheet: {
    alignSelf: 'center',
    backgroundColor: '#0E1310',
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxWidth: 560,
    paddingHorizontal: 18,
    paddingTop: 12,
    width: '100%',
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 38,
  },
  sheetTitle: { color: '#F5F7F2', fontSize: 18, fontWeight: '900' },
  sheetSubtitle: { color: '#7F8983', fontSize: 12, marginTop: 4 },
  optionList: { gap: 8, marginTop: 18 },
  addOption: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 17,
    borderWidth: 1,
    columnGap: 12,
    flexDirection: 'row',
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(163,230,53,0.08)',
    borderColor: 'rgba(163,230,53,0.17)',
    borderRadius: 13,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  optionText: { flex: 1, gap: 3, minWidth: 0 },
  optionTitle: { color: '#F5F7F2', fontSize: 13.5, fontWeight: '800' },
  optionDetail: { color: '#849087', fontSize: 10.5, lineHeight: 15 },
  pressed: { opacity: 0.75 },
});
