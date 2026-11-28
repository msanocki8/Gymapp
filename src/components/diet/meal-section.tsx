import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { formatKcal } from '@/components/diet/diet-summary-card';
import { ObsidianCard } from '@/components/obsidian-card';
import type { Macros, MealKey } from '@/lib/nutrition';
import type { DietEntry } from '@/services/diet-repository';

type CrossPlatformShadow = ViewStyle & { boxShadow?: string };

export const MEAL_EMOJI: Record<MealKey, string> = { breakfast: '🍳', lunch: '🍲', dinner: '🥗', snack: '🍎' };

const addGlow: CrossPlatformShadow = Platform.select<CrossPlatformShadow>({
  web: { boxShadow: '0 0 12px rgba(163, 230, 53, 0.35)' },
  default: { elevation: 5, shadowColor: '#A3E635', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8 },
}) ?? {};

function amount(value: number) {
  return String(Math.round(value * 10) / 10).replace('.', ',');
}

export function MealSection({
  meal,
  label,
  total,
  entries,
  onAdd,
  onRemove,
}: {
  meal: MealKey;
  label: string;
  total: Macros;
  entries: DietEntry[];
  onAdd: () => void;
  onRemove: (entry: DietEntry) => void;
}) {
  return (
    <ObsidianCard contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Text style={styles.emoji}>{MEAL_EMOJI[meal]}</Text>
        </View>
        <View style={styles.titles}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>
            {formatKcal(total.kcal)} kcal{entries.length ? ` · B ${Math.round(total.protein)} · W ${Math.round(total.carbs)} · T ${Math.round(total.fat)}` : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dodaj coś do: ${label}`}
            hitSlop={6}
            onPress={onAdd}
            style={({ pressed }) => [addGlow, styles.addWrap, pressed && styles.pressed]}>
            <LinearGradient colors={['#22C55E', '#A3E635']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.add}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke="#06210D" strokeWidth={3} strokeLinecap="round" />
              </Svg>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Brak produktów. Dodaj je przyciskiem +.</Text>
        </View>
      ) : (
        entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityHint="Przytrzymaj, aby usunąć"
            onLongPress={() => onRemove(entry)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={styles.itemText}>
              <Text style={styles.itemName} numberOfLines={1}>{entry.name}</Text>
              <Text style={styles.itemMeta} numberOfLines={1}>
                {amount(entry.grams)} g · B {amount(entry.protein)} · W {amount(entry.carbs)} · T {amount(entry.fat)}
              </Text>
            </View>
            <Text style={styles.itemKcal}>{formatKcal(entry.kcal)} kcal</Text>
          </Pressable>
        ))
      )}
    </ObsidianCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 12, paddingLeft: 14, paddingRight: 12, paddingTop: 12 },
  head: { alignItems: 'center', columnGap: 12, flexDirection: 'row' },
  icon: {
    alignItems: 'center',
    backgroundColor: '#0A0D0B',
    borderColor: 'rgba(163,230,53,0.28)',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  emoji: { fontSize: 20 },
  titles: { flex: 1, minWidth: 0 },
  title: { color: '#F5F7F2', fontSize: 15, fontWeight: '900' },
  subtitle: { color: '#7F8983', fontSize: 12 },
  actions: { alignItems: 'center', columnGap: 6, flexDirection: 'row' },
  addWrap: { borderRadius: 18 },
  add: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  empty: {
    marginTop: 10,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  emptyText: { color: '#68736B', fontSize: 11.5, textAlign: 'center' },
  item: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    columnGap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
  },
  itemText: { flex: 1, minWidth: 0 },
  itemName: { color: '#F5F7F2', fontSize: 13.5, fontWeight: '700' },
  itemMeta: { color: '#7F8983', fontSize: 11 },
  itemKcal: { color: '#A3E635', fontSize: 12.5, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
