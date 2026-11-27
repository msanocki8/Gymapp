import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  calculateTargets,
  remaining,
  scaleNutrients,
  sumMacros,
  totalsByMeal,
  type DietProfileInput,
  type MealKey,
} from '@/lib/nutrition';
import {
  addEntry,
  cacheOffFood,
  loadDietProfile,
  loadEntries,
  removeEntry,
  saveDietProfile,
  type DietEntry,
} from '@/services/diet-repository';
import type { FoodItem } from '@/services/open-food-facts';

/** Wpisy i cele jednego dnia. Po dodaniu na innym ekranie wywołaj reload() (useFocusEffect). */
export function useDietDay(dateKey: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<DietProfileInput | null>(null);
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const reload = useCallback(async (reset = false) => {
    if (!userId) return;
    const id = ++request.current;
    if (reset) {
      setIsLoading(true);
      setEntries([]);
    }
    setError(null);
    try {
      const [nextProfile, nextEntries] = await Promise.all([loadDietProfile(userId), loadEntries(userId, dateKey)]);
      if (id !== request.current) return; // przełączono dzień w trakcie
      setProfile(nextProfile);
      setEntries(nextEntries);
    } catch (reason) {
      if (id === request.current) setError(reason instanceof Error ? reason.message : 'Nie udało się wczytać diety.');
    } finally {
      if (id === request.current) setIsLoading(false);
    }
  }, [userId, dateKey]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return reload(true);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const remove = useCallback(async (entryId: string) => {
    const previous = entries;
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
    try {
      await removeEntry(entryId);
    } catch (reason) {
      setEntries(previous);
      setError(reason instanceof Error ? reason.message : 'Nie udało się usunąć.');
    }
  }, [entries]);

  const summary = useMemo(() => {
    const targets = profile ? calculateTargets(profile) : null;
    const eaten = sumMacros(entries);
    return {
      targets,
      eaten,
      left: targets ? remaining(targets, eaten) : null,
      byMeal: totalsByMeal(entries),
    };
  }, [profile, entries]);

  return { userId, profile, entries, isLoading, error, reload, remove, ...summary };
}

export async function addFoodToDay(userId: string, input: { dateKey: string; meal: MealKey; food: FoodItem; grams: number }) {
  const macros = scaleNutrients(input.food, input.grams);
  const entry = await addEntry(userId, { ...input, macros });
  cacheOffFood(input.food).catch((reason: unknown) => {
    console.warn('Nie udało się zapisać produktu w cache żywności.', reason);
  });
  return entry;
}

export async function saveProfile(userId: string, profile: DietProfileInput) {
  await saveDietProfile(userId, profile);
}
