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

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type AnalysisPeriod = 'session' | 'week';
export type MuscleRole = 'primary' | 'secondary';
export type MuscleStatus = 'no-stimulus' | 'below' | 'in-range' | 'above-preferred' | 'warning';

export type ExerciseMuscleContribution = {
	muscleId: MuscleId;
	role: MuscleRole;
	factor: number;
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
	minimum: number;
	preferredMin: number;
	preferredMax: number;
	warningAbove: number;
};

export type MuscleVolume = {
	muscleId: MuscleId;
	name: string;
	effectiveSets: number;
	directSets: number;
	indirectSets: number;
	range: MuscleRange;
	status: MuscleStatus;
	lowerGoalProgress: number;
	exerciseContributions: {
		exerciseId: string;
		exerciseName: string;
		directSets: number;
		indirectSets: number;
		effectiveSets: number;
	}[];
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
	primary: Partial<Record<MuscleId, number>>,
	secondary: Partial<Record<MuscleId, number>> = {},
): ExerciseMuscleContribution[] {
	return [
		...Object.entries(primary).map(([muscleId, factor]) => ({
			muscleId: muscleId as MuscleId,
			role: 'primary' as const,
			factor: factor ?? 1,
		})),
		...Object.entries(secondary).map(([muscleId, factor]) => ({
			muscleId: muscleId as MuscleId,
			role: 'secondary' as const,
			factor: factor ?? 0,
		})),
	];
}

export const exerciseMuscleMappings: Readonly<Record<string, ExerciseMuscleContribution[]>> = {
	'bench-press': mapping({ chest: 1 }, { triceps: 0.5, frontDelts: 0.4 }),
	'incline-dumbbell-press': mapping({ upperChest: 1 }, { chest: 0.25, triceps: 0.45, frontDelts: 0.6 }),
	'incline-smith-press': mapping({ upperChest: 1 }, { chest: 0.25, triceps: 0.45, frontDelts: 0.6 }),
	'flat-dumbbell-press': mapping({ chest: 1 }, { triceps: 0.5, frontDelts: 0.4 }),
	'lat-pulldown': mapping({ lats: 1 }, { biceps: 0.5, rearDelts: 0.2, forearms: 0.2 }),
	'barbell-row': mapping({ lats: 0.7, upperBack: 0.8 }, { rearDelts: 0.45, biceps: 0.45, forearms: 0.25, lowerBack: 0.2 }),
	'seated-cable-row': mapping({ lats: 0.65, upperBack: 0.8 }, { rearDelts: 0.45, biceps: 0.45, forearms: 0.2 }),
	'barbell-squat': mapping({ quads: 1, glutes: 0.7 }, { hamstrings: 0.25, lowerBack: 0.25, abs: 0.2, adductors: 0.3 }),
	'romanian-deadlift': mapping({ hamstrings: 1, glutes: 0.8 }, { lowerBack: 0.45, forearms: 0.2 }),
	'deadlift': mapping({ glutes: 0.8, hamstrings: 0.7, lowerBack: 0.7 }, { traps: 0.35, forearms: 0.3, quads: 0.25 }),
	'lateral-raise': mapping({ lateralDelts: 1 }, { traps: 0.2 }),
	'cable-lateral-raise': mapping({ lateralDelts: 1 }, { traps: 0.2 }),
	'overhead-press': mapping({ frontDelts: 0.8, lateralDelts: 0.55 }, { triceps: 0.5, abs: 0.2 }),
	'dumbbell-curl': mapping({ biceps: 1 }, { forearms: 0.25 }),
	'barbell-curl': mapping({ biceps: 1 }, { forearms: 0.3 }),
	'incline-dumbbell-curl': mapping({ biceps: 1 }, { forearms: 0.2 }),
	'preacher-curl': mapping({ biceps: 1 }, { forearms: 0.15 }),
	'cable-hammer-curl': mapping({ biceps: 0.55, forearms: 0.55 }),
	'triceps-pushdown': mapping({ triceps: 1 }, { forearms: 0.15 }),
	'cable-overhead-triceps-extension': mapping({ triceps: 1 }),
	'pull-up': mapping({ lats: 1 }, { biceps: 0.55, rearDelts: 0.2, forearms: 0.3 }),
	'leg-press': mapping({ quads: 1 }, { glutes: 0.4, adductors: 0.2 }),
	'leg-extension': mapping({ quads: 1 }),
	'leg-curl': mapping({ hamstrings: 1 }, { calves: 0.15 }),
	'seated-leg-curl': mapping({ hamstrings: 1 }, { calves: 0.1 }),
	'calf-raise': mapping({ calves: 1 }),
	'face-pull': mapping({ rearDelts: 0.8, upperBack: 0.5 }, { traps: 0.35 }),
	'reverse-pec-deck': mapping({ rearDelts: 1 }, { traps: 0.25, upperBack: 0.2 }),
	'dips': mapping({ triceps: 0.8 }, { chest: 0.55, frontDelts: 0.35 }),
	'crunch': mapping({ abs: 1 }, { obliques: 0.25 }),
	'cable-crunch': mapping({ abs: 1 }, { obliques: 0.25 }),
	'plank': mapping({ abs: 0.6 }, { obliques: 0.4, glutes: 0.15 }),
	'hanging-leg-raise': mapping({ abs: 0.8 }, { obliques: 0.25 }),
};

