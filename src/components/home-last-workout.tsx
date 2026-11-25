import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GymFlame } from '@/components/gym-flame';
import { ObsidianCard } from '@/components/obsidian-card';
import type { WorkoutSession } from '@/hooks/use-gym-app';
import {
  formatNumber,
  formatRecordValue,
  formatWhen,
  getLastWorkoutSummary,
  getPersonalRecords,
} from '@/lib/workout-records';

function SectionHeader({
  eyebrow,
  title,
  link,
  onLink,
}: {
  eyebrow: string;
  title: string;
  link?: string;
  onLink?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {link && onLink ? (
        <Pressable accessibilityRole="link" onPress={onLink} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.link}>{link} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Ekran główny pod kartą „Zrób coś swojego”: ostatni trening + rekordy (z historii treningów). */
export function HomeLastWorkout({
  sessions,
  loading,
  error,
  onRetry,
  onOpenHistory,
  onStart,
}: {
  sessions: WorkoutSession[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenHistory: () => void;
  onStart: () => void;
}) {
  const summary = useMemo(() => getLastWorkoutSummary(sessions), [sessions]);
  const records = useMemo(() => getPersonalRecords(sessions, 3), [sessions]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const refresh = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearTimeout(refresh);
      clearInterval(timer);
    };
  }, []);

  const currentTime = now || summary?.completedAt || 0;

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader eyebrow="OSTATNIO" title="Twój ostatni trening" />
        <ObsidianCard contentStyle={styles.stateCard}>
          <ActivityIndicator color="#A3E635" />
          <Text style={styles.stateText}>Ładowanie historii…</Text>
        </ObsidianCard>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.section}>
        <SectionHeader eyebrow="OSTATNIO" title="Twój ostatni trening" />
        <ObsidianCard contentStyle={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </Pressable>
        </ObsidianCard>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.section}>
        <SectionHeader eyebrow="OSTATNIO" title="Twój ostatni trening" />
        <ObsidianCard contentStyle={styles.emptyCard}>
          <View style={styles.flameTile}>
            <GymFlame size={28} variant="off" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Tu pojawi się Twój pierwszy trening</Text>
            <Text style={styles.meta}>Zrób trening – zobaczysz serie, objętość i rekordy.</Text>
          </View>
        </ObsidianCard>
        <Pressable accessibilityRole="button" onPress={onStart} style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}>
          <Text style={styles.emptyCtaText}>Wybierz trening</Text>
        </Pressable>
      </View>
    );
  }

  const change = summary.volumeChangePercent;
  const durationLabel = `${summary.duration} min`;

  return (
    <View style={styles.section}>
      <SectionHeader eyebrow="OSTATNIO" title="Twój ostatni trening" link="Historia" onLink={onOpenHistory} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ostatni trening ${summary.name}, ${formatWhen(summary.completedAt, now)}, ${durationLabel}. Otwórz historię`}
        onPress={onOpenHistory}
        style={({ pressed }) => pressed && styles.pressed}>
        <ObsidianCard contentStyle={styles.lastCard}>
          <View style={styles.lastRow}>
            <View style={styles.flameTile}>
              <GymFlame size={28} />
            </View>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.cardTitle}>{summary.name}</Text>
              <Text style={styles.meta}>{formatWhen(summary.completedAt, currentTime)} · {durationLabel}</Text>
            </View>
            {change !== null && change !== 0 ? (
              <View style={[styles.badge, change < 0 && styles.badgeDown]}>
                <Text style={[styles.badgeText, change < 0 && styles.badgeTextDown]}>
                  {change > 0 ? '+' : '−'}{Math.abs(change)}%
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.kpis}>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{summary.sets}</Text>
              <Text style={styles.kpiLabel}>SERII</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{summary.exercises} ćw.</Text>
              <Text style={styles.kpiLabel}>ZROBIONE</Text>
            </View>
            <View style={[styles.kpi, styles.kpiWide]}>
              <Text numberOfLines={1} style={styles.kpiValue}>{formatNumber(summary.volumeKg)}</Text>
              <Text style={styles.kpiLabel}>KG OBJĘTOŚCI</Text>
            </View>
          </View>
        </ObsidianCard>
      </Pressable>

      {records.length > 0 ? (
        <>
          <SectionHeader eyebrow="REKORDY" title="Twoje najlepsze wyniki" />
          <View style={styles.records}>
            {records.map((record) => (
              <ObsidianCard key={record.key} contentStyle={styles.recordRow}>
                <Text numberOfLines={2} style={styles.recordName}>{record.name}</Text>
                <Text style={styles.recordValue}>{formatRecordValue(record)}</Text>
                <Text numberOfLines={1} style={[styles.recordWhen, record.isNew && styles.recordNew]}>
                  {record.isNew ? `nowy · ${formatWhen(record.achievedAt, currentTime)}` : formatWhen(record.achievedAt, currentTime)}
                </Text>
              </ObsidianCard>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 1,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: '#A3E635',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 5,
  },
  title: {
    color: '#F5F7F6',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  link: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '800',
    paddingVertical: 6,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  flameTile: {
    alignItems: 'center',
    backgroundColor: '#0A0D0B',
    borderColor: 'rgba(163,230,53,0.28)',
    borderRadius: 15,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  lastCard: {
    padding: 14,
  },
  lastRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardTitle: {
    color: '#F5F7F6',
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    color: '#7F8983',
    fontSize: 12,
    marginTop: 3,
  },
  badge: {
    backgroundColor: '#A3E635',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeDown: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#06210D',
    fontSize: 12,
    fontWeight: '900',
  },
  badgeTextDown: {
    color: '#C9D1CB',
  },
  kpis: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  kpi: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    flex: 1,
    padding: 10,
  },
  kpiWide: {
    flex: 1.3,
  },
  kpiValue: {
    color: '#4ADE80',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  kpiLabel: {
    color: '#8A948C',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  records: {
    gap: 8,
  },
  recordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recordName: {
    color: '#F5F7F6',
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
  },
  recordValue: {
    color: '#A3E635',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  recordWhen: {
    color: '#7F8983',
    fontSize: 11,
    textAlign: 'right',
    width: 84,
  },
  recordNew: {
    color: '#BEF264',
    fontWeight: '800',
  },
  stateCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    justifyContent: 'center',
    minHeight: 86,
    padding: 18,
  },
  stateText: {
    color: '#F5F7F6',
    fontSize: 13,
  },
  errorCard: {
    gap: 12,
    padding: 17,
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
    lineHeight: 19,
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  retryText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  emptyCta: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: 'rgba(163,230,53,0.45)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  emptyCtaText: {
    color: '#BEF264',
    fontSize: 12.5,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
