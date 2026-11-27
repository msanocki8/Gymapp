/**
 * Czyste obliczenia modułu Dieta (bez React Native) – testy w tests/nutrition.test.mjs.
 * BMR: Mifflin–St Jeor. TDEE: BMR × współczynnik aktywności. Cel: redukcja −15 %, masa +10 %.
 */

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type DietGoal = 'cut' | 'maintain' | 'bulk';
export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
export type Per100 = Macros;

export type DietProfileInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: DietGoal;
  kcalTarget?: number | null;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatTarget?: number | null;
};

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Śniadanie' },
  { key: 'lunch', label: 'Obiad' },
  { key: 'dinner', label: 'Kolacja' },
  { key: 'snack', label: 'Przekąski' },
];

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Siedzący tryb',
  light: 'Lekka (1–2 treningi)',
  moderate: 'Średnia (3–4 treningi)',
  active: 'Duża (5–6 treningów)',
  very_active: 'Bardzo duża (praca fizyczna + treningi)',
};

export const GOAL_LABELS: Record<DietGoal, string> = {
  cut: 'Redukcja',
  maintain: 'Utrzymanie',
  bulk: 'Masa',
};

const GOAL_FACTOR: Record<DietGoal, number> = { cut: 0.85, maintain: 1, bulk: 1.1 };
// Białko w g na kg masy ciała – więcej na redukcji, żeby chronić mięśnie.
const PROTEIN_PER_KG: Record<DietGoal, number> = { cut: 2.0, maintain: 1.8, bulk: 1.8 };
const FAT_SHARE = 0.25;

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function calculateBmr({ sex, age, heightCm, weightKg }: Pick<DietProfileInput, 'sex' | 'age' | 'heightCm' | 'weightKg'>) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function calculateTdee(profile: Pick<DietProfileInput, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'activity'>) {
  return Math.round(calculateBmr(profile) * ACTIVITY_FACTORS[profile.activity]);
}

/** Dzienne cele: kcal wg celu, białko g/kg, tłuszcz 25 % kcal, reszta węgle. Ręczne cele mają pierwszeństwo. */
export function calculateTargets(profile: DietProfileInput): Macros {
  const kcal = profile.kcalTarget ?? Math.round((calculateTdee(profile) * GOAL_FACTOR[profile.goal]) / 10) * 10;
  const protein = profile.proteinTarget ?? Math.round(profile.weightKg * PROTEIN_PER_KG[profile.goal]);
  const fat = profile.fatTarget ?? Math.round((kcal * FAT_SHARE) / 9);
  const carbs = profile.carbsTarget ?? Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

/** Wartości na 100 g/ml → dla podanej ilości. */
export function scaleNutrients(per100: Per100, grams: number): Macros {
  const factor = Math.max(0, grams) / 100;
  return {
    kcal: Math.round(per100.kcal * factor),
    protein: round1(per100.protein * factor),
    carbs: round1(per100.carbs * factor),
    fat: round1(per100.fat * factor),
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  const total = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    ZERO,
  );
  return { kcal: Math.round(total.kcal), protein: round1(total.protein), carbs: round1(total.carbs), fat: round1(total.fat) };
}

export function totalsByMeal<T extends Macros & { meal: MealKey }>(entries: readonly T[]): Record<MealKey, Macros> {
  const result = { breakfast: ZERO, lunch: ZERO, dinner: ZERO, snack: ZERO } as Record<MealKey, Macros>;
  for (const meal of MEALS) result[meal.key] = sumMacros(entries.filter((entry) => entry.meal === meal.key));
  return result;
}

export function remaining(targets: Macros, eaten: Macros): Macros {
  return {
    kcal: targets.kcal - eaten.kcal,
    protein: round1(targets.protein - eaten.protein),
    carbs: round1(targets.carbs - eaten.carbs),
    fat: round1(targets.fat - eaten.fat),
  };
}

/** Udział 0–1 do pasków/kółek (ponad cel = 1). */
export function progress(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, value / target));
}

/** Lokalna data „RRRR-MM-DD” (nie UTC – żeby posiłek o 23:30 był z dobrego dnia). */
export function toLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

const WEEKDAYS = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export function formatDayLabel(key: string, todayKey: string) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const base = `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
  if (key === todayKey) return `Dziś · ${base}`;
  if (key === shiftDateKey(todayKey, -1)) return `Wczoraj · ${base}`;
  if (key === shiftDateKey(todayKey, 1)) return `Jutro · ${base}`;
  return base;
}

/** „150”, „150,5”, „1,5 kg”? – akceptujemy liczbę (przecinek lub kropka), 1–5000. */
export function parseGrams(text: string): number | null {
  const value = Number(text.replace(',', '.').trim());
  if (!Number.isFinite(value) || value <= 0 || value > 5000) return null;
  return round1(value);
}

/** Podpowiedź aktywności z celu treningów w tygodniu (profil treningowy apki). */
export function activityFromWeeklyGoal(workoutsPerWeek: number): ActivityLevel {
  if (workoutsPerWeek <= 0) return 'sedentary';
  if (workoutsPerWeek <= 2) return 'light';
  if (workoutsPerWeek <= 4) return 'moderate';
  if (workoutsPerWeek <= 6) return 'active';
  return 'very_active';
}