const weeklyRanges: Record<ExperienceLevel, Partial<Record<MuscleId, MuscleRange>>> = {
	beginner: {
		chest: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		upperChest: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		lats: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		upperBack: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		traps: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		lowerBack: { minimum: 2, preferredMin: 4, preferredMax: 6, warningAbove: 10 },
		frontDelts: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		lateralDelts: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		rearDelts: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		biceps: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		triceps: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		forearms: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		quads: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		hamstrings: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		glutes: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		adductors: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		calves: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		abs: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		obliques: { minimum: 2, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
	},
	intermediate: {
		chest: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		upperChest: { minimum: 3, preferredMin: 5, preferredMax: 10, warningAbove: 15 },
		lats: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		upperBack: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		traps: { minimum: 3, preferredMin: 5, preferredMax: 10, warningAbove: 15 },
		lowerBack: { minimum: 3, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		frontDelts: { minimum: 3, preferredMin: 4, preferredMax: 8, warningAbove: 12 },
		lateralDelts: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 16 },
		rearDelts: { minimum: 4, preferredMin: 6, preferredMax: 10, warningAbove: 14 },
		biceps: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		triceps: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		forearms: { minimum: 3, preferredMin: 5, preferredMax: 10, warningAbove: 14 },
		quads: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		hamstrings: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		glutes: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 16 },
		adductors: { minimum: 3, preferredMin: 5, preferredMax: 10, warningAbove: 14 },
		calves: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 18 },
		abs: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 16 },
		obliques: { minimum: 3, preferredMin: 5, preferredMax: 10, warningAbove: 14 },
	},
	advanced: {
		chest: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		upperChest: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 18 },
		lats: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		upperBack: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		traps: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 18 },
		lowerBack: { minimum: 3, preferredMin: 5, preferredMax: 9, warningAbove: 14 },
		frontDelts: { minimum: 3, preferredMin: 5, preferredMax: 9, warningAbove: 14 },
		lateralDelts: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 20 },
		rearDelts: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 20 },
		biceps: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		triceps: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		forearms: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 18 },
		quads: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		hamstrings: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		glutes: { minimum: 6, preferredMin: 8, preferredMax: 14, warningAbove: 20 },
		adductors: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 18 },
		calves: { minimum: 8, preferredMin: 10, preferredMax: 16, warningAbove: 22 },
		abs: { minimum: 4, preferredMin: 6, preferredMax: 12, warningAbove: 18 },
		obliques: { minimum: 3, preferredMin: 5, preferredMax: 10, warningAbove: 15 },
	},
};

