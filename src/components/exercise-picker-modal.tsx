import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Exercise, exerciseCategories, exerciseLibrary } from '@/constants/exercise-library';
import { workoutColors } from '@/components/workout-ui';

type FilterMode = 'Sprzęt' | 'Mięśnie';

type ExercisePickerModalProps = {
  selectedExerciseIds: string[];
  recentExerciseIds: string[];
  customExercises: Exercise[];
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  onAddCustomExercise: (exercise: Exercise) => void;
  onShowDetails: (exercise: Exercise) => void;
};

const equipmentFilters = ['Sztanga', 'Hantle', 'Wyciąg', 'Maszyna', 'Masa ciała'];

function matchesEquipment(exercise: Exercise, equipment: string) {
  const value = exercise.equipment.toLocaleLowerCase('pl-PL');
  if (equipment === 'Masa ciała') return value.includes('masa ciała') || value.includes('drążek') || value.includes('poręcze');
  if (equipment === 'Wyciąg') return value.includes('wyciąg');
  if (equipment === 'Maszyna') return value.includes('maszyna') || value.includes('suwnica');
  return value.includes(equipment.toLocaleLowerCase('pl-PL'));
}

export function ExercisePickerModal({
  selectedExerciseIds,
  recentExerciseIds,
  customExercises,
  onClose,
  onSelect,
  onAddCustomExercise,
  onShowDetails,
}: ExercisePickerModalProps) {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('Mięśnie');
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  const visibleExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL');
    return [...customExercises, ...exerciseLibrary].filter((exercise) => {
      const matchesQuery = !normalizedQuery || [
        exercise.name,
        exercise.category,
        exercise.equipment,
        ...(exercise.primaryMuscles ?? []),
      ].some((value) => value.toLocaleLowerCase('pl-PL').includes(normalizedQuery));
      const matchesFilter = !filterValue || (
        filterMode === 'Mięśnie'
          ? exercise.category === filterValue
          : matchesEquipment(exercise, filterValue)
      );
      return matchesQuery && matchesFilter;
    });
  }, [customExercises, filterMode, filterValue, query]);

  const recentExercises = useMemo(
    () => recentExerciseIds
      .map((id) => visibleExercises.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is Exercise => Boolean(exercise))
      .slice(0, 5),
    [recentExerciseIds, visibleExercises],
  );
  const customVisible = visibleExercises.filter((exercise) => exercise.id.startsWith('custom-'));
  const standardVisible = visibleExercises.filter((exercise) => !exercise.id.startsWith('custom-'));

  function addCustomExercise() {
    const trimmedName = customName.trim();
    if (!trimmedName) return;
    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      category: 'Klatka',
      equipment: 'Własne ćwiczenie',
      level: 'Własne',
      image: '',
      description: `Własne ćwiczenie: ${trimmedName}.`,
      steps: ['Ustaw stabilną pozycję i przygotuj sprzęt.', 'Wykonuj ruch w kontrolowanym zakresie.', 'Wróć spokojnie do pozycji początkowej.'],
      primaryMuscles: ['Do uzupełnienia'],
      secondaryMuscles: [],
    };
    onAddCustomExercise(exercise);
    setCustomName('');
    setQuery('');
    setFilterValue(null);
  }

  function selectExercise(exercise: Exercise) {
    if (selectedExerciseIds.includes(exercise.id)) return;
    onSelect(exercise);
  }

  const filterOptions: string[] = filterMode === 'Mięśnie'
    ? exerciseCategories
    : equipmentFilters;

  return (
    <View className="flex-1 bg-zinc-950" style={styles.screen}>
        <View className="flex-row items-center justify-between border-b border-zinc-800/80 px-5 pb-4 pt-2" style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Wróć do planu" onPress={onClose} className="active:opacity-70" style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View className="min-w-0 flex-1 px-3">
            <Text style={styles.headerKicker}>BIBLIOTEKA ĆWICZEŃ</Text>
            <Text style={styles.headerTitle}>Dodaj ćwiczenie</Text>
          </View>
          <View className="rounded-full bg-lime-400/10 px-3 py-2">
            <Text style={styles.countText}>{selectedExerciseIds.length} DODANE</Text>
          </View>
        </View>

        <ScrollView
          className="min-w-0 flex-1"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4" style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              accessibilityLabel="Szukaj ćwiczeń"
              value={query}
              onChangeText={setQuery}
              placeholder="Szukaj ćwiczenia lub mięśnia"
              placeholderTextColor="#778176"
              selectionColor={workoutColors.neon}
              returnKeyType="search"
              className="min-w-0 flex-1 text-zinc-100"
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel="Wyczyść wyszukiwanie" onPress={() => setQuery('')} style={styles.clearSearch}>
                <Text style={styles.clearSearchText}>×</Text>
              </Pressable>
            )}
          </View>

          <View className="mt-5 flex-row rounded-2xl border border-zinc-800 bg-zinc-900 p-1" style={styles.filterTabs}>
            {(['Mięśnie', 'Sprzęt'] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: filterMode === mode }}
                onPress={() => {
                  setFilterMode(mode);
                  setFilterValue(null);
                }}
                className={`flex-1 items-center rounded-xl py-3 ${filterMode === mode ? 'bg-zinc-800' : ''}`}>
                <Text style={[styles.filterTabText, filterMode === mode && styles.filterTabTextActive]}>{mode}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: filterValue === null }}
              onPress={() => setFilterValue(null)}
              className={`mr-2 rounded-full border px-4 py-2.5 ${filterValue === null ? 'border-lime-400/50 bg-lime-400/10' : 'border-zinc-800 bg-zinc-900'}`}>
              <Text style={[styles.chipText, filterValue === null && styles.chipTextActive]}>Wszystkie</Text>
            </Pressable>
            {filterOptions.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: filterValue === option }}
                onPress={() => setFilterValue((current) => current === option ? null : option)}
                className={`mr-2 rounded-full border px-4 py-2.5 ${filterValue === option ? 'border-lime-400/50 bg-lime-400/10' : 'border-zinc-800 bg-zinc-900'}`}>
                <Text style={[styles.chipText, filterValue === option && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {recentExercises.length > 0 ? (
            <ExerciseSection
              title="Ostatnie ćwiczenia"
              eyebrow="SZYBKI DOSTĘP"
              exercises={recentExercises}
              selectedExerciseIds={selectedExerciseIds}
              onSelect={selectExercise}
              onShowDetails={onShowDetails}
            />
          ) : (
            <View className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
              <Text style={styles.sectionEyebrow}>SZYBKI DOSTĘP</Text>
              <Text style={styles.recentEmptyText}>Ostatnie ćwiczenia</Text>
              <Text style={styles.emptyDescription}>Dodane pozycje pojawią się tutaj przy kolejnym otwarciu biblioteki.</Text>
            </View>
          )}

          <View className="flex-row items-end justify-between" style={styles.sectionHeading}>
            <View className="min-w-0 flex-1">
              <Text style={styles.sectionEyebrow}>TWOJA BAZA</Text>
              <Text style={styles.sectionTitle}>Własne ćwiczenia</Text>
            </View>
            <Text style={styles.sectionCount}>{customVisible.length}</Text>
          </View>
          <View className="flex-row items-center rounded-2xl border border-zinc-800 bg-zinc-900 p-2" style={styles.customInputRow}>
            <TextInput
              accessibilityLabel="Nazwa własnego ćwiczenia"
              value={customName}
              onChangeText={setCustomName}
              placeholder="Dodaj własną pozycję"
              placeholderTextColor="#778176"
              selectionColor={workoutColors.neon}
              returnKeyType="done"
              onSubmitEditing={addCustomExercise}
              className="min-w-0 flex-1 text-zinc-100"
              style={styles.customInput}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Utwórz ćwiczenie" onPress={addCustomExercise} disabled={!customName.trim()} className="items-center justify-center rounded-xl bg-lime-400 disabled:opacity-40" style={styles.customAddButton}>
              <Text style={styles.customAddText}>+</Text>
            </Pressable>
          </View>
          {customVisible.length > 0 && (
            <ExerciseList exercises={customVisible} selectedExerciseIds={selectedExerciseIds} onSelect={selectExercise} onShowDetails={onShowDetails} />
          )}

          <ExerciseSection
            title="Wszystkie ćwiczenia"
            eyebrow="BIBLIOTEKA · 20+ RUCHÓW"
            exercises={standardVisible}
            selectedExerciseIds={selectedExerciseIds}
            onSelect={selectExercise}
            onShowDetails={onShowDetails}
          />
          {visibleExercises.length === 0 && (
            <View className="items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-5 py-8" style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nie znaleziono ćwiczeń</Text>
              <Text style={styles.emptyDescription}>Zmień wyszukiwanie lub dodaj własne ćwiczenie.</Text>
            </View>
          )}
          <View style={styles.bottomSpace} />
        </ScrollView>
    </View>
  );
}

