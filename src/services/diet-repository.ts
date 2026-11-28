/**
 * Zapytania modułu Dieta do Supabase (RLS: każdy widzi tylko swoje wiersze; food_cache jest wspólny).
 */

import type { Database } from '@/lib/database.types';
import type { DietProfileInput, Macros, MealKey } from '@/lib/nutrition';
import { requireSupabase } from '@/lib/supabase';
import type { FoodItem } from '@/services/open-food-facts';

type Tables = Database['public']['Tables'];
type EntryRow = Tables['diet_entries']['Row'];
type CustomRow = Tables['custom_foods']['Row'];
type CacheRow = Tables['food_cache']['Row'];

export type DietEntry = Macros & {
  id: string;
  meal: MealKey;
  name: string;
  brand: string | null;
  grams: number;
  source: 'off' | 'custom';
  sourceId: string | null;
};

export type NewCustomFood = { name: string; brand?: string | null; barcode?: string | null } & Macros;

const ENTRY_FIELDS = 'id, meal, food_name, brand, grams, kcal, protein, carbs, fat, source, source_id';
const FOOD_FIELDS = 'id, name, brand, barcode, kcal_100, protein_100, carbs_100, fat_100';
const CACHE_FIELDS = 'barcode, name, brand, kcal_100, protein_100, carbs_100, fat_100, image_url';

function toEntry(row: Pick<EntryRow, 'id' | 'meal' | 'food_name' | 'brand' | 'grams' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'source' | 'source_id'>): DietEntry {
  return {
    id: row.id,
    meal: row.meal,
    name: row.food_name,
    brand: row.brand,
    grams: Number(row.grams),
    kcal: Number(row.kcal),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    source: row.source,
    sourceId: row.source_id,
  };
}

function customToFood(row: Pick<CustomRow, 'id' | 'name' | 'brand' | 'barcode' | 'kcal_100' | 'protein_100' | 'carbs_100' | 'fat_100'>): FoodItem {
  return {
    source: 'custom',
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    imageUrl: null,
    kcal: Number(row.kcal_100),
    protein: Number(row.protein_100),
    carbs: Number(row.carbs_100),
    fat: Number(row.fat_100),
  };
}

function cacheToFood(row: Pick<CacheRow, 'barcode' | 'name' | 'brand' | 'kcal_100' | 'protein_100' | 'carbs_100' | 'fat_100' | 'image_url'>): FoodItem {
  return {
    source: 'off',
    id: row.barcode,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    imageUrl: row.image_url,
    kcal: Number(row.kcal_100),
    protein: Number(row.protein_100),
    carbs: Number(row.carbs_100),
    fat: Number(row.fat_100),
  };
}

/** Do ilike – bez znaków specjalnych, które psułyby wzorzec. */
function likePattern(text: string) {
  return `%${text.trim().replace(/[%_\\,()]/g, ' ')}%`;
}

// ── Profil ────────────────────────────────────────────────────────────────

export async function loadDietProfile(userId: string): Promise<DietProfileInput | null> {
  const { data, error } = await requireSupabase().from('diet_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    sex: data.sex,
    age: data.age,
    heightCm: Number(data.height_cm),
    weightKg: Number(data.weight_kg),
    activity: data.activity,
    goal: data.goal,
    kcalTarget: data.kcal_target,
    proteinTarget: data.protein_target,
    carbsTarget: data.carbs_target,
    fatTarget: data.fat_target,
  };
}

