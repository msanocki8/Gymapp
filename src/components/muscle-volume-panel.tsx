import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BodyView, MuscleEngagementMap } from '@/components/muscle-engagement-map';
import type { AnalysisPeriod, ExperienceLevel, MuscleId, MuscleStatus, MuscleVolume } from '@/lib/muscle-volume';

const levelLabels: Record<ExperienceLevel, string> = {
	beginner: 'Początkujący',
	intermediate: 'Średni',
	advanced: 'Zaawansowany',
};

const statusLabels: Record<MuscleStatus, string> = {
	'no-stimulus': 'Brak bodźca',
	below: 'Poniżej celu',
	'in-range': 'W zakresie',
	'above-preferred': 'Powyżej preferowanego',
	warning: 'Powyżej progu ostrzegawczego',
};

const statusColors: Record<MuscleStatus, string> = {
	'no-stimulus': '#738078',
	below: '#69A8FF',
	'in-range': '#B7FF35',
	'above-preferred': '#B7FF35',
	warning: '#FF7474',
};

function formatSets(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function MuscleVolumePanel({
	volumes,
	projectedVolumes,
	onPeriodChange,
	onLevelChange,
	period,
	level,
}: {
	volumes: MuscleVolume[];
	projectedVolumes: MuscleVolume[];
	onPeriodChange: (period: AnalysisPeriod) => void;
	onLevelChange: (level: ExperienceLevel) => void;
	period: AnalysisPeriod;
	level: ExperienceLevel;
}) {
	const [bodyView, setBodyView] = useState<BodyView>('front');
	const [selectedMuscleId, setSelectedMuscleId] = useState<MuscleId>('chest');
	const selected = volumes.find((muscle) => muscle.muscleId === selectedMuscleId) ?? volumes[0];
	const projected = projectedVolumes.find((muscle) => muscle.muscleId === selected?.muscleId);
	const inRangeCount = volumes.filter((muscle) => muscle.status === 'in-range' || muscle.status === 'above-preferred').length;
	const belowCount = volumes.filter((muscle) => muscle.status === 'below').length;
	const warningCount = volumes.filter((muscle) => muscle.status === 'warning').length;
	const noStimulusCount = volumes.filter((muscle) => muscle.status === 'no-stimulus').length;

	return (
		<View className="rounded-3xl border border-zinc-800/80 bg-zinc-900/80" style={styles.card}>
			<View style={styles.headingRow}>
				<View style={styles.headingCopy}>
					<Text style={styles.eyebrow}>ANALIZA MIĘŚNIOWA</Text>
					<Text style={styles.title}>Szacowane serie efektywne</Text>
				</View>
				<View accessibilityRole="tablist" style={styles.periodToggle}>
					{(['session', 'week'] as const).map((item) => {
						const isSelected = period === item;
						return (
							<Pressable
								key={item}
								accessibilityRole="tab"
								accessibilityState={{ selected: isSelected }}
								onPress={() => onPeriodChange(item)}
								style={[styles.periodButton, isSelected && styles.periodButtonSelected]}>
								<Text style={[styles.periodText, isSelected && styles.periodTextSelected]}>
									{item === 'session' ? 'Sesja' : 'Tydzień'}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<Text style={styles.disclaimer}>
				Przybliżenie z wykonanych serii, nie pomiar wzrostu mięśni. Zakres sesji to orientacyjnie połowa celu tygodniowego.
			</Text>
			<View style={styles.levelRow}>
				<Text style={styles.levelLabel}>POZIOM</Text>
				<View style={styles.levelOptions}>
					{(Object.keys(levelLabels) as ExperienceLevel[]).map((item) => {
						const isSelected = level === item;
						return (
							<Pressable
								key={item}
								accessibilityRole="button"
								accessibilityState={{ selected: isSelected }}
								onPress={() => onLevelChange(item)}
								style={[styles.levelButton, isSelected && styles.periodButtonSelected]}>
								<Text style={[styles.levelText, isSelected && styles.periodTextSelected]}>{levelLabels[item]}</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<View style={styles.summaryGrid}>
				<SummaryItem label="W zakresie" count={inRangeCount} color={statusColors['in-range']} />
				<SummaryItem label="Poniżej celu" count={belowCount} color={statusColors.below} />
				<SummaryItem label="Powyżej progu" count={warningCount} color={statusColors.warning} />
				<SummaryItem label="Bez bodźca" count={noStimulusCount} color={statusColors['no-stimulus']} />
			</View>

			<View style={styles.legend}>
				<LegendItem color={statusColors['in-range']} label="W zakresie" />
				<LegendItem color={statusColors.below} label="Bodziec poniżej celu" />
				<LegendItem color={statusColors.warning} label="Próg ostrzegawczy" />
				<LegendItem color={statusColors['no-stimulus']} label="Brak bodźca" />
			</View>

			<MuscleEngagementMap
				view={bodyView}
				onViewChange={setBodyView}
				volumes={volumes}
				selectedMuscleId={selected?.muscleId ?? selectedMuscleId}
				onMuscleSelect={setSelectedMuscleId}
			/>

			{selected ? (
				<View style={styles.detail}>
					<View style={styles.detailHeader}>
						<View style={styles.detailCopy}>
							<Text style={styles.detailEyebrow}>WYBRANA PARTIA</Text>
							<Text style={styles.detailTitle}>{selected.name}</Text>
						</View>
						<View style={[styles.statusPill, { borderColor: `${statusColors[selected.status]}66` }]}>
							<View style={[styles.statusDot, { backgroundColor: statusColors[selected.status] }]} />
							<Text style={[styles.statusText, { color: statusColors[selected.status] }]}>{statusLabels[selected.status]}</Text>
						</View>
					</View>
					<View style={styles.statsRow}>
						<DetailStat label="EFEKTYWNE" value={formatSets(selected.effectiveSets)} />
						<DetailStat label="BEZPOŚREDNIE" value={formatSets(selected.directSets)} />
						<DetailStat label="POŚREDNIE" value={formatSets(selected.indirectSets)} />
					</View>
					<Text style={styles.rangeText}>
						Minimum {formatSets(selected.range.minimum)} · preferowany zakres {formatSets(selected.range.preferredMin)}–{formatSets(selected.range.preferredMax)} · ostrzeżenie powyżej {formatSets(selected.range.warningAbove)} serii
					</Text>
					<Text style={styles.remainingText}>
						Do dolnej granicy: {formatSets(Math.max(0, selected.range.minimum - selected.effectiveSets))} serii · {formatSets(selected.lowerGoalProgress)}% realizacji
					</Text>
					{projected && projected.effectiveSets > selected.effectiveSets ? (
						<Text style={styles.forecastText}>
							Prognoza po zaplanowanych seriach: {formatSets(projected.effectiveSets)} serii
						</Text>
					) : null}

					{selected.exerciseContributions.length > 0 ? (
						<View style={styles.contributionList}>
							{selected.exerciseContributions.map((contribution) => (
								<View key={contribution.exerciseId} style={styles.contributionRow}>
									<Text numberOfLines={2} style={styles.exerciseName}>{contribution.exerciseName}</Text>
									<Text style={styles.contributionValue}>
										{formatSets(contribution.effectiveSets)} ser. · bezp. {formatSets(contribution.directSets)} / pośr. {formatSets(contribution.indirectSets)}
									</Text>
								</View>
							))}
						</View>
					) : (
						<Text style={styles.noContribution}>Brak ćwiczeń z przypisanym wkładem dla tej partii.</Text>
					)}
				</View>
			) : null}
			<Text style={styles.referenceNote}>Zakresy orientacyjne. Próg nie jest diagnozą przetrenowania.</Text>
		</View>
	);
}

function SummaryItem({ label, count, color }: { label: string; count: number; color: string }) {
	return (
		<View style={styles.summaryItem}>
			<View style={[styles.summaryDot, { backgroundColor: color }]} />
			<Text style={styles.summaryCount}>{count}</Text>
			<Text style={styles.summaryLabel}>{label}</Text>
		</View>
	);
}

function LegendItem({ color, label }: { color: string; label: string }) {
	return (
		<View style={styles.legendItem}>
			<View style={[styles.legendDot, { backgroundColor: color }]} />
			<Text style={styles.legendText}>{label}</Text>
		</View>
	);
}

function DetailStat({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.detailStat}>
			<Text style={styles.detailStatValue}>{value}</Text>
			<Text style={styles.detailStatLabel}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: { marginTop: 18, paddingHorizontal: 16, paddingTop: 17, paddingBottom: 16 },
	headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
	headingCopy: { flex: 1, minWidth: 0 },
	eyebrow: { color: '#9BA89C', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
	title: { color: '#F2F5EF', fontSize: 17, fontWeight: '800', marginTop: 4 },
	periodToggle: { flexDirection: 'row', borderColor: '#303A32', borderWidth: 1, borderRadius: 13, backgroundColor: '#090D0A', padding: 3 },
	periodButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10 },
	periodButtonSelected: { backgroundColor: '#25321D' },
	periodText: { color: '#89958B', fontSize: 11, fontWeight: '700' },
	periodTextSelected: { color: '#C5FF68' },
	disclaimer: { color: '#879188', fontSize: 11, lineHeight: 16, marginTop: 7 },
	levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 },
	levelLabel: { color: '#879188', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
	levelOptions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 3 },
	levelButton: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 7, borderRadius: 9 },
	levelText: { color: '#89958B', fontSize: 9, fontWeight: '700' },
	summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
	summaryItem: { minWidth: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, borderColor: '#28312A', borderWidth: 1, backgroundColor: '#0C110D', paddingHorizontal: 9, paddingVertical: 8 },
	summaryDot: { width: 7, height: 7, borderRadius: 4 },
	summaryCount: { color: '#F2F5EF', fontSize: 12, fontWeight: '800' },
	summaryLabel: { color: '#A6B0A7', fontSize: 10, flexShrink: 1 },
	legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 7, marginTop: 13 },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
	legendDot: { width: 7, height: 7, borderRadius: 4 },
	legendText: { color: '#A6B0A7', fontSize: 9 },
	detail: { borderTopColor: '#29322B', borderTopWidth: 1, paddingTop: 13, marginTop: 7 },
	detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	detailCopy: { flex: 1, minWidth: 0 },
	detailEyebrow: { color: '#849087', fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
	detailTitle: { color: '#F4F6F2', fontSize: 16, fontWeight: '800', marginTop: 4 },
	statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
	statusDot: { width: 6, height: 6, borderRadius: 3 },
	statusText: { fontSize: 9, fontWeight: '800', flexShrink: 1 },
	statsRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
	detailStat: { flex: 1, minWidth: 0, borderRadius: 10, backgroundColor: '#0B100C', paddingHorizontal: 8, paddingVertical: 9 },
	detailStatValue: { color: '#E8EFE8', fontSize: 15, fontWeight: '800' },
	detailStatLabel: { color: '#819084', fontSize: 8, fontWeight: '800', marginTop: 4 },
	rangeText: { color: '#AAB5AA', fontSize: 10, lineHeight: 15, marginTop: 10 },
	remainingText: { color: '#AAB5AA', fontSize: 10, lineHeight: 15, marginTop: 4 },
	forecastText: { color: '#C5FF68', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 5 },
	contributionList: { marginTop: 9 },
	contributionRow: { borderTopColor: '#242D26', borderTopWidth: 1, paddingVertical: 8 },
	exerciseName: { color: '#DCE5DC', fontSize: 11, fontWeight: '700' },
	contributionValue: { color: '#9CA99E', fontSize: 9, marginTop: 3 },
	noContribution: { color: '#89958C', fontSize: 10, marginTop: 10 },
	referenceNote: { color: '#758078', fontSize: 9, lineHeight: 14, marginTop: 12 },
});
