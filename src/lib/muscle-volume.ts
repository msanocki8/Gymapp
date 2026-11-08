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
	hasAuxiliaryStimulus: boolean;
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
	'lat-pulldown': mapping(['lats'], ['biceps', 'rearDelts', 'forearms']),
	'barbell-row': mapping(['lats', 'upperBack'], ['rearDelts', 'biceps', 'forearms', 'lowerBack']),
	'seated-cable-row': mapping(['lats', 'upperBack'], ['rearDelts', 'biceps', 'forearms']),
	'barbell-squat': mapping(['quads', 'glutes'], ['hamstrings', 'lowerBack', 'abs', 'adductors']),
	'romanian-deadlift': mapping(['hamstrings', 'glutes'], ['lowerBack', 'forearms']),
	'deadlift': mapping(['glutes', 'hamstrings', 'lowerBack'], ['traps', 'forearms', 'quads']),
	'lateral-raise': mapping(['lateralDelts'], ['traps']),
	'cable-lateral-raise': mapping(['lateralDelts'], ['traps']),
	'overhead-press': mapping(['frontDelts', 'lateralDelts'], ['triceps', 'abs']),
	'dumbbell-curl': mapping(['biceps'], ['forearms']),
	'barbell-curl': mapping(['biceps'], ['forearms']),
	'incline-dumbbell-curl': mapping(['biceps'], ['forearms']),
	'preacher-curl': mapping(['biceps'], ['forearms']),
	'cable-hammer-curl': mapping(['biceps', 'forearms']),
	'triceps-pushdown': mapping(['triceps'], ['forearms']),
	'cable-overhead-triceps-extension': mapping(['triceps']),
	'pull-up': mapping(['lats'], ['biceps', 'rearDelts', 'forearms']),
	'leg-press': mapping(['quads'], ['glutes', 'adductors']),
	'leg-extension': mapping(['quads']),
	'leg-curl': mapping(['hamstrings'], ['calves']),
	'seated-leg-curl': mapping(['hamstrings'], ['calves']),
	'calf-raise': mapping(['calves']),
	'face-pull': mapping(['rearDelts', 'upperBack'], ['traps']),
	'reverse-pec-deck': mapping(['rearDelts'], ['traps', 'upperBack']),
	'dips': mapping(['triceps'], ['chest', 'frontDelts']),
	'crunch': mapping(['abs'], ['obliques']),
	'cable-crunch': mapping(['abs'], ['obliques']),
	'plank': mapping(['abs'], ['obliques', 'glutes']),
	'hanging-leg-raise': mapping(['abs'], ['obliques']),
};

const weeklyRanges: Record<MuscleId, MuscleRange> = {
	chest: { preferredMin: 8, preferredMax: 16, warningFrom: 17 },
	upperChest: { preferredMin: 8, preferredMax: 16, warningFrom: 17 },
	lats: { preferredMin: 8, preferredMax: 18, warningFrom: 19 },
	upperBack: { preferredMin: 8, preferredMax: 18, warningFrom: 19 },
	traps: { preferredMin: 8, preferredMax: 18, warningFrom: 19 },
	lowerBack: { preferredMin: 8, preferredMax: 18, warningFrom: 19 },
	frontDelts: { preferredMin: 6, preferredMax: 14, warningFrom: 15 },
	lateralDelts: { preferredMin: 6, preferredMax: 14, warningFrom: 15 },
	rearDelts: { preferredMin: 6, preferredMax: 14, warningFrom: 15 },
	biceps: { preferredMin: 6, preferredMax: 14, warningFrom: 15 },
	triceps: { preferredMin: 6, preferredMax: 14, warningFrom: 15 },
	forearms: { preferredMin: 5, preferredMax: 12, warningFrom: 13 },
	quads: { preferredMin: 6, preferredMax: 14, warningFrom: 15 },
	hamstrings: { preferredMin: 5, preferredMax: 12, warningFrom: 13 },
	glutes: { preferredMin: 6, preferredMax: 14, warningFrom: 15 },
	adductors: { preferredMin: 5, preferredMax: 12, warningFrom: 13 },
	calves: { preferredMin: 5, preferredMax: 12, warningFrom: 13 },
	abs: { preferredMin: 5, preferredMax: 12, warningFrom: 13 },
	obliques: { preferredMin: 5, preferredMax: 12, warningFrom: 13 },
};

const sessionRanges: Record<MuscleId, MuscleRange> = {
	chest: { preferredMin: 3, preferredMax: 8, warningFrom: 9 },
	upperChest: { preferredMin: 3, preferredMax: 8, warningFrom: 9 },
	lats: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	upperBack: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	traps: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	lowerBack: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	frontDelts: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	lateralDelts: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	rearDelts: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	biceps: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	triceps: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	forearms: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	quads: { preferredMin: 3, preferredMax: 8, warningFrom: 9 },
	hamstrings: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	glutes: { preferredMin: 3, preferredMax: 8, warningFrom: 9 },
	adductors: { preferredMin: 3, preferredMax: 5, warningFrom: 6 },
	calves: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	abs: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
	obliques: { preferredMin: 3, preferredMax: 6, warningFrom: 7 },
};

export const defaultMuscleRanges = weeklyRanges;
export const defaultSessionRanges = sessionRanges;

function rangeFor(
	muscleId: MuscleId,
	period: AnalysisPeriod,
	overrides?: Partial<Record<MuscleId, MuscleRange>>,
): MuscleRange {
	return overrides?.[muscleId] ?? (period === 'session' ? sessionRanges : weeklyRanges)[muscleId] ?? {
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
	return set.completed === true || set.status === 'completed';
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
	const totals = new Map<MuscleId, { performedSets: number; hasAuxiliaryStimulus: boolean }>();

	for (const exercise of sources) {
		const exerciseId = exercise.exerciseId;
		const contributions = exerciseId ? exerciseMuscleMappings[exerciseId] : undefined;
		if (!contributions) continue;
		const completedSets = exercise.sets.filter(isCompleted).length;
		if (completedSets === 0) continue;
		for (const contribution of contributions) {
			const current = totals.get(contribution.muscleId) ?? {
				performedSets: 0,
				hasAuxiliaryStimulus: false,
			};
			if (contribution.role === 'primary') current.performedSets += completedSets;
			else {
				current.performedSets += completedSets * 0.5;
				current.hasAuxiliaryStimulus = true;
			}
			totals.set(contribution.muscleId, current);
		}
	}

	return muscles.map(({ id, name }) => {
		const { performedSets, hasAuxiliaryStimulus } = totals.get(id) ?? {
			performedSets: 0,
			hasAuxiliaryStimulus: false,
		};
		const range = rangeFor(id, period, rangeOverrides);
		const status: MuscleStatus = performedSets === 0
			? 'no-stimulus'
			: statusForCount(performedSets, range);
		return {
			muscleId: id,
			name,
			performedSets,
			hasAuxiliaryStimulus,
			range,
			status,
		};
	});
}
