import { muscleVolumeRanges } from '../constants/muscle-volume.ts';

export type MuscleId =
	| 'chest'
	| 'upperChest'
	| 'lats'
	| 'upperBack'
	| 'traps'
	| 'lowerBack'
	| 'frontDelts'
	| 'lateralDelts'
	| 'rearDelts'
	| 'biceps'
	| 'triceps'
	| 'forearms'
	| 'quads'
	| 'hamstrings'
	| 'glutes'
	| 'adductors'
	| 'calves'
	| 'abs'
	| 'obliques';

export type AnalysisPeriod = 'session' | 'week';
export type MuscleRole = 'primary' | 'secondary';
export type MuscleStatus = 'no-stimulus' | 'below' | 'in-range' | 'warning';

export type ExerciseMuscleAssignment = {
	muscleId: MuscleId;
	role: MuscleRole;
};

export type VolumeSet = {
	status?: 'pending' | 'completed';
	completed?: boolean;
	reps?: string;
	rir?: number;
	isWarmup?: boolean;
};

export type VolumeExercise = {
	exerciseId?: string;
	name: string;
	sets: VolumeSet[];
};

export type VolumeSession = {
	completedAt: number;
	exercisePerformance?: VolumeExercise[];
};

export type MuscleRange = {
	preferredMin: number;
	preferredMax: number;
	warningFrom: number;
};

export type MuscleVolume = {
	muscleId: MuscleId;
	name: string;
	performedSets: number;
	range: MuscleRange;
	status: MuscleStatus;
};

const muscles: { id: MuscleId; name: string }[] = [
	{ id: 'chest', name: 'Klatka piersiowa' },
	{ id: 'upperChest', name: 'Górna część klatki' },
	{ id: 'lats', name: 'Najszersze grzbietu' },
	{ id: 'upperBack', name: 'Górna i środkowa część pleców' },
	{ id: 'traps', name: 'Czworoboczne' },
	{ id: 'lowerBack', name: 'Prostowniki grzbietu' },
	{ id: 'frontDelts', name: 'Przedni akton barków' },
	{ id: 'lateralDelts', name: 'Boczny akton barków' },
	{ id: 'rearDelts', name: 'Tylny akton barków' },
	{ id: 'biceps', name: 'Biceps' },
	{ id: 'triceps', name: 'Triceps' },
	{ id: 'forearms', name: 'Przedramiona' },
	{ id: 'quads', name: 'Czworogłowe uda' },
	{ id: 'hamstrings', name: 'Dwugłowe uda' },
	{ id: 'glutes', name: 'Pośladki' },
	{ id: 'adductors', name: 'Przywodziciele uda' },
	{ id: 'calves', name: 'Łydki' },
	{ id: 'abs', name: 'Mięśnie brzucha' },
	{ id: 'obliques', name: 'Mięśnie skośne brzucha' },
];

function mapping(
	primary: MuscleId[],
	secondary: MuscleId[] = [],
): ExerciseMuscleAssignment[] {
	return [
		...primary.map((muscleId) => ({
			muscleId,
			role: 'primary' as const,
		})),
		...secondary.map((muscleId) => ({
			muscleId,
			role: 'secondary' as const,
		})),
	];
}

export const exerciseMuscleMappings: Readonly<Record<string, ExerciseMuscleAssignment[]>> = {
	'bench-press': mapping(['chest'], ['triceps', 'frontDelts']),
	'incline-dumbbell-press': mapping(['upperChest'], ['chest', 'triceps', 'frontDelts']),
	'incline-smith-press': mapping(['upperChest'], ['chest', 'triceps', 'frontDelts']),
	'flat-dumbbell-press': mapping(['chest'], ['triceps', 'frontDelts']),
	'lat-pulldown': mapping(['lats'], ['biceps']),
	'barbell-row': mapping(['lats', 'upperBack'], ['rearDelts', 'traps', 'biceps']),
	'chest-supported-row': mapping(['lats', 'upperBack'], ['rearDelts', 'traps', 'biceps']),
	'seated-cable-row': mapping(['lats', 'upperBack'], ['rearDelts', 'traps', 'biceps']),
	'pec-deck-fly': mapping(['chest']),
	'barbell-squat': mapping(['quads', 'glutes'], ['adductors']),
	'romanian-deadlift': mapping(['hamstrings', 'glutes']),
	'deadlift': mapping(['glutes', 'hamstrings', 'lowerBack'], ['traps']),
	'lateral-raise': mapping(['lateralDelts']),
	'cable-lateral-raise': mapping(['lateralDelts']),
	'overhead-press': mapping(['frontDelts', 'lateralDelts'], ['triceps']),
	'dumbbell-curl': mapping(['biceps']),
	'barbell-curl': mapping(['biceps']),
	'incline-dumbbell-curl': mapping(['biceps']),
	'preacher-curl': mapping(['biceps']),
	'cable-hammer-curl': mapping(['forearms'], ['biceps']),
	'triceps-pushdown': mapping(['triceps']),
	'cable-overhead-triceps-extension': mapping(['triceps']),
	'pull-up': mapping(['lats'], ['biceps']),
	'leg-press': mapping(['quads'], ['glutes']),
	'leg-extension': mapping(['quads']),
	'leg-curl': mapping(['hamstrings']),
	'seated-leg-curl': mapping(['hamstrings']),
	'calf-raise': mapping(['calves']),
	'face-pull': mapping(['rearDelts'], ['traps', 'upperBack']),
	'reverse-pec-deck': mapping(['rearDelts'], ['traps', 'upperBack']),
	'dips': mapping(['triceps'], ['chest', 'frontDelts']),
	'crunch': mapping(['abs']),
	'cable-crunch': mapping(['abs']),
	'plank': mapping(['abs']),
	'hanging-leg-raise': mapping(['abs']),
};

