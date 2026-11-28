import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Chip, DietField, DietHeader, dietUi } from '@/components/diet/diet-ui';
import { formatKcal } from '@/components/diet/diet-summary-card';
import { ObsidianCard } from '@/components/obsidian-card';
import { WorkoutButton, WorkoutScreen } from '@/components/workout-ui';
import { useAuth } from '@/hooks/use-auth';
import { addFoodToDay } from '@/hooks/use-diet';
import { MEALS, parseGrams, round1, scaleNutrients, toLocalDateKey, type Macros, type MealKey } from '@/lib/nutrition';
import { addMealEntries, createCustomFood, findByBarcode, loadRecentEntries, searchSavedFoods } from '@/services/diet-repository';
import { analyzeMealPhoto, compressMealPhoto } from '@/services/diet-vision';
import { fetchOffProduct, isBarcode, mapOffProduct, searchOffProducts, type FoodItem, type OffProduct } from '@/services/open-food-facts';

const QUICK_GRAMS = [50, 100, 150, 200, 250];
const MEAL_KEYS = new Set<MealKey>(MEALS.map((meal) => meal.key));

function errorText(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.name === 'AbortError') return null;
  return reason instanceof Error ? reason.message : fallback;
}

type AddMode = 'search' | 'amount' | 'custom' | 'barcode' | 'vision' | 'vision-detailed' | 'vision-results';
type VisionDraft = { item: { name: string; estimated_grams: number; calories: number; protein: number; carbs: number; fat: number }; grams: string };

async function fetchScannedFood(barcode: string): Promise<FoodItem | null> {
  const apiUrl = process.env.EXPO_PUBLIC_OPEN_FOOD_FACTS_API_URL?.trim()
    || (Platform.OS === 'web' ? '/api/open-food-facts' : 'https://gymapp-one-lemon.vercel.app/api/open-food-facts');
  const response = await fetch(`${apiUrl}?barcode=${encodeURIComponent(barcode)}`, {
    headers: { Accept: 'application/json' },
  });
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
      ? result.error
      : 'Nie udało się pobrać produktu z Open Food Facts.';
    throw new Error(message);
  }
  if (
    typeof result !== 'object'
    || result === null
    || !('status' in result)
    || result.status !== 1
    || !('product' in result)
    || typeof result.product !== 'object'
    || result.product === null
    || Array.isArray(result.product)
  ) {
    return null;
  }
  const product = result.product as OffProduct;
  return mapOffProduct({ ...product, code: product.code ?? barcode });
}

