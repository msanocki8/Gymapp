import test from 'node:test';
import assert from 'node:assert/strict';

import {
	areAllSetsCompleted,
	calculateMuscleVolume,
	defaultMuscleRanges,
	defaultSessionRanges,
	exerciseMuscleMappings,
	getLocalWeekKey,
} from '../src/lib/muscle-volume.ts';

const set = (status) => ({ status });
const exercise = (exerciseId, name, statuses) => ({
	exerciseId,
	name,
	sets: statuses.map(set),
});
const resultFor = (result, muscleId) => result.find((muscle) => muscle.muscleId === muscleId);
const calculateForCount = (exerciseId, name, muscleId, count, options = {}) => resultFor(
	calculateMuscleVolume({
		exercises: [exercise(exerciseId, name, Array(count).fill('completed'))],
		period: 'week',
		...options,
	}),
	muscleId,
);
const calculateSessionForCount = (exerciseId, name, muscleId, count) => resultFor(
	calculateMuscleVolume({
		exercises: [exercise(exerciseId, name, Array(count).fill('completed'))],
		period: 'session',
	}),
	muscleId,
);

test('an exercise is complete only when every remaining planned set is explicitly completed', () => {
	assert.equal(areAllSetsCompleted([]), false);
	assert.equal(areAllSetsCompleted(['completed', 'completed']), true);
	assert.equal(areAllSetsCompleted(['completed', 'pending']), false);
	assert.equal(areAllSetsCompleted(['completed', undefined]), false);
	assert.equal(areAllSetsCompleted(['completed']), true);
});

test('planned sets do not count as muscle stimulus', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', ['pending', 'pending'])],
	});
	assert.equal(resultFor(result, 'chest').performedSets, 0);
	assert.equal(resultFor(result, 'chest').status, 'no-stimulus');
	assert.equal(resultFor(result, 'triceps').status, 'no-stimulus');
});

test('primary muscles receive full sets and secondary muscles receive half sets', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed', 'pending'])],
	});
	assert.equal(resultFor(result, 'chest').performedSets, 2);
	assert.equal(resultFor(result, 'chest').status, 'below');
	assert.equal(resultFor(result, 'triceps').performedSets, 1);
	assert.equal(resultFor(result, 'triceps').hasAuxiliaryStimulus, true);
	assert.equal(resultFor(result, 'triceps').status, 'below');
	assert.equal(resultFor(result, 'frontDelts').performedSets, 1);
});

test('secondary mappings add 0.5 for each completed set across the exercise catalog', () => {
	for (const [exerciseId, assignments] of Object.entries(exerciseMuscleMappings)) {
		for (const assignment of assignments.filter(({ role }) => role === 'secondary')) {
			const result = calculateMuscleVolume({
				exercises: [exercise(exerciseId, exerciseId, ['completed'])],
				period: 'session',
			});
			assert.equal(
				resultFor(result, assignment.muscleId).performedSets,
				0.5,
				`${exerciseId}: ${assignment.muscleId}`,
			);
		}
	}
});

test('chest weekly ranges classify requested examples and every boundary consistently', () => {
	assert.deepEqual(defaultMuscleRanges.chest, {
		preferredMin: 8,
		preferredMax: 16,
		warningFrom: 17,
	});
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 7).status, 'below');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 8).status, 'in-range');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 16).status, 'in-range');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 17).status, 'warning');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 16).status, 'in-range');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 22).status, 'warning');
});

test('back weekly ranges distinguish below, preferred, high and warning volumes', () => {
	assert.deepEqual(defaultMuscleRanges.lats, {
		preferredMin: 8,
		preferredMax: 18,
		warningFrom: 19,
	});
	assert.equal(calculateForCount('lat-pulldown', 'Ściąganie drążka', 'lats', 7).status, 'below');
	assert.equal(calculateForCount('lat-pulldown', 'Ściąganie drążka', 'lats', 8).status, 'in-range');
	assert.equal(calculateForCount('lat-pulldown', 'Ściąganie drążka', 'lats', 18).status, 'in-range');
	assert.equal(calculateForCount('lat-pulldown', 'Ściąganie drążka', 'lats', 19).status, 'warning');
	assert.equal(calculateForCount('lat-pulldown', 'Ściąganie drążka', 'lats', 22).status, 'warning');
});