export const defaultMuscleRanges = muscleVolumeRanges.week;
export const defaultSessionRanges = muscleVolumeRanges.session;

function rangeFor(
	muscleId: MuscleId,
	period: AnalysisPeriod,
	overrides?: Partial<Record<MuscleId, MuscleRange>>,
): MuscleRange {
	return overrides?.[muscleId] ?? muscleVolumeRanges[period][muscleId] ?? {
		preferredMin: 0, preferredMax: 0, warningFrom: Number.POSITIVE_INFINITY,
	};
}

function statusForCount(performedSets: number, range: MuscleRange): MuscleStatus {
	if (performedSets < range.preferredMin) return 'below';
	if (performedSets >= range.warningFrom) return 'warning';
	return 'in-range';
}

function dateParts(timestamp: number, timeZone: string) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(new Date(timestamp));
	const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
	return { year: part('year'), month: part('month'), day: part('day') };
}

export function getLocalWeekKey(timestamp: number, timeZone = 'UTC') {
	const { year, month, day } = dateParts(timestamp, timeZone);
	const date = new Date(Date.UTC(year, month - 1, day));
	const daysSinceMonday = (date.getUTCDay() + 6) % 7;
	date.setUTCDate(date.getUTCDate() - daysSinceMonday);
	return date.toISOString().slice(0, 10);
}

function isCompleted(set: VolumeSet) {
	return (set.completed === true || set.status === 'completed')
		&& set.isWarmup !== true
		&& (set.rir === undefined || (Number.isFinite(set.rir) && set.rir >= 0 && set.rir <= 3));
}

export function areAllSetsCompleted(statuses: readonly ('pending' | 'completed')[]) {
	return statuses.length > 0 && statuses.every((status) => status === 'completed');
}

export function calculateMuscleVolume({
	exercises,
	sessions = [],
	period = 'session',
	now,
	weekKey,
	timeZone = 'UTC',
	rangeOverrides,
}: {
	exercises: VolumeExercise[];
	sessions?: VolumeSession[];
	period?: AnalysisPeriod;
	now?: number;
	weekKey?: string;
	timeZone?: string;
	rangeOverrides?: Partial<Record<MuscleId, MuscleRange>>;
}): MuscleVolume[] {
	const currentWeek = weekKey ?? getLocalWeekKey(now ?? Date.now(), timeZone);
	const sources = period === 'week'
		? [
			...sessions
				.filter((session) => Number.isFinite(session.completedAt) && getLocalWeekKey(session.completedAt, timeZone) === currentWeek)
				.flatMap((session) => session.exercisePerformance ?? []),
			...exercises,
		]
		: exercises;
	const totals = new Map<MuscleId, number>();

	for (const exercise of sources) {
		const exerciseId = exercise.exerciseId;
		const contributions = exerciseId ? exerciseMuscleMappings[exerciseId] : undefined;
		if (!contributions) continue;
		const eligibleSets = exercise.sets.filter(isCompleted).length;
		if (eligibleSets === 0) continue;
		for (const contribution of contributions) {
			totals.set(
				contribution.muscleId,
				(totals.get(contribution.muscleId) ?? 0) + eligibleSets * (contribution.role === 'primary' ? 1 : 0.5),
			);
		}
	}

	return muscles.map(({ id, name }) => {
		const performedSets = totals.get(id) ?? 0;
		const range = rangeFor(id, period, rangeOverrides);
		const status: MuscleStatus = performedSets === 0
			? 'no-stimulus'
			: statusForCount(performedSets, range);
		return {
			muscleId: id,
			name,
			performedSets,
			range,
			status,
		};
	});
}