function ExerciseSection({
  title,
  eyebrow,
  exercises,
  selectedExerciseIds,
  onSelect,
  onShowDetails,
}: {
  title: string;
  eyebrow: string;
  exercises: Exercise[];
  selectedExerciseIds: string[];
  onSelect: (exercise: Exercise) => void;
  onShowDetails: (exercise: Exercise) => void;
}) {
  return (
    <View style={styles.section}>
      <View className="flex-row items-end justify-between" style={styles.sectionHeading}>
        <View className="min-w-0 flex-1">
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.sectionCount}>{exercises.length}</Text>
      </View>
      <ExerciseList
        exercises={exercises}
        selectedExerciseIds={selectedExerciseIds}
        onSelect={onSelect}
        onShowDetails={onShowDetails}
      />
    </View>
  );
}

function ExerciseList({
  exercises,
  selectedExerciseIds,
  onSelect,
  onShowDetails,
}: {
  exercises: Exercise[];
  selectedExerciseIds: string[];
  onSelect: (exercise: Exercise) => void;
  onShowDetails: (exercise: Exercise) => void;
}) {
  return (
    <View className="overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/80" style={styles.exerciseList}>
      {exercises.map((exercise, index) => {
        const isAdded = selectedExerciseIds.includes(exercise.id);
        return (
          <View key={exercise.id} className="min-w-0 flex-row items-center" style={[styles.exerciseRow, index === exercises.length - 1 && styles.exerciseRowLast]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Szczegóły ćwiczenia: ${exercise.name}`}
              onPress={() => onShowDetails(exercise)}
              className="min-w-0 flex-1 flex-row items-center active:opacity-70"
              style={styles.exerciseSelect}>
              <View className="shrink-0 items-center justify-center rounded-2xl bg-lime-400/10" style={styles.exerciseGlyph}>
                <Text style={styles.exerciseGlyphText}>{exercise.name.slice(0, 1).toLocaleUpperCase('pl-PL')}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="min-w-0 shrink" style={styles.exerciseName} numberOfLines={1} ellipsizeMode="tail">{exercise.name}</Text>
                <View className="mt-1.5 flex-row items-center">
                  <Text style={styles.categoryText}>{exercise.category.toLocaleUpperCase('pl-PL')}</Text>
                  <View style={styles.metaDot} />
                  <Text className="min-w-0 shrink" style={styles.equipmentText} numberOfLines={1} ellipsizeMode="tail">{exercise.equipment}</Text>
                </View>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Informacje o ćwiczeniu: ${exercise.name}`} onPress={() => onShowDetails(exercise)} className="active:opacity-70" style={styles.infoButton}>
              <Text style={styles.infoButtonText}>i</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isAdded ? 'Już dodano' : 'Dodaj'} ${exercise.name}`}
              accessibilityState={{ disabled: isAdded, selected: isAdded }}
              onPress={() => onSelect(exercise)}
              disabled={isAdded}
              className={`items-center justify-center rounded-full active:opacity-70 ${isAdded ? 'bg-lime-400/15' : 'bg-zinc-800'}`}
              style={styles.addIndicator}>
              <Text style={[styles.addIndicatorText, isAdded && styles.addIndicatorTextAdded]}>{isAdded ? '✓' : '+'}</Text>
            </Pressable>
          </View>
        );
      })}
      {exercises.length === 0 && (
        <View style={styles.emptyList}>
          <Text style={styles.emptyDescription}>Brak ćwiczeń w tej kategorii.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: workoutColors.background },
  header: { minHeight: 74 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#303A31', backgroundColor: '#151A16' },
  backArrow: { color: workoutColors.text, fontSize: 30, lineHeight: 34, marginTop: -3 },
  headerKicker: { color: workoutColors.neon, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  headerTitle: { color: workoutColors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  countText: { color: workoutColors.neon, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },
  searchBox: { minHeight: 54 },
  searchIcon: { color: '#AAB4A8', fontSize: 25, lineHeight: 30, marginRight: 10 },
  searchInput: { color: workoutColors.text, fontSize: 14, height: 52, paddingVertical: 0 },
  clearSearch: { alignItems: 'center', justifyContent: 'center', height: 32, width: 32 },
  clearSearchText: { color: '#AAB4A8', fontSize: 24 },
  filterTabs: { minHeight: 48 },
  filterTabText: { color: '#929D92', fontSize: 12, fontWeight: '700' },
  filterTabTextActive: { color: workoutColors.text },
  chipList: { paddingTop: 13, paddingBottom: 2 },
  chipText: { color: '#AAB4A8', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: workoutColors.neon },
  section: { marginTop: 28 },
  sectionHeading: { alignItems: 'flex-end', marginBottom: 13, marginTop: 25 },
  sectionEyebrow: { color: '#899389', fontSize: 9, fontWeight: '800', letterSpacing: 1.45, marginBottom: 5 },
  sectionTitle: { color: workoutColors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.35 },
  sectionCount: { color: '#9EA99E', fontSize: 11, fontWeight: '800', paddingBottom: 2 },
  recentEmptyText: { color: workoutColors.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  customInputRow: { minHeight: 56 },
  customInput: { color: workoutColors.text, fontSize: 13, height: 44, paddingHorizontal: 10 },
  customAddButton: { height: 40, width: 42 },
  customAddText: { color: '#11160C', fontSize: 27, fontWeight: '500', lineHeight: 31, marginTop: -2 },
  exerciseList: { marginTop: 12 },
  exerciseRow: { alignItems: 'center', borderBottomColor: 'rgba(237,247,239,0.075)', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 79, paddingHorizontal: 12 },
  exerciseRowLast: { borderBottomWidth: 0 },
  exerciseSelect: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 78, paddingVertical: 11 },
  exerciseGlyph: { height: 44, width: 44 },
  exerciseGlyphText: { color: workoutColors.neon, fontSize: 17, fontWeight: '900' },
  exerciseName: { color: workoutColors.text, fontSize: 13, fontWeight: '800' },
  categoryText: { color: workoutColors.neon, fontSize: 8, fontWeight: '800', letterSpacing: 0.65 },
  metaDot: { backgroundColor: '#657065', borderRadius: 3, height: 3, marginHorizontal: 6, width: 3 },
  equipmentText: { color: '#909A90', fontSize: 9, fontWeight: '600' },
  infoButton: { alignItems: 'center', justifyContent: 'center', height: 38, marginLeft: 3, width: 34 },
  infoButtonText: { alignItems: 'center', borderColor: '#586357', borderRadius: 10, borderWidth: 1, color: '#B9C3B8', fontSize: 12, fontStyle: 'italic', fontWeight: '800', height: 21, lineHeight: 19, overflow: 'hidden', textAlign: 'center', width: 21 },
  addIndicator: { height: 31, marginLeft: 5, width: 31 },
  addIndicatorText: { color: '#AAB4A8', fontSize: 19, fontWeight: '500', lineHeight: 23 },
  addIndicatorTextAdded: { color: workoutColors.neon, fontSize: 13, fontWeight: '800' },
  emptyList: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20 },
  emptyState: { marginTop: 24 },
  emptyTitle: { color: workoutColors.text, fontSize: 14, fontWeight: '800' },
  emptyDescription: { color: '#9BA69A', fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: 'center' },
  bottomSpace: { height: 24 },
});