function getScannedBarcode(value: string) {
  const text = value.trim();
  if (isBarcode(text)) return text;
  return text.match(/(?:^|\/)(\d{8,14})(?:\.json)?(?:\/|[?#]|$)/)?.[1] ?? null;
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
  const { user, session } = useAuth();
  const userId = user?.id ?? null;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const params = useLocalSearchParams<{ meal?: string; date?: string; mode?: string }>();
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : toLocalDateKey(new Date());
  const [meal, setMeal] = useState<MealKey>(MEAL_KEYS.has(params.meal as MealKey) ? (params.meal as MealKey) : 'breakfast');

  const [mode, setMode] = useState<AddMode>(() => {
    if (params.mode === 'barcode') return 'barcode';
    if (params.mode === 'vision') return 'vision';
    if (params.mode === 'vision-detailed') return 'vision-detailed';
    return 'search';
  });
  const isDetailedVision = params.mode === 'vision-detailed';
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
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [visionDrafts, setVisionDrafts] = useState<VisionDraft[]>([]);
  const [visionPhoto, setVisionPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [visionDescription, setVisionDescription] = useState('');
  const abort = useRef<AbortController | null>(null);
  const barcodeLock = useRef(false);

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

  const handleBarcode = async (value: string) => {
    const barcode = getScannedBarcode(value);
    if (barcodeLock.current || !barcode) {
      if (!barcode) setScanError('Zeskanowany kod nie zawiera kodu produktu Open Food Facts.');
      return;
    }

    barcodeLock.current = true;
    setScanBusy(true);
    setScanError(null);
    try {
      const found = await fetchScannedFood(barcode);
      if (!found) throw new Error('Nie znaleziono produktu z tym kodem w Open Food Facts.');
      pick(found);
    } catch (reason) {
      setScanError(errorText(reason, 'Nie udało się odczytać produktu.'));
    } finally {
      setScanBusy(false);
    }
  };

  const chooseMealPhoto = async (source: 'camera' | 'library') => {
    setVisionError(null);
    try {
      if (source === 'camera' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setVisionError('Zezwól na dostęp do aparatu, aby zrobić zdjęcie posiłku.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled || !result.assets[0]) return;

      setAnalyzingPhoto(true);
      const { uri } = result.assets[0];
      const base64 = await compressMealPhoto(uri);
      setVisionPhoto({ uri, base64 });
      if (!isDetailedVision) {
        const items = await analyzeMealPhoto(base64, session?.access_token ?? null);
        setVisionDrafts(items.map((item) => ({ item, grams: String(item.estimated_grams) })));
        setSaveError(null);
        setMode('vision-results');
      }
    } catch (reason) {
      setVisionError(errorText(reason, 'Nie udało się przygotować zdjęcia do analizy.'));
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const recalculateVision = async () => {
    if (!visionPhoto || analyzingPhoto) return;
    setAnalyzingPhoto(true);
    setVisionError(null);
    try {
      const items = await analyzeMealPhoto(
        visionPhoto.base64,
        session?.access_token ?? null,
        isDetailedVision ? visionDescription : undefined,
      );
      setVisionDrafts(items.map((item) => ({ item, grams: String(item.estimated_grams) })));
      setSaveError(null);
      setMode('vision-results');
    } catch (reason) {
      setVisionError(errorText(reason, 'Nie udało się przygotować zdjęcia do analizy.'));
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const validVisionDrafts = visionDrafts.every((draft) => parseGrams(draft.grams) !== null);
  const saveVisionEntries = async () => {
    if (!userId || !visionDrafts.length || !validVisionDrafts || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const entries = visionDrafts.map(({ item, grams: gramsTextValue }) => {
        const grams = parseGrams(gramsTextValue)!;
        const per100 = {
          kcal: item.calories * 100 / item.estimated_grams,
          protein: item.protein * 100 / item.estimated_grams,
          carbs: item.carbs * 100 / item.estimated_grams,
          fat: item.fat * 100 / item.estimated_grams,
        };
        const macros: Macros = scaleNutrients(per100, grams);
        return { name: item.name, grams, macros };
      });
      await addMealEntries(userId, { dateKey, meal, entries });
      router.back();
    } catch (reason) {
      setSaveError(errorText(reason, 'Nie udało się dodać składników do posiłku.'));
      setSaving(false);
    }
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
            <Text style={dietUi.muted}>Dane produktów: Open Food Facts (ODbL)</Text>
          </>
        ) : null}

        {mode === 'barcode' ? (
          <>
            <DietHeader eyebrow={`DODAJ DO: ${mealLabel.toUpperCase()}`} title="Skanuj kod produktu" />
            {cameraPermission?.granted ? (
              <View style={styles.cameraFrame}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
                  onBarcodeScanned={scanBusy ? undefined : (result) => { void handleBarcode(result.data); }}
                  onMountError={(event) => setScanError(event.message)}
                />
                <View pointerEvents="none" style={styles.scanGuide} />
              </View>
            ) : cameraPermission ? (
              <ObsidianCard contentStyle={styles.amountCard}>
                <Text style={dietUi.muted}>Zezwól na dostęp do aparatu, aby skanować kody kreskowe.</Text>
                <WorkoutButton label="Włącz aparat" onPress={() => { void requestCameraPermission(); }} />
              </ObsidianCard>
            ) : (
              <View style={styles.loading}>
                <ActivityIndicator color="#A3E635" />
              </View>
            )}
            <Text style={dietUi.muted}>Ustaw kod QR lub kreskowy produktu w ramce. Możesz też wpisać kod ręcznie.</Text>
            <View style={styles.search}>
              <TextInput
                value={manualBarcode}
                onChangeText={(text) => setManualBarcode(text.replace(/\D/g, '').slice(0, 14))}
                placeholder="Kod kreskowy (8–14 cyfr)"
                placeholderTextColor="#5F6962"
                keyboardType="number-pad"
                maxLength={14}
                style={styles.searchInput}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!isBarcode(manualBarcode) || scanBusy}
                onPress={() => {
                  barcodeLock.current = false;
                  void handleBarcode(manualBarcode);
                }}
                style={({ pressed }) => [styles.searchAction, pressed && styles.pressed]}>
                {scanBusy ? <ActivityIndicator color="#A3E635" size="small" /> : <Text style={styles.searchActionText}>Szukaj</Text>}
              </Pressable>
            </View>
            {scanError ? (
              <>
                <Text style={dietUi.error}>{scanError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    barcodeLock.current = false;
                    setScanError(null);
                  }}
                  style={styles.textButton}>
                  <Text style={styles.textButtonLabel}>Skanuj ponownie</Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : null}

        {mode === 'vision' ? (
          <>
            <DietHeader eyebrow={`DODAJ DO: ${mealLabel.toUpperCase()}`} title="Zdjęcie posiłku" />
            <ObsidianCard contentStyle={styles.amountCard}>
              <Text style={dietUi.muted}>
                AI oszacuje składniki i wartości odżywcze. Zdjęcie jest analizowane jednorazowo i nie trafia do bazy ani Storage.
              </Text>
              <WorkoutButton
                label={analyzingPhoto ? 'Analizuję zdjęcie…' : 'Zrób zdjęcie'}
                onPress={() => { void chooseMealPhoto('camera'); }}
                disabled={analyzingPhoto}
              />
              <WorkoutButton
                label="Wybierz z galerii"
                onPress={() => { void chooseMealPhoto('library'); }}
                disabled={analyzingPhoto}
              />
              {analyzingPhoto ? <ActivityIndicator color="#A3E635" /> : null}
            </ObsidianCard>
            {visionError ? <Text style={dietUi.error}>{visionError}</Text> : null}
          </>
        ) : null}

        {mode === 'vision-detailed' ? (
          <>
            <DietHeader eyebrow={`DODAJ DO: ${mealLabel.toUpperCase()}`} title="Dokładny pomiar AI" />
            <ObsidianCard contentStyle={styles.amountCard}>
              <Text style={dietUi.muted}>
                Dodaj zdjęcie i opisz danie lub markę. AI uwzględni opis; wartości nadal są szacunkiem, który możesz poprawić przed zapisem.
              </Text>
              {visionPhoto ? (
                <Image
                  accessibilityLabel="Zdjęcie wybranego posiłku"
                  source={{ uri: visionPhoto.uri }}
                  style={styles.visionPhoto}
                />
              ) : null}
              <WorkoutButton
                label={analyzingPhoto ? 'Przygotowuję zdjęcie…' : visionPhoto ? 'Zrób inne zdjęcie' : 'Zrób zdjęcie'}
                onPress={() => { void chooseMealPhoto('camera'); }}
                disabled={analyzingPhoto}
              />
              <WorkoutButton
                label="Wybierz z galerii"
                onPress={() => { void chooseMealPhoto('library'); }}
                disabled={analyzingPhoto}
              />
              <TextInput
                accessibilityLabel="Opis dania dla agenta AI"
                value={visionDescription}
                onChangeText={setVisionDescription}
                placeholder="np. Burger Drwala z McDonald's"
                placeholderTextColor="#68736B"
                selectionColor="#A3E635"
                maxLength={300}
                multiline
                textAlignVertical="top"
                style={styles.visionDescription}
              />
              <WorkoutButton
                label={analyzingPhoto ? 'Przeliczam…' : 'Przelicz ponownie'}
                onPress={() => { void recalculateVision(); }}
                disabled={!visionPhoto || analyzingPhoto}
              />
              {visionError ? <Text style={dietUi.error}>{visionError}</Text> : null}
            </ObsidianCard>
          </>
        ) : null}

        {mode === 'vision-results' ? (
          <>
            <DietHeader
              eyebrow={`DODAJ DO: ${mealLabel.toUpperCase()}`}
              title={isDetailedVision ? 'Pomiar z agentem AI' : 'Wykryte składniki'}
            />
            {isDetailedVision ? (
              <ObsidianCard contentStyle={styles.amountCard}>
                <Text style={dietUi.muted}>
                  Możesz poprawić opis i przeliczyć składniki ponownie. AI podaje szacunki; sprawdź je przed dodaniem.
                </Text>
                {visionPhoto ? (
                  <Image
                    accessibilityLabel="Zdjęcie analizowanego posiłku"
                    source={{ uri: visionPhoto.uri }}
                    style={styles.visionPhoto}
                  />
                ) : null}
                <TextInput
                  accessibilityLabel="Doprecyzuj danie dla agenta AI"
                  value={visionDescription}
                  onChangeText={setVisionDescription}
                  placeholder="np. Burger Drwala z McDonald's"
                  placeholderTextColor="#68736B"
                  selectionColor="#A3E635"
                  maxLength={300}
                  multiline
                  textAlignVertical="top"
                  style={styles.visionDescription}
                />
                <WorkoutButton
                  label={analyzingPhoto ? 'Przeliczam…' : 'Przelicz ponownie'}
                  onPress={() => { void recalculateVision(); }}
                  disabled={!visionPhoto || analyzingPhoto}
                />
                {visionError ? <Text style={dietUi.error}>{visionError}</Text> : null}
              </ObsidianCard>
            ) : null}
            {visionDrafts.length ? (
              <>
                <Text style={dietUi.muted}>Sprawdź gramaturę każdego składnika przed zapisaniem.</Text>
                {visionDrafts.map(({ item, grams }, index) => {
                  const amountValue = parseGrams(grams);
                  const factor = amountValue ? amountValue / item.estimated_grams : 0;
                  return (
                    <ObsidianCard key={`${item.name}-${index}`} contentStyle={styles.amountCard}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      <DietField
                        label="GRAMATURA"
                        suffix="g"
                        value={grams}
                        onChangeText={(value) => setVisionDrafts((current) => current.map((draft, draftIndex) => (
                          draftIndex === index ? { ...draft, grams: value } : draft
                        )))}
                        keyboardType="decimal-pad"
                      />
                      <Text style={dietUi.muted}>
                        {amountValue ? `${Math.round(item.calories * factor)} kcal · B ${round1(item.protein * factor)} · W ${round1(item.carbs * factor)} · T ${round1(item.fat * factor)}` : 'Podaj poprawną gramaturę.'}
                      </Text>
                    </ObsidianCard>
                  );
                })}
                {saveError ? <Text style={dietUi.error}>{saveError}</Text> : null}
                <WorkoutButton
                  label={saving ? 'Dodaję składniki…' : `Dodaj do: ${mealLabel}`}
                  onPress={() => { void saveVisionEntries(); }}
                  disabled={!validVisionDrafts || saving || !userId}
                />
              </>
            ) : (
              <ObsidianCard contentStyle={styles.amountCard}>
                <Text style={dietUi.muted}>Nie udało się rozpoznać składników na zdjęciu.</Text>
                <WorkoutButton label="Wybierz inne zdjęcie" onPress={() => setMode(isDetailedVision ? 'vision-detailed' : 'vision')} />
              </ObsidianCard>
            )}
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
  loading: { alignItems: 'center', height: 220, justifyContent: 'center' },
  cameraFrame: {
    backgroundColor: '#0A0D0B',
    borderColor: 'rgba(163,230,53,0.3)',
    borderRadius: 22,
    borderWidth: 1,
    height: 300,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  camera: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  scanGuide: {
    alignSelf: 'center',
    borderColor: 'rgba(217,249,157,0.9)',
    borderRadius: 16,
    borderWidth: 2,
    height: 112,
    marginTop: 94,
    width: '82%',
  },
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
  visionPhoto: { alignSelf: 'center', borderRadius: 16, height: 190, width: '100%' },
  visionDescription: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(163,230,53,0.25)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#F5F7F2',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    padding: 12,
    width: '100%',
  },
  pressed: { opacity: 0.75 },
});