test('weekly ranges for the remaining requested muscle groups have exact boundaries', () => {
	const cases = [
		['overhead-press', 'Wyciskanie nad głowę', 'frontDelts', 5, 6, 14, 15],
		['dumbbell-curl', 'Uginanie ramion', 'biceps', 5, 6, 14, 15],
		['triceps-pushdown', 'Prostowanie na wyciągu', 'triceps', 5, 6, 14, 15],
		['leg-extension', 'Prostowanie nóg', 'quads', 5, 6, 14, 15],
		['romanian-deadlift', 'Martwy ciąg rumuński', 'glutes', 5, 6, 14, 15],
		['leg-curl', 'Uginanie nóg', 'hamstrings', 4, 5, 12, 13],
		['calf-raise', 'Wspięcia na palce', 'calves', 4, 5, 12, 13],
		['crunch', 'Spięcia brzucha', 'abs', 4, 5, 12, 13],
	];
	for (const [exerciseId, name, muscleId, below, minimum, maximum, high] of cases) {
		assert.equal(calculateForCount(exerciseId, name, muscleId, below).status, 'below', `${muscleId} below range`);
		assert.equal(calculateForCount(exerciseId, name, muscleId, minimum).status, 'in-range', `${muscleId} at lower bound`);
		assert.equal(calculateForCount(exerciseId, name, muscleId, maximum).status, 'in-range', `${muscleId} at upper bound`);
		assert.equal(calculateForCount(exerciseId, name, muscleId, high).status, 'warning', `${muscleId} at high boundary`);
	}
});

test('lower weekly thresholds and per-session thresholds are configured by muscle group', () => {
	assert.deepEqual(defaultMuscleRanges.calves, {
		preferredMin: 5,
		preferredMax: 12,
		warningFrom: 13,
	});
	assert.deepEqual(defaultSessionRanges.chest, {
		preferredMin: 3,
		preferredMax: 8,
		warningFrom: 9,
	});
	assert.deepEqual(defaultSessionRanges.lats, {
		preferredMin: 4,
		preferredMax: 9,
		warningFrom: 10,
	});
	assert.equal(calculateForCount('calf-raise', 'Wspięcia na palce', 'calves', 13).status, 'warning');
});

test('session thresholds match every requested muscle group and boundary', () => {
	const cases = [
		['bench-press', 'Wyciskanie sztangi', 'chest', 3, 8, 9],
		['lat-pulldown', 'Ściąganie drążka', 'lats', 4, 9, 10],
		['overhead-press', 'Wyciskanie nad głowę', 'frontDelts', 3, 6, 7],
		['dumbbell-curl', 'Uginanie ramion', 'biceps', 3, 6, 7],
		['triceps-pushdown', 'Prostowanie na wyciągu', 'triceps', 3, 6, 7],
		['leg-extension', 'Prostowanie nóg', 'quads', 3, 8, 9],
		['leg-curl', 'Uginanie nóg', 'hamstrings', 3, 6, 7],
		['romanian-deadlift', 'Martwy ciąg rumuński', 'glutes', 3, 8, 9],
		['calf-raise', 'Wspięcia na palce', 'calves', 3, 6, 7],
		['crunch', 'Spięcia brzucha', 'abs', 3, 6, 7],
	];
	for (const [exerciseId, name, muscleId, minimum, maximum, warning] of cases) {
		assert.equal(calculateSessionForCount(exerciseId, name, muscleId, 0).status, 'no-stimulus', `${muscleId} zero sets`);
		assert.equal(calculateSessionForCount(exerciseId, name, muscleId, minimum - 1).status, 'below', `${muscleId} below range`);
		assert.equal(calculateSessionForCount(exerciseId, name, muscleId, minimum).status, 'in-range', `${muscleId} lower bound`);
		assert.equal(calculateSessionForCount(exerciseId, name, muscleId, maximum).status, 'in-range', `${muscleId} upper bound`);
		assert.equal(calculateSessionForCount(exerciseId, name, muscleId, warning).status, 'warning', `${muscleId} warning boundary`);
	}
});

test('each primary assignment receives whole sets without fractional multipliers', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('barbell-row', 'Wiosłowanie sztangą', ['completed', 'completed'])],
	});
	assert.equal(resultFor(result, 'lats').performedSets, 2);
	assert.equal(resultFor(result, 'upperBack').performedSets, 2);
	assert.equal(resultFor(result, 'lats').performedSets % 1, 0);
});

