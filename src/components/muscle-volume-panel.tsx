import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { BodyView, MuscleEngagementMap } from '@/components/muscle-engagement-map';
import type { AnalysisPeriod, MuscleId, MuscleStatus, MuscleVolume } from '@/lib/muscle-volume';

const statusLabels: Record<MuscleStatus, string> = {
	'no-stimulus': 'Brak serii głównych',
	below: 'Niska objętość',
	'in-range': 'W zakresie',
	warning: 'Wysoka objętość',
};

const statusColors: Record<MuscleStatus, string> = {
	'no-stimulus': '#738078',
	below: '#69A8FF',
	'in-range': '#79DD20',
	warning: '#FF7474',
};

type CrossPlatformShadowStyle = ViewStyle & { boxShadow?: string };

const cardGlowStyle = Platform.select<CrossPlatformShadowStyle>({
	web: { boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' },
	default: {
		shadowColor: '#10b981',
		shadowOpacity: 0.16,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 5 },
		elevation: 4,
	},
});

function formatSets(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function MuscleVolumePanel({
	volumes,
	sessionVolumes,
	weeklyVolumes,
	onPeriodChange,
	period,
}: {
	volumes: MuscleVolume[];
	sessionVolumes: MuscleVolume[];
	weeklyVolumes: MuscleVolume[];
	onPeriodChange: (period: AnalysisPeriod) => void;
	period: AnalysisPeriod;
}) {
	const [bodyView, setBodyView] = useState<BodyView>('front');
	const [selectedMuscleId, setSelectedMuscleId] = useState<MuscleId>('chest');
	const selected = volumes.find((muscle) => muscle.muscleId === selectedMuscleId) ?? volumes[0];
	const selectedSession = sessionVolumes.find((muscle) => muscle.muscleId === selected?.muscleId);
	const selectedWeek = weeklyVolumes.find((muscle) => muscle.muscleId === selected?.muscleId);
	const inRangeCount = volumes.filter((muscle) => muscle.status === 'in-range').length;
	const belowCount = volumes.filter((muscle) => muscle.status === 'below').length;
	const warningCount = volumes.filter((muscle) => muscle.status === 'warning').length;
	const noStimulusCount = volumes.filter((muscle) => muscle.status === 'no-stimulus').length;

	return (
		<View className="overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/80" style={[styles.card, cardGlowStyle]}>
			<LinearGradient
				colors={['rgba(22, 31, 22, 0.98)', 'rgba(12, 17, 14, 0.98)']}
				style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
			/>
			<View style={styles.headingRow}>
				<View style={styles.headingCopy}>
					<Text style={styles.eyebrow}>ANALIZA MIĘŚNIOWA</Text>
					<Text style={styles.title}>Wykonane serie mięśni</Text>
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
				{period === 'session'
					? 'Tylko bieżący trening. Serie pomocnicze nie są doliczane do celu.'
					: 'Suma wykonanych serii z bieżącego tygodnia. Serie pomocnicze nie są doliczane do celu.'}
			</Text>
			<View style={styles.summaryGrid}>
				{period === 'session' ? (
					<>
						<SummaryItem label="Niska objętość" count={belowCount} color={statusColors.below} />
						<SummaryItem label="W zakresie" count={inRangeCount} color={statusColors['in-range']} />
						<SummaryItem label="Wysoka objętość" count={warningCount} color={statusColors.warning} />
						<SummaryItem label="Brak serii głównych" count={noStimulusCount} color={statusColors['no-stimulus']} />
					</>
				) : (
					<>
						<SummaryItem label="W zakresie" count={inRangeCount} color={statusColors['in-range']} />
						<SummaryItem label="Poniżej celu" count={belowCount} color={statusColors.below} />
						<SummaryItem label="Wysoka objętość" count={warningCount} color={statusColors.warning} />
						<SummaryItem label="Brak serii głównych" count={noStimulusCount} color={statusColors['no-stimulus']} />
					</>
				)}
			</View>

			<View style={styles.legend}>
				{period === 'session' ? (
					<>
						<LegendItem color={statusColors.below} label="Niska objętość sesji" />
						<LegendItem color={statusColors['in-range']} label="Zakres sesji" />
						<LegendItem color={statusColors.warning} label="Wysoka objętość sesji" />
						<LegendItem color={statusColors['no-stimulus']} label="Brak serii głównych" />
					</>
				) : (
					<>
						<LegendItem color={statusColors['in-range']} label="W zakresie" />
						<LegendItem color={statusColors.below} label="Poniżej zakresu" />
						<LegendItem color={statusColors.warning} label="Wysoka objętość" />
						<LegendItem color={statusColors['no-stimulus']} label="Brak serii głównych" />
					</>
				)}
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
					<View style={styles.setCount}>
						<CountStat label="SESJA" value={selectedSession?.performedSets ?? 0} />
						<CountStat label="TYDZIEŃ" value={selectedWeek?.performedSets ?? 0} />
					</View>
					<Text style={styles.rangeText}>
						{period === 'session' ? 'Zakres orientacyjny sesji' : 'Zakres orientacyjny tygodnia'}: {formatSets(selected.range.preferredMin)}–{formatSets(selected.range.preferredMax)} serii · wysoka objętość od {formatSets(selected.range.warningFrom)}
					</Text>
					<Text style={[styles.statusExplanation, { color: statusColors[selected.status] }]}>
						{getStatusExplanation(selected, period)}
					</Text>
					{selected.hasAuxiliaryStimulus ? (
						<Text style={styles.auxiliaryNote}>
							Partia uczestniczy też pomocniczo w ćwiczeniach; tych serii nie doliczamy do celu.
						</Text>
					) : null}
				</View>
			) : null}
			<Text style={styles.referenceNote}>Zakresy orientacyjne. Próg nie jest diagnozą przetrenowania.</Text>
		</View>
	);
}

