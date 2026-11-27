import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Chip, DietField, DietHeader, dietUi } from '@/components/diet/diet-ui';
import { formatKcal } from '@/components/diet/diet-summary-card';
import { ObsidianCard } from '@/components/obsidian-card';
import { WorkoutButton, WorkoutScreen } from '@/components/workout-ui';
import { useAuth } from '@/hooks/use-auth';
import { addFoodToDay } from '@/hooks/use-diet';
import { MEALS, parseGrams, round1, scaleNutrients, toLocalDateKey, type MealKey } from '@/lib/nutrition';
import { createCustomFood, findByBarcode, loadRecentEntries, searchSavedFoods } from '@/services/diet-repository';
import { fetchOffProduct, isBarcode, searchOffProducts, type FoodItem } from '@/services/open-food-facts';

const QUICK_GRAMS = [50, 100, 150, 200, 250];
const MEAL_KEYS = new Set<MealKey>(MEALS.map((meal) => meal.key));

function errorText(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.name === 'AbortError') return null;
  return reason instanceof Error ? reason.message : fallback;
}

function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke="#8A948C" strokeWidth={2} />
      <Path d="M16 16l4.5 4.5" stroke="#8A948C" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FoodRow({ food, onPress }: { food: FoodItem; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.foodRow, pressed && styles.pressed]}>
      <View style={styles.foodText}>
        <Text style={styles.foodName} numberOfLines={1}>{food.name}</Text>
        <Text style={styles.foodMeta} numberOfLines={1}>
          {[food.brand, food.source === 'custom' ? 'własny' : null].filter(Boolean).join(' · ') || 'Open Food Facts'}
          {` · B ${round1(food.protein)} · W ${round1(food.carbs)} · T ${round1(food.fat)}`}
        </Text>
      </View>
      <View style={styles.foodKcal}>
        <Text style={styles.foodKcalValue}>{food.kcal}</Text>
        <Text style={styles.foodKcalUnit}>kcal/100 g</Text>
      </View>
    </Pressable>
  );
}

