export type DietVisionItem = {
  name: string;
  estimated_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validNumber(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

export function parseDietVisionItems(value: unknown): DietVisionItem[] | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > 20) return null;

  const items: DietVisionItem[] = [];
  for (const item of value.items) {
    if (
      !isRecord(item)
      || typeof item.name !== 'string'
      || !item.name.trim()
      || item.name.trim().length > 200
      || !validNumber(item.estimated_grams, 5000)
      || item.estimated_grams < 1
      || !validNumber(item.calories, 20000)
      || !validNumber(item.protein, 1000)
      || !validNumber(item.carbs, 1000)
      || !validNumber(item.fat, 1000)
      || item.calories / item.estimated_grams > 1000
      || item.protein / item.estimated_grams > 100
      || item.carbs / item.estimated_grams > 100
      || item.fat / item.estimated_grams > 100
    ) {
      return null;
    }

    items.push({
      name: item.name.trim(),
      estimated_grams: Math.round(item.estimated_grams * 10) / 10,
      calories: Math.round(item.calories),
      protein: Math.round(item.protein * 10) / 10,
      carbs: Math.round(item.carbs * 10) / 10,
      fat: Math.round(item.fat * 10) / 10,
    });
  }
  return items;
}