function getStatusExplanation(muscle: MuscleVolume, period: AnalysisPeriod) {
	const scope = period === 'session' ? 'w tej sesji' : 'w tym tygodniu';
	const sets = formatSets(muscle.performedSets);
	if (period === 'session') {
		if (muscle.status === 'no-stimulus') {
			return muscle.hasAuxiliaryStimulus
				? `0 serii głównych ${scope}; partia była zaangażowana pomocniczo.`
				: `Brak wykonanych serii przypisanych do tej partii ${scope}.`;
		}
		if (muscle.performedSets > 0) {
			return `${muscle.performedSets === 1 ? '1 seria' : `${sets} serii`} ${scope}. Sama liczba serii nie pozwala ocenić jakości bodźca.`;
		}
	}
	switch (muscle.status) {
		case 'no-stimulus':
			return `Brak wykonanych serii przypisanych do tej partii ${scope}.`;
		case 'below':
			return `${sets} serii ${scope} — poniżej orientacyjnego zakresu. Kolor nie ocenia jakości bodźca.`;
		case 'in-range':
			return `${sets} serii ${scope} — w orientacyjnym zakresie.`;
		case 'warning':
			return `${sets} serii ${scope} — wysoka objętość. Oceń kontekst, regenerację i postępy; kolor nie oznacza przetrenowania.`;
	}
}

function CountStat({ label, value }: { label: string; value: number }) {
	return (
		<View style={styles.countStat}>
			<Text style={styles.setCountValue}>{value}</Text>
			<Text style={styles.setCountLabel}>{label}</Text>
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

const styles = StyleSheet.create({
	card: {
		backgroundColor: 'rgba(17, 23, 19, 0.96)',
		borderColor: 'rgba(222, 243, 225, 0.105)',
		borderRadius: 24,
		borderWidth: 1,
		marginTop: 18,
		paddingHorizontal: 16,
		paddingTop: 17,
		paddingBottom: 16,
	},
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
	summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
	summaryItem: { minWidth: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, borderColor: '#28312A', borderWidth: 1, backgroundColor: '#0C110D', paddingHorizontal: 9, paddingVertical: 8 },
	summaryDot: { width: 7, height: 7, borderRadius: 4 },
	summaryCount: { color: '#F2F5EF', fontSize: 12, fontWeight: '800' },
	summaryLabel: { color: '#A6B0A7', fontSize: 10, flexShrink: 1 },
	legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 6, marginTop: 13 },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, borderWidth: 1, borderColor: '#28312A', backgroundColor: 'rgba(8, 13, 9, 0.8)', paddingHorizontal: 8, paddingVertical: 5 },
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
	setCount: { flexDirection: 'row', gap: 18, marginTop: 13 },
	countStat: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
	setCountValue: { color: '#E8EFE8', fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
	setCountLabel: { color: '#AAB5AA', fontSize: 8, fontWeight: '800', letterSpacing: 0.6, flexShrink: 1 },
	rangeText: { color: '#AAB5AA', fontSize: 10, lineHeight: 15, marginTop: 6 },
	statusExplanation: { fontSize: 10, lineHeight: 15, marginTop: 6 },
	auxiliaryNote: { color: '#8FA99A', fontSize: 10, lineHeight: 15, marginTop: 6 },
	referenceNote: { color: '#758078', fontSize: 9, lineHeight: 14, marginTop: 12 },
});