export async function saveDietProfile(userId: string, profile: DietProfileInput) {
  const { error } = await requireSupabase().from('diet_profiles').upsert({
    user_id: userId,
    sex: profile.sex,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    activity: profile.activity,
    goal: profile.goal,
    kcal_target: profile.kcalTarget ?? null,
    protein_target: profile.proteinTarget ?? null,
    carbs_target: profile.carbsTarget ?? null,
    fat_target: profile.fatTarget ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── Wpisy dnia ────────────────────────────────────────────────────────────

export async function loadEntries(userId: string, dateKey: string): Promise<DietEntry[]> {
  const { data, error } = await requireSupabase()
    .from('diet_entries')
    .select(ENTRY_FIELDS)
    .eq('user_id', userId)
    .eq('eaten_on', dateKey)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toEntry);
}

export async function addEntry(
  userId: string,
  input: { dateKey: string; meal: MealKey; food: FoodItem; grams: number; macros: Macros },
): Promise<DietEntry> {
  const { data, error } = await requireSupabase()
    .from('diet_entries')
    .insert({
      user_id: userId,
      eaten_on: input.dateKey,
      meal: input.meal,
      food_name: input.food.name,
      brand: input.food.brand,
      source: input.food.source,
      source_id: input.food.id,
      grams: input.grams,
      kcal: input.macros.kcal,
      protein: input.macros.protein,
      carbs: input.macros.carbs,
      fat: input.macros.fat,
    })
    .select(ENTRY_FIELDS)
    .single();
  if (error) throw error;
  return toEntry(data);
}

export async function addMealEntries(
  userId: string,
  input: { dateKey: string; meal: MealKey; entries: { name: string; grams: number; macros: Macros }[] },
): Promise<DietEntry[]> {
  if (!input.entries.length) throw new Error('Nie ma składników do zapisania.');

  const { data, error } = await requireSupabase()
    .from('diet_entries')
    .insert(input.entries.map((entry) => ({
      user_id: userId,
      eaten_on: input.dateKey,
      meal: input.meal,
      food_name: entry.name,
      brand: null,
      source: 'custom' as const,
      source_id: null,
      grams: entry.grams,
      kcal: entry.macros.kcal,
      protein: entry.macros.protein,
      carbs: entry.macros.carbs,
      fat: entry.macros.fat,
    })))
    .select(ENTRY_FIELDS);
  if (error) throw error;
  return (data ?? []).map(toEntry);
}

export async function removeEntry(entryId: string) {
  const { error } = await requireSupabase().from('diet_entries').delete().eq('id', entryId);
  if (error) throw error;
}

/** Ostatnio jedzone produkty (do szybkiego dodania) – unikalne po nazwie. */
export async function loadRecentEntries(userId: string, limit = 8): Promise<DietEntry[]> {
  const { data, error } = await requireSupabase()
    .from('diet_entries')
    .select(ENTRY_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  const seen = new Set<string>();
  const result: DietEntry[] = [];
  for (const row of data ?? []) {
    const key = `${row.source}:${row.source_id ?? row.food_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(toEntry(row));
    if (result.length >= limit) break;
  }
  return result;
}

// ── Produkty: własne + cache OFF ──────────────────────────────────────────

export async function searchSavedFoods(userId: string, query: string): Promise<FoodItem[]> {
  const client = requireSupabase();
  const pattern = likePattern(query);
  const [custom, cache] = await Promise.all([
    client.from('custom_foods').select(FOOD_FIELDS).eq('user_id', userId).ilike('name', pattern).limit(15),
    client.from('food_cache').select(CACHE_FIELDS).ilike('name', pattern).limit(15),
  ]);
  if (custom.error) throw custom.error;
  if (cache.error) throw cache.error;
  return [...(custom.data ?? []).map(customToFood), ...(cache.data ?? []).map(cacheToFood)];
}

export async function findByBarcode(userId: string, barcode: string): Promise<FoodItem | null> {
  const client = requireSupabase();
  const own = await client.from('custom_foods').select(FOOD_FIELDS).eq('user_id', userId).eq('barcode', barcode).limit(1).maybeSingle();
  if (own.error) throw own.error;
  if (own.data) return customToFood(own.data);
  const cached = await client.from('food_cache').select(CACHE_FIELDS).eq('barcode', barcode).maybeSingle();
  if (cached.error) throw cached.error;
  return cached.data ? cacheToFood(cached.data) : null;
}

/** Produkt z OFF zapamiętujemy we wspólnym cache – następnym razem bez zapytania do OFF. Błąd cache nie blokuje dodania. */
export async function cacheOffFood(food: FoodItem) {
  if (food.source !== 'off' || !food.barcode) return;
  const { error } = await requireSupabase().from('food_cache').upsert({
    barcode: food.barcode,
    name: food.name,
    brand: food.brand,
    kcal_100: food.kcal,
    protein_100: food.protein,
    carbs_100: food.carbs,
    fat_100: food.fat,
    image_url: food.imageUrl,
    fetched_at: new Date().toISOString(),
  });
  if (error) console.warn('Nie udało się zapisać produktu w cache żywności.', error);
}

export async function createCustomFood(userId: string, food: NewCustomFood): Promise<FoodItem> {
  const { data, error } = await requireSupabase()
    .from('custom_foods')
    .insert({
      user_id: userId,
      name: food.name.trim(),
      brand: food.brand?.trim() || null,
      barcode: food.barcode?.trim() || null,
      kcal_100: food.kcal,
      protein_100: food.protein,
      carbs_100: food.carbs,
      fat_100: food.fat,
    })
    .select(FOOD_FIELDS)
    .single();
  if (error) throw error;
  return customToFood(data);
}