export default function DietAddScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : toLocalDateKey(new Date());
  const [meal, setMeal] = useState<MealKey>(MEAL_KEYS.has(params.meal as MealKey) ? (params.meal as MealKey) : 'breakfast');

  const [mode, setMode] = useState<'search' | 'amount' | 'custom'>('search');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<FoodItem[]>([]);
  const [online, setOnline] = useState<FoodItem[]>([]);
  const [recent, setRecent] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [offRequest, setOffRequest] = useState(0);

  const [food, setFood] = useState<FoodItem | null>(null);
  const [gramsText, setGramsText] = useState('100');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [custom, setCustom] = useState({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', barcode: '' });
  const abort = useRef<AbortController | null>(null);

  // Ostatnio jedzone – wartości na 100 g odtwarzamy z zapisanego wpisu.
  useEffect(() => {
    if (!userId) return;
    loadRecentEntries(userId)
      .then((entries) =>
        setRecent(entries.map((entry) => {
          const factor = 100 / entry.grams;
          return {
            source: entry.source,
            id: entry.sourceId ?? entry.id,
            name: entry.name,
            brand: entry.brand,
            barcode: entry.source === 'off' ? entry.sourceId : null,
            imageUrl: null,
            kcal: Math.round(entry.kcal * factor),
            protein: round1(entry.protein * factor),
            carbs: round1(entry.carbs * factor),
            fat: round1(entry.fat * factor),
          };
        })))
      .catch((reason: unknown) => console.warn('Nie udało się wczytać ostatnio jedzonych produktów.', reason));
  }, [userId]);

  // Saved foods search as the user types; remote name searches run only on explicit submit.
  useEffect(() => {
    const text = query.trim();
    abort.current?.abort();
    if (!userId || text.length < 2) return;
    const controller = new AbortController();
    abort.current = controller;

    const savedTimer = setTimeout(() => {
      if (isBarcode(text)) return;
      searchSavedFoods(userId, text)
        .then((items) => !controller.signal.aborted && setSaved(items))
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setSearchError(errorText(reason, 'Nie udało się wczytać zapisanych produktów.'));
          }
        });
    }, 300);

    const shouldSearchOff = isBarcode(text) || offRequest > 0;
    const offTimer = shouldSearchOff ? setTimeout(async () => {
      setSearching(true);
      try {
        if (isBarcode(text)) {
          const found = (await findByBarcode(userId, text)) ?? (await fetchOffProduct(text, controller.signal));
          if (controller.signal.aborted) return;
          setSaved([]);
          setOnline(found ? [found] : []);
          if (!found) setSearchError('Nie ma produktu z takim kodem. Dodaj go jako własny.');
        } else if (text.length >= 3) {
          const items = await searchOffProducts(text, controller.signal);
          if (!controller.signal.aborted) setOnline(items);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setSearchError(errorText(reason, 'Wyszukiwanie nie powiodło się.'));
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, offRequest ? 0 : 900) : null;

    return () => {
      clearTimeout(savedTimer);
      if (offTimer) clearTimeout(offTimer);
      controller.abort();
    };
  }, [query, userId, offRequest]);

  const results = useMemo(() => {
    if (!userId || query.trim().length < 2) return [];
    const ids = new Set(saved.map((item) => `${item.source}:${item.id}`));
    return [...saved, ...online.filter((item) => !ids.has(`${item.source}:${item.id}`))];
  }, [userId, query, saved, online]);
  const isSearching = searching && Boolean(userId) && query.trim().length >= 2;

  const grams = parseGrams(gramsText);
  const preview = food && grams ? scaleNutrients(food, grams) : null;

  const pick = (item: FoodItem) => {
    setFood(item);
    setGramsText('100');
    setSaveError(null);
    setMode('amount');
  };

  const add = async () => {
    if (!userId || !food || !grams) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addFoodToDay(userId, { dateKey, meal, food, grams });
      router.back();
    } catch (reason) {
      setSaveError(errorText(reason, 'Nie udało się dodać produktu.'));
      setSaving(false);
    }
  };

  const customValues = {
    kcal: Number(custom.kcal.replace(',', '.')),
    protein: Number((custom.protein || '0').replace(',', '.')),
    carbs: Number((custom.carbs || '0').replace(',', '.')),
    fat: Number((custom.fat || '0').replace(',', '.')),
  };
  const customValid =
    custom.name.trim().length > 0 &&
    custom.kcal.trim() !== '' &&
    customValues.kcal >= 0 && customValues.kcal <= 1000 &&
    [customValues.protein, customValues.carbs, customValues.fat].every((value) => Number.isFinite(value) && value >= 0 && value <= 100) &&
    (custom.barcode.trim() === '' || /^[0-9]{6,14}$/.test(custom.barcode.trim()));

  const saveCustom = async () => {
    if (!userId || !customValid) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createCustomFood(userId, { name: custom.name, brand: custom.brand, barcode: custom.barcode, ...customValues });
      setSaving(false);
      pick(created);
    } catch (reason) {
      setSaveError(errorText(reason, 'Nie udało się zapisać produktu.'));
      setSaving(false);
    }
  };

  const mealLabel = MEALS.find((item) => item.key === meal)?.label ?? '';

  return (
    <WorkoutScreen>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mode === 'search' ? (
          <>
            <DietHeader eyebrow={`DODAJ DO: ${mealLabel.toUpperCase()}`} title="Znajdź produkt" />
            <View style={styles.search}>
              <SearchIcon />
              <TextInput
                autoFocus
                value={query}
                onChangeText={(text) => {
                  setSearchError(null);
                  setOffRequest(0);
                  setSearching(false);
                  if (text.trim().length < 2) {
                    setSaved([]);
                    setOnline([]);
                    setSearching(false);
                  }
                  setQuery(text);
                }}
                onSubmitEditing={() => {
                  setSearchError(null);
                  setOffRequest((value) => value + 1);
                }}
                returnKeyType="search"
                placeholder="Nazwa produktu lub kod kreskowy"
                placeholderTextColor="#5F6962"
                selectionColor="#A3E635"
                style={styles.searchInput}
              />
              {isSearching ? <ActivityIndicator color="#A3E635" size="small" /> : null}
            </View>
            <Text style={dietUi.muted}>Wyszukujemy Twoje zapisane produkty. Open Food Facts sprawdzisz przez Enter lub przycisk. Kod kreskowy wpisz cyframi (8–14).</Text>
            {query.trim().length >= 3 ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSearching}
                onPress={() => {
                  setSearchError(null);
                  setOffRequest((value) => value + 1);
                }}
                style={({ pressed }) => [styles.searchAction, pressed && styles.pressed]}>
                <Text style={styles.searchActionText}>{isSearching ? 'Szukam w Open Food Facts…' : 'Szukaj w Open Food Facts'}</Text>
              </Pressable>
            ) : null}

            {searchError ? <Text style={dietUi.error}>{searchError}</Text> : null}

            {query.trim().length >= 2 ? (
              <ObsidianCard contentStyle={styles.list}>
                {results.length ? (
                  results.map((item) => <FoodRow key={`${item.source}:${item.id}`} food={item} onPress={() => pick(item)} />)
                ) : (
                  <Text style={[dietUi.muted, styles.emptyList]}>{isSearching ? 'Szukam…' : 'Brak wyników.'}</Text>
                )}
              </ObsidianCard>
            ) : recent.length ? (
              <>
                <Text style={dietUi.sectionEyebrow}>OSTATNIO JEDZONE</Text>
                <ObsidianCard contentStyle={styles.list}>
                  {recent.map((item) => <FoodRow key={`${item.source}:${item.id}`} food={item} onPress={() => pick(item)} />)}
                </ObsidianCard>
              </>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCustom((current) => ({ ...current, name: isBarcode(query) ? '' : query.trim(), barcode: isBarcode(query) ? query.trim() : '' }));
                setSaveError(null);
                setMode('custom');
              }}
              style={({ pressed }) => [styles.customButton, pressed && styles.pressed]}>
              <Text style={styles.customButtonText}>+ Dodaj własny produkt</Text>
              <Text style={dietUi.muted}>np. domowy obiad – podajesz wartości na 100 g</Text>
            </Pressable>
          </>
        ) : null}

        {mode === 'amount' && food ? (
          <>
            <DietHeader eyebrow="ILE ZJADŁEŚ?" title={food.name} />
            <ObsidianCard contentStyle={styles.amountCard}>
              <Text style={dietUi.muted}>
                {food.brand ? `${food.brand} · ` : ''}na 100 g: {food.kcal} kcal · B {round1(food.protein)} · W {round1(food.carbs)} · T {round1(food.fat)}
              </Text>
              <DietField label="ILOŚĆ" suffix="g / ml" value={gramsText} onChangeText={setGramsText} keyboardType="decimal-pad" selectTextOnFocus />
              <View style={dietUi.chips}>
                {QUICK_GRAMS.map((value) => (
                  <Chip key={value} label={`${value} g`} active={grams === value} onPress={() => setGramsText(String(value))} />
                ))}
              </View>
              <View style={styles.previewRow}>
                <View style={styles.previewMain}>
                  <Text style={styles.previewKcal}>{preview ? formatKcal(preview.kcal) : '–'}</Text>
                  <Text style={styles.previewUnit}>kcal</Text>
                </View>
                {(['protein', 'carbs', 'fat'] as const).map((key) => (
                  <View key={key} style={styles.previewMacro}>
                    <Text style={styles.previewMacroValue}>{preview ? String(preview[key]).replace('.', ',') : '–'} g</Text>
                    <Text style={styles.previewUnit}>{key === 'protein' ? 'białko' : key === 'carbs' ? 'węgle' : 'tłuszcze'}</Text>
                  </View>
                ))}
              </View>
            </ObsidianCard>

            <Text style={dietUi.sectionEyebrow}>POSIŁEK</Text>
            <View style={dietUi.chips}>
              {MEALS.map((item) => <Chip key={item.key} label={item.label} active={meal === item.key} onPress={() => setMeal(item.key)} />)}
            </View>

            {saveError ? <Text style={dietUi.error}>{saveError}</Text> : null}
            <WorkoutButton label={saving ? 'Dodaję…' : `Dodaj do: ${mealLabel}`} onPress={add} disabled={!grams || saving || !userId} />
            <Pressable onPress={() => setMode('search')} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Wybierz inny produkt</Text>
            </Pressable>
          </>
        ) : null}

        {mode === 'custom' ? (
          <>
            <DietHeader eyebrow="WŁASNY PRODUKT" title="Nowy produkt" />
            <ObsidianCard contentStyle={styles.amountCard}>
              <DietField label="NAZWA" value={custom.name} onChangeText={(name) => setCustom((c) => ({ ...c, name }))} placeholder="np. Pierogi mamy" maxLength={120} />
              <DietField label="MARKA (opcjonalnie)" value={custom.brand} onChangeText={(brand) => setCustom((c) => ({ ...c, brand }))} maxLength={80} />
              <Text style={dietUi.sectionEyebrow}>WARTOŚCI NA 100 G</Text>
              <View style={styles.fieldRow}>
                <DietField label="KCAL" value={custom.kcal} onChangeText={(kcal) => setCustom((c) => ({ ...c, kcal }))} keyboardType="decimal-pad" />
                <DietField label="BIAŁKO" suffix="g" value={custom.protein} onChangeText={(protein) => setCustom((c) => ({ ...c, protein }))} keyboardType="decimal-pad" />
              </View>
              <View style={styles.fieldRow}>
                <DietField label="WĘGLE" suffix="g" value={custom.carbs} onChangeText={(carbs) => setCustom((c) => ({ ...c, carbs }))} keyboardType="decimal-pad" />
                <DietField label="TŁUSZCZE" suffix="g" value={custom.fat} onChangeText={(fat) => setCustom((c) => ({ ...c, fat }))} keyboardType="decimal-pad" />
              </View>
              <DietField label="KOD KRESKOWY (opcjonalnie)" value={custom.barcode} onChangeText={(barcode) => setCustom((c) => ({ ...c, barcode }))} keyboardType="number-pad" maxLength={14} />
            </ObsidianCard>
            {saveError ? <Text style={dietUi.error}>{saveError}</Text> : null}
            <WorkoutButton label={saving ? 'Zapisuję…' : 'Zapisz i dodaj'} onPress={saveCustom} disabled={!customValid || saving || !userId} />
            <Pressable onPress={() => setMode('search')} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Wróć do wyszukiwania</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </WorkoutScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, paddingBottom: 40, paddingHorizontal: 16, paddingTop: 12 },
  search: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(163,230,53,0.3)',
    borderRadius: 18,
    borderWidth: 1,
    columnGap: 10,
    flexDirection: 'row',
    height: 52,
    paddingHorizontal: 14,
  },
  searchInput: { color: '#F5F7F2', flex: 1, fontSize: 16, fontWeight: '600', height: '100%', minWidth: 0 },
  searchAction: { alignSelf: 'flex-start', paddingHorizontal: 2, paddingVertical: 6 },
  searchActionText: { color: '#D9F99D', fontSize: 12, fontWeight: '800' },
  list: { paddingHorizontal: 14, paddingVertical: 4 },
  emptyList: { paddingVertical: 14, textAlign: 'center' },
  foodRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    columnGap: 10,
    flexDirection: 'row',
    paddingVertical: 11,
  },
  foodText: { flex: 1, minWidth: 0 },
  foodName: { color: '#F5F7F2', fontSize: 14, fontWeight: '800' },
  foodMeta: { color: '#7F8983', fontSize: 11.5, marginTop: 2 },
  foodKcal: { alignItems: 'flex-end' },
  foodKcalValue: { color: '#A3E635', fontSize: 15, fontWeight: '900' },
  foodKcalUnit: { color: '#7F8983', fontSize: 9.5, fontWeight: '700' },
  customButton: {
    borderColor: 'rgba(163,230,53,0.3)',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 2,
    padding: 14,
  },
  customButtonText: { color: '#D9F99D', fontSize: 14, fontWeight: '900' },
  amountCard: { gap: 12, padding: 16 },
  fieldRow: { columnGap: 10, flexDirection: 'row' },
  previewRow: {
    alignItems: 'flex-end',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  previewMain: { alignItems: 'flex-start' },
  previewKcal: { color: '#4ADE80', fontSize: 30, fontVariant: ['tabular-nums'], fontWeight: '900' },
  previewUnit: { color: '#8A948C', fontSize: 10.5, fontWeight: '800' },
  previewMacro: { alignItems: 'center' },
  previewMacroValue: { color: '#F5F7F2', fontSize: 15, fontWeight: '800' },
  textButton: { alignItems: 'center', paddingVertical: 8 },
  textButtonLabel: { color: '#8A948C', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