export const defaultMuscleRanges = weeklyRanges;

const sessionRangeDivisor: Record<MuscleId, number> = {
	chest: 2, upperChest: 2, lats: 2, upperBack: 2, traps: 2, lowerBack: 2,
	frontDelts: 2, lateralDelts: 2, rearDelts: 2, biceps: 2, triceps: 2,
	forearms: 2, quads: 2, hamstrings: 2, glutes: 2, adductors: 2, calves: 2,
	abs: 2, obliques: 2,
};

function rangeFor(
	muscleId: MuscleId,
	level: ExperienceLevel,
	period: AnalysisPeriod,
	overrides?: Partial<Record<MuscleId, MuscleRange>>,
): MuscleRange {
	const range = overrides?.[muscleId] ?? weeklyRanges[level][muscleId] ?? {
		minimum: 0, preferredMin: 0, preferredMax: 0, warningAbove: 0,
	};
	if (period === 'week') return range;
	const divisor = sessionRangeDivisor[muscleId];
	return {
		minimum: range.minimum / divisor,
		preferredMin: range.preferredMin / divisor,
		preferredMax: range.preferredMax / divisor,
		warningAbove: range.warningAbove / divisor,
	};
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

export function calculateMuscleVolume({
	exercises,
	sessions = [],
	period = 'session',
	now,
	weekKey,
	timeZone = 'UTC',
	level = 'beginner',
	rangeOverrides,
}: {
	exercises: VolumeExercise[];
	sessions?: VolumeSession[];
	period?: AnalysisPeriod;
	now?: number;
	weekKey?: string;
	timeZone?: string;
	level?: ExperienceLevel;
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
	const totals = new Map<MuscleId, Map<string, { name: string; direct: number; indirect: number }>>();

	for (const exercise of sources) {
		const exerciseId = exercise.exerciseId;
		const contributions = exerciseId ? exerciseMuscleMappings[exerciseId] : undefined;
		if (!contributions) continue;
		const completedSets = exercise.sets.filter(isCompleted).length;
		if (completedSets === 0) continue;
		for (const contribution of contributions) {
			if (!Number.isFinite(contribution.factor) || contribution.factor <= 0) continue;
			const byExercise = totals.get(contribution.muscleId) ?? new Map();
			const current = byExercise.get(exerciseId) ?? { name: exercise.name, direct: 0, indirect: 0 };
			const weightedSets = completedSets * contribution.factor;
			if (contribution.role === 'primary') current.direct += weightedSets;
			else current.indirect += weightedSets;
			byExercise.set(exerciseId, current);
			totals.set(contribution.muscleId, byExercise);
		}
	}

	return muscles.map(({ id, name }) => {
		const contributions = [...(totals.get(id)?.entries() ?? [])].map(([exerciseId, value]) => ({
			exerciseId,
			exerciseName: value.name,
			directSets: value.direct,
			indirectSets: value.indirect,
			effectiveSets: value.direct + value.indirect,
		}));
		const directSets = contributions.reduce((sum, contribution) => sum + contribution.directSets, 0);
		const indirectSets = contributions.reduce((sum, contribution) => sum + contribution.indirectSets, 0);
		const effectiveSets = directSets + indirectSets;
		const range = rangeFor(id, level, period, rangeOverrides);
		const status: MuscleStatus = effectiveSets === 0
			? 'no-stimulus'
			: effectiveSets < range.minimum
				? 'below'
				: effectiveSets <= range.preferredMax
					? 'in-range'
					: effectiveSets <= range.warningAbove
						? 'above-preferred'
						: 'warning';
		return {
			muscleId: id,
			name,
			effectiveSets,
			directSets,
			indirectSets,
			range,
			status,
			lowerGoalProgress: range.minimum === 0 ? 0 : Math.min(100, (effectiveSets / range.minimum) * 100),
			exerciseContributions: contributions,
		};
	});
}
