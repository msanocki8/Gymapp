/**
 * Open Food Facts – darmowa, otwarta baza produktów (dużo polskich marek).
 * Bez importów React Native, żeby mapper dało się testować w Node (tests/open-food-facts.test.mjs).
 *
 * Wyszukiwanie: search.openfoodfacts.org (nowa wyszukiwarka OFF; stara cgi/search.pl zwraca 503 bez CORS
 * → w przeglądarce „Failed to fetch”). Jej indeks rzadko ma wartości odżywcze, więc dla trafień bez kcal
 * dociągamy je z API produktu (/api/v2/product/{kod}, limit ~100/min) – najwyżej MAX_DETAILS na zapytanie.
 * Ekran szuka po 900 ms ciszy / Enter, a wyniki trzyma w pamięci.
 */

import type { Per100 } from '@/lib/nutrition';

export type FoodItem = Per100 & {
  /** 'off' = Open Food Facts (id = kod kreskowy), 'custom' = własny produkt z Supabase (id = uuid). */
  source: 'off' | 'custom';
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  imageUrl: string | null;
};

type OffNutriments = Record<string, number | string | undefined>;
export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_pl?: string;
  generic_name_pl?: string;
  /** Stare API: „Marka, Inna”; nowa wyszukiwarka: ['xx:marka', …]. */
  brands?: string | string[];
  nutriments?: OffNutriments | null;
  image_front_small_url?: string;
};

const BASE = 'https://world.openfoodfacts.org';
const SEARCH = 'https://search.openfoodfacts.org/search';
const MAX_DETAILS = 12;
const FIELDS = 'code,product_name,product_name_pl,generic_name_pl,brands,nutriments,image_front_small_url';
const TIMEOUT_MS = 9000;

export function isBarcode(text: string) {
  return /^[0-9]{8,14}$/.test(text.trim());
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function clean(value: number, max: number) {
  return Math.min(max, Math.round(value * 10) / 10);
}

/** Produkt z OFF → nasz FoodItem; null, gdy brak nazwy albo kalorii (takich nie da się policzyć). */
export function mapOffProduct(product: OffProduct): FoodItem | null {
  const code = product.code?.trim() ?? '';
  const name = (product.product_name_pl || product.product_name || product.generic_name_pl || '').trim();
  const n = product.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy-kj_100g']) ?? num(n.energy_100g) ?? -1) / 4.184;
  if (!name || !isBarcode(code) || !(kcal >= 0)) return null;

  const firstBrand = Array.isArray(product.brands) ? product.brands[0] : product.brands?.split(',')[0];
  const brand = firstBrand?.replace(/^[a-z]{2}:/, '').trim() || null;
  return {
    source: 'off',
    id: code,
    barcode: code,
    name: name.slice(0, 200),
    brand,
    imageUrl: product.image_front_small_url ?? null,
    kcal: Math.min(1000, Math.round(kcal)),
    protein: clean(num(n.proteins_100g) ?? 0, 100),
    carbs: clean(num(n.carbohydrates_100g) ?? 0, 100),
    fat: clean(num(n.fat_100g) ?? 0, 100),
  };
}

/** Bez duplikatów kodów, najpierw te z nazwą zawierającą szukaną frazę. */
export function mapOffSearch(products: readonly OffProduct[], query: string): FoodItem[] {
  const seen = new Set<string>();
  const needle = query.trim().toLowerCase();
  const items: FoodItem[] = [];
  for (const product of products) {
    const item = mapOffProduct(product);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items.sort((a, b) => Number(b.name.toLowerCase().includes(needle)) - Number(a.name.toLowerCase().includes(needle)));
}

async function getJson(url: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (response.status === 429) throw new Error('Open Food Facts: za dużo wyszukiwań naraz. Spróbuj za minutę.');
    if (!response.ok) throw new Error(`Open Food Facts nie odpowiada (${response.status}).`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

const searchCache = new Map<string, FoodItem[]>();

export async function searchOffProducts(query: string, signal?: AbortSignal): Promise<FoodItem[]> {
  const key = query.trim().toLowerCase();
  if (key.length < 3) return [];
  const cached = searchCache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({ q: key, langs: 'pl,en', page_size: '24', fields: FIELDS });
  const data = (await getJson(`${SEARCH}?${params}`, signal)) as { hits?: OffProduct[] };
  const hits = (data.hits ?? []).filter((hit) => isBarcode(hit.code ?? ''));

  // Trafienia z kaloriami bierzemy od razu, resztę uzupełniamy z API produktu (równolegle, z limitem).
  const missing = hits.filter((hit) => !mapOffProduct(hit)).slice(0, MAX_DETAILS);
  const details = await Promise.all(
    missing.map((hit) => fetchOffRaw(hit.code!, signal).catch(() => null)),
  );
  const byCode = new Map(details.filter((item): item is OffProduct => Boolean(item)).map((item) => [item.code, item]));
  const merged = hits.map((hit) => {
    const full = byCode.get(hit.code);
    return full ? { ...hit, ...full, brands: full.brands ?? hit.brands } : hit;
  });

  const items = mapOffSearch(merged, key);
  searchCache.set(key, items);
  return items;
}

async function fetchOffRaw(barcode: string, signal?: AbortSignal): Promise<OffProduct | null> {
  const data = (await getJson(`${BASE}/api/v2/product/${barcode.trim()}?fields=${FIELDS}`, signal)) as {
    status?: number;
    product?: OffProduct;
  };
  if (data.status !== 1 || !data.product) return null;
  return { ...data.product, code: data.product.code ?? barcode.trim() };
}

export async function fetchOffProduct(barcode: string, signal?: AbortSignal): Promise<FoodItem | null> {
  if (!isBarcode(barcode)) return null;
  const product = await fetchOffRaw(barcode, signal);
  return product ? mapOffProduct(product) : null;
}