test('recalculation after a set is unchecked or an exercise is removed updates counts', () => {
	const original = exercise('bench-press', 'Wyciskanie sztangi', Array(6).fill('completed'));
	const edited = exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed', 'pending', 'pending', 'pending', 'pending']);
	const first = calculateMuscleVolume({ exercises: [original], period: 'session' });
	const second = calculateMuscleVolume({ exercises: [edited], period: 'session' });
	const removed = calculateMuscleVolume({ exercises: [], period: 'session' });
	assert.equal(resultFor(first, 'chest').performedSets, 6);
	assert.equal(resultFor(first, 'chest').status, 'in-range');
	assert.equal(resultFor(second, 'chest').performedSets, 2);
	assert.equal(resultFor(second, 'chest').status, 'below');
	assert.equal(resultFor(removed, 'chest').performedSets, 0);
	assert.equal(resultFor(removed, 'chest').status, 'no-stimulus');
});

test('configured preferred ranges classify all values without gaps or overlaps', () => {
	const rangeOverrides = { chest: { preferredMin: 2, preferredMax: 4, warningFrom: 6 } };
	const resultForCount = (count) => calculateForCount(
		'bench-press',
		'Wyciskanie sztangi',
		'chest',
		count,
		{ rangeOverrides },
	);
	assert.equal(resultForCount(0).status, 'no-stimulus');
	assert.equal(resultForCount(1).status, 'below');
	assert.equal(resultForCount(2).status, 'in-range');
	assert.equal(resultForCount(4).status, 'in-range');
	assert.equal(resultForCount(5).status, 'in-range');
	assert.equal(resultForCount(6).status, 'warning');
	assert.equal(resultForCount(7).status, 'warning');
});

test('session status and ranges are separate from weekly status when no history exists', () => {
	const currentSession = exercise('bench-press', 'Wyciskanie sztangi', Array(6).fill('completed'));
	const session = calculateMuscleVolume({ exercises: [currentSession], period: 'session' });
	const week = calculateMuscleVolume({ exercises: [currentSession], period: 'week' });
	assert.equal(resultFor(session, 'chest').performedSets, 6);
	assert.equal(resultFor(session, 'chest').status, 'in-range');
	assert.deepEqual(resultFor(session, 'chest').range, defaultSessionRanges.chest);
	assert.equal(resultFor(week, 'chest').performedSets, 6);
	assert.equal(resultFor(week, 'chest').status, 'below');
	assert.deepEqual(resultFor(week, 'chest').range, {
		preferredMin: 8,
		preferredMax: 16,
		warningFrom: 17,
	});
});

test('weekly analysis includes the current session and saved sessions from the local week only', () => {
	const currentSession = exercise('bench-press', 'Wyciskanie sztangi', ['completed']);
	const sameWeek = {
		completedAt: Date.parse('2026-10-19T08:00:00Z'),
		exercisePerformance: [exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed', 'completed'])],
	};
	const previousWeek = {
		completedAt: Date.parse('2026-10-18T20:00:00Z'),
		exercisePerformance: [exercise('bench-press', 'Wyciskanie sztangi', Array(3).fill('completed'))],
	};
	const sessionResult = calculateMuscleVolume({ exercises: [currentSession] });
	const weekResult = calculateMuscleVolume({
		exercises: [currentSession],
		sessions: [sameWeek, previousWeek],
		period: 'week',
		now: Date.parse('2026-10-21T12:00:00Z'),
		timeZone: 'Europe/Warsaw',
	});
	assert.equal(resultFor(sessionResult, 'chest').performedSets, 1);
	assert.equal(resultFor(sessionResult, 'chest').status, 'below');
	assert.equal(resultFor(weekResult, 'chest').performedSets, 4);
	assert.equal(resultFor(weekResult, 'chest').status, 'below');
	assert.equal(getLocalWeekKey(Date.parse('2026-10-18T20:00:00Z'), 'Europe/Warsaw'), '2026-10-12');
});

test('session analysis counts auxiliary sets and empty analysis has no stimulus', () => {
	const session = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', ['completed'])],
		period: 'session',
	});
	assert.equal(resultFor(session, 'triceps').performedSets, 0.5);
	assert.equal(resultFor(session, 'triceps').hasAuxiliaryStimulus, true);
	assert.equal(resultFor(session, 'triceps').status, 'below');
	const empty = calculateMuscleVolume({ exercises: [], period: 'session' });
	assert.ok(empty.every((muscle) => muscle.status === 'no-stimulus' && muscle.performedSets === 0));
});

test('unknown exercise mappings are ignored without throwing', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('custom-unknown', 'Własne ćwiczenie', ['completed'])],
	});
	assert.ok(result.every((muscle) => muscle.performedSets === 0 && !muscle.hasAuxiliaryStimulus));
});
