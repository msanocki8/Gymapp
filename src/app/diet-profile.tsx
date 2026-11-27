import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip, DietField, DietHeader, dietUi } from '@/components/diet/diet-ui';
import { formatKcal } from '@/components/diet/diet-summary-card';
import { ObsidianCard } from '@/components/obsidian-card';
import { WorkoutButton, WorkoutScreen } from '@/components/workout-ui';
import { useAuth } from '@/hooks/use-auth';
import { saveProfile } from '@/hooks/use-diet';
import {
  ACTIVITY_LABELS,
  activityFromWeeklyGoal,
  calculateBmr,
  calculateTargets,
  calculateTdee,
  GOAL_LABELS,
  type ActivityLevel,
  type DietGoal,
  type DietProfileInput,
  type Sex,
} from '@/lib/nutrition';
import { loadDietProfile } from '@/services/diet-repository';

function toNumber(text: string) {
  const value = Number(text.replace(',', '.').trim());
  return text.trim() === '' || !Number.isFinite(value) ? null : value;
}

export default function DietProfileScreen() {
  const router = useRouter();
  const { user, weeklyWorkoutGoal } = useAuth();
  const userId = user?.id ?? null;
  const suggestedActivity = activityFromWeeklyGoal(weeklyWorkoutGoal);

  const [loading, setLoading] = useState(true);
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>(suggestedActivity);
  const [goal, setGoal] = useState<DietGoal>('maintain');
  const [manualKcal, setManualKcal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadDietProfile(userId)
      .then((profile) => {
        if (!profile) return;
        setSex(profile.sex);
        setAge(String(profile.age));
        setHeight(String(profile.heightCm));
        setWeight(String(profile.weightKg));
        setActivity(profile.activity);
        setGoal(profile.goal);
        setManualKcal(profile.kcalTarget ? String(profile.kcalTarget) : '');
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Nie udało się wczytać profilu.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const ageValue = toNumber(age);
  const heightValue = toNumber(height);
  const weightValue = toNumber(weight);
  const kcalValue = toNumber(manualKcal);
  const valid =
    ageValue !== null && Number.isInteger(ageValue) && ageValue >= 13 && ageValue <= 100 &&
    heightValue !== null && heightValue >= 120 && heightValue <= 230 &&
    weightValue !== null && weightValue >= 30 && weightValue <= 300 &&
    (kcalValue === null || (Number.isInteger(kcalValue) && kcalValue >= 800 && kcalValue <= 7000));

  const profile: DietProfileInput | null = valid
    ? { sex, age: ageValue!, heightCm: heightValue!, weightKg: weightValue!, activity, goal, kcalTarget: kcalValue }
    : null;
  const targets = profile ? calculateTargets(profile) : null;

  const save = async () => {
    if (!userId || !profile) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile(userId, profile);
      router.back();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się zapisać.');
      setSaving(false);
    }
  };

  return (
    <WorkoutScreen>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <DietHeader eyebrow="DIETA" title="Twój cel" />
        {loading && userId ? (
          <ActivityIndicator color="#A3E635" style={styles.loading} />
        ) : (
          <>
            <Text style={dietUi.sectionEyebrow}>CEL</Text>
            <View style={dietUi.chips}>
              {(Object.keys(GOAL_LABELS) as DietGoal[]).map((key) => (
                <Chip key={key} label={GOAL_LABELS[key]} active={goal === key} onPress={() => setGoal(key)} />
              ))}
            </View>

            <ObsidianCard contentStyle={styles.card}>
              <View style={dietUi.chips}>
                <Chip label="Mężczyzna" active={sex === 'male'} onPress={() => setSex('male')} />
                <Chip label="Kobieta" active={sex === 'female'} onPress={() => setSex('female')} />
              </View>
              <View style={styles.row}>
                <DietField label="WIEK" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
                <DietField label="WZROST" suffix="cm" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={5} />
                <DietField label="WAGA" suffix="kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} />
              </View>
            </ObsidianCard>

            <Text style={dietUi.sectionEyebrow}>AKTYWNOŚĆ</Text>
            <Text style={dietUi.muted}>
              Podpowiedź z Twojego celu treningów ({weeklyWorkoutGoal}× w tygodniu): {ACTIVITY_LABELS[suggestedActivity].toLowerCase()}.
            </Text>
            <View style={dietUi.chips}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((key) => (
                <Chip key={key} label={ACTIVITY_LABELS[key]} active={activity === key} onPress={() => setActivity(key)} />
              ))}
            </View>

            <ObsidianCard highlighted={Boolean(targets)} contentStyle={styles.card}>
              <Text style={dietUi.sectionEyebrow}>TWOJE ZAPOTRZEBOWANIE</Text>
              {profile && targets ? (
                <>
                  <View style={styles.stats}>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{formatKcal(calculateBmr(profile))}</Text>
                      <Text style={styles.statLabel}>BMR (spoczynek)</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{formatKcal(calculateTdee(profile))}</Text>
                      <Text style={styles.statLabel}>TDEE (z ruchem)</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, styles.statAccent]}>{formatKcal(targets.kcal)}</Text>
                      <Text style={styles.statLabel}>cel kcal</Text>
                    </View>
                  </View>
                  <Text style={dietUi.muted}>
                    Białko {targets.protein} g · Węgle {targets.carbs} g · Tłuszcze {targets.fat} g
                  </Text>
                </>
              ) : (
                <Text style={dietUi.muted}>Uzupełnij wiek (13–100), wzrost (120–230 cm) i wagę (30–300 kg).</Text>
              )}
              <DietField
                label="WŁASNY CEL KCAL (opcjonalnie)"
                suffix="kcal"
                value={manualKcal}
                onChangeText={setManualKcal}
                keyboardType="number-pad"
                placeholder="zostaw puste = wyliczony"
                maxLength={4}
              />
            </ObsidianCard>

            {error ? <Text style={dietUi.error}>{error}</Text> : null}
            <WorkoutButton label={saving ? 'Zapisuję…' : 'Zapisz cel'} onPress={save} disabled={!profile || saving || !userId} />
            <Text style={styles.footnote}>
              Wzór Mifflin–St Jeor. Redukcja −15 %, masa +10 % względem TDEE; białko 2,0 g/kg na redukcji, 1,8 g/kg poza nią; tłuszcze 25 % kalorii.
            </Text>
          </>
        )}
      </ScrollView>
    </WorkoutScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, paddingBottom: 40, paddingHorizontal: 16, paddingTop: 12 },
  loading: { marginTop: 40 },
  card: { gap: 12, padding: 16 },
  row: { columnGap: 8, flexDirection: 'row' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: '#F5F7F2', fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '900' },
  statAccent: { color: '#4ADE80' },
  statLabel: { color: '#8A948C', fontSize: 10, fontWeight: '800', marginTop: 2 },
  footnote: { color: '#5F6962', fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
