import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
	areAllSetsCompleted,
	calculateMuscleVolume,
	defaultMuscleRanges,
	defaultSessionRanges,
	exerciseMuscleMappings,
	getLocalWeekKey,
} from '../src/lib/muscle-volume.ts';
import { muscleVolumeColors } from '../src/constants/muscle-volume.ts';

const exercise = (exerciseId, name, sets) => ({
	exerciseId,
	name,
	sets: sets.map((set) => typeof set === 'string' ? { status: set } : set),
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

test('an exercise is complete only when every remaining planned set is explicitly completed', () => {
	assert.equal(areAllSetsCompleted([]), false);
	assert.equal(areAllSetsCompleted(['completed', 'completed']), true);
	assert.equal(areAllSetsCompleted(['completed', 'pending']), false);
	assert.equal(areAllSetsCompleted(['completed', undefined]), false);
});

test('primary muscles receive 1.0 and secondary muscles 0.5 per completed set', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed', 'pending'])],
	});
	assert.equal(resultFor(result, 'chest').performedSets, 2);
	assert.equal(resultFor(result, 'triceps').performedSets, 1);
	assert.equal(resultFor(result, 'frontDelts').performedSets, 1);
	assert.equal(resultFor(result, 'triceps').status, 'below');
});

test('bench press gives chest 3, triceps 1.5 and front delts 1.5 for three sets', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', Array(3).fill('completed'))],
	});
	assert.equal(resultFor(result, 'chest').performedSets, 3);
	assert.equal(resultFor(result, 'triceps').performedSets, 1.5);
	assert.equal(resultFor(result, 'frontDelts').performedSets, 1.5);
});

test('PUSH A example sums triceps volume to eight weighted sets', () => {
	const result = calculateMuscleVolume({
		exercises: [
			exercise('bench-press', 'Wyciskanie sztangi', Array(3).fill('completed')),
			exercise('incline-dumbbell-press', 'Wyciskanie hantli skos', Array(3).fill('completed')),
			exercise('triceps-pushdown', 'Prostowanie na wyciągu', Array(3).fill('completed')),
			exercise('cable-overhead-triceps-extension', 'Prostowanie nad głową', Array(2).fill('completed')),
		],
		period: 'session',
	});
	assert.equal(resultFor(result, 'triceps').performedSets, 8);
});

test('warm-ups and sets outside RIR 0-3 do not count when set metadata is available', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', [
			{ status: 'completed', rir: 3 },
			{ status: 'completed', rir: 0, isWarmup: true },
			{ status: 'completed', rir: 4 },
			{ status: 'pending', rir: 1 },
		])],
	});
	assert.equal(resultFor(result, 'chest').performedSets, 1);
	assert.equal(resultFor(result, 'triceps').performedSets, 0.5);
});

test('legacy completed sets without RIR or warm-up metadata remain countable', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', ['completed'])],
	});
	assert.equal(resultFor(result, 'chest').performedSets, 1);
});

test('weekly thresholds classify chest and lats at the requested boundaries', () => {
	assert.deepEqual(defaultMuscleRanges.chest, {
		preferredMin: 10,
		preferredMax: 17,
		warningFrom: 18,
	});
	assert.deepEqual(defaultMuscleRanges.lats, {
		preferredMin: 10,
		preferredMax: 19,
		warningFrom: 20,
	});
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 9).status, 'below');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 10).status, 'in-range');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 17).status, 'in-range');
	assert.equal(calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 18).status, 'warning');
});

test('nineteen weekly chest sets are red', () => {
	const result = calculateForCount('bench-press', 'Wyciskanie sztangi', 'chest', 19);
	assert.equal(result.performedSets, 19);
	assert.equal(result.status, 'warning');
});

test('session thresholds use the updated chest and triceps boundaries', () => {
	assert.deepEqual(defaultSessionRanges.chest, {
		preferredMin: 4,
		preferredMax: 9,
		warningFrom: 10,
	});
	assert.deepEqual(defaultSessionRanges.triceps, {
		preferredMin: 3,
		preferredMax: 7,
		warningFrom: 8,
	});
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', Array(4).fill('completed'))],
		period: 'session',
	});
	assert.equal(resultFor(result, 'triceps').performedSets, 2);
	assert.equal(resultFor(result, 'triceps').status, 'below');
});

test('all requested threshold groups use their specified weekly and session ranges', () => {
	const expected = {
		chest: [10, 17, 18, 4, 9, 10],
		lats: [10, 19, 20, 4, 9, 10],
		quads: [10, 21, 22, 4, 11, 12],
		glutes: [8, 17, 18, 4, 9, 10],
		lateralDelts: [8, 17, 18, 3, 7, 8],
		rearDelts: [6, 13, 14, 2, 5, 6],
		biceps: [8, 17, 18, 3, 7, 8],
		triceps: [8, 17, 18, 3, 7, 8],
		calves: [6, 15, 16, 3, 7, 8],
		abs: [4, 13, 14, 3, 7, 8],
	};
	for (const [muscleId, [weeklyMin, weeklyMax, weeklyRed, sessionMin, sessionMax, sessionRed]] of Object.entries(expected)) {
		assert.deepEqual(defaultMuscleRanges[muscleId], {
			preferredMin: weeklyMin,
			preferredMax: weeklyMax,
			warningFrom: weeklyRed,
		});
		assert.deepEqual(defaultSessionRanges[muscleId], {
			preferredMin: sessionMin,
			preferredMax: sessionMax,
			warningFrom: sessionRed,
		});
	}
});

test('zero stimulus remains distinct from low positive volume and is gray', () => {
	const result = calculateMuscleVolume({ exercises: [], period: 'session' });
	assert.equal(resultFor(result, 'chest').status, 'no-stimulus');
	assert.notEqual(muscleVolumeColors['no-stimulus'], muscleVolumeColors.below);
	assert.equal(muscleVolumeColors['no-stimulus'], '#6B7A72');
});

test('session chest thresholds classify three sets blue and five sets green', () => {
	const below = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', Array(3).fill('completed'))],
		period: 'session',
	});
	const inRange = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', Array(5).fill('completed'))],
		period: 'session',
	});
	assert.equal(resultFor(below, 'chest').status, 'below');
	assert.equal(resultFor(inRange, 'chest').status, 'in-range');
});

test('session triceps with eight weighted sets is red', () => {
	const result = calculateMuscleVolume({
		exercises: [
			exercise('bench-press', 'Wyciskanie sztangi', Array(3).fill('completed')),
			exercise('incline-dumbbell-press', 'Wyciskanie hantli skos', Array(3).fill('completed')),
			exercise('triceps-pushdown', 'Prostowanie na wyciągu', Array(3).fill('completed')),
			exercise('cable-overhead-triceps-extension', 'Prostowanie nad głową', Array(2).fill('completed')),
		],
		period: 'session',
	});
	assert.equal(resultFor(result, 'triceps').performedSets, 8);
	assert.equal(resultFor(result, 'triceps').status, 'warning');
});

test('row muscles use primary and secondary weights; stabilizers are omitted', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('chest-supported-row', 'Wiosłowanie z podparciem klatki', ['completed', 'completed'])],
	});
	assert.equal(resultFor(result, 'lats').performedSets, 2);
	assert.equal(resultFor(result, 'upperBack').performedSets, 2);
	assert.equal(resultFor(result, 'traps').performedSets, 1);
	assert.equal(resultFor(result, 'rearDelts').performedSets, 1);
	assert.equal(resultFor(result, 'biceps').performedSets, 1);
	assert.equal(resultFor(result, 'forearms').performedSets, 0);
});

test('each exercise in the library has an explicit muscle-volume mapping', () => {
	const source = readFileSync(new URL('../src/constants/exercise-library.ts', import.meta.url), 'utf8');
	const libraryIds = [...source.matchAll(/\bid: '([^']+)'/g)].map((match) => match[1]);
	assert.ok(libraryIds.length > 0);
	for (const exerciseId of libraryIds) {
		assert.ok(exerciseMuscleMappings[exerciseId], `Missing muscle mapping for ${exerciseId}`);
	}
});

test('a set with no meaningful pec-deck front-delt involvement is excluded', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('pec-deck-fly', 'Rozpiętki na maszynie pec deck', ['completed'])],
	});
	assert.equal(resultFor(result, 'chest').performedSets, 1);
	assert.equal(resultFor(result, 'frontDelts').performedSets, 0);
});

test('weekly analysis includes current and same-week saved sessions only', () => {
	const currentSession = exercise('bench-press', 'Wyciskanie sztangi', ['completed']);
	const sameWeek = {
		completedAt: Date.parse('2026-10-19T08:00:00Z'),
		exercisePerformance: [exercise('bench-press', 'Wyciskanie sztangi', Array(3).fill('completed'))],
	};
	const previousWeek = {
		completedAt: Date.parse('2026-10-18T20:00:00Z'),
		exercisePerformance: [exercise('bench-press', 'Wyciskanie sztangi', Array(3).fill('completed'))],
	};
	const result = calculateMuscleVolume({
		exercises: [currentSession],
		sessions: [sameWeek, previousWeek],
		period: 'week',
		now: Date.parse('2026-10-21T12:00:00Z'),
		timeZone: 'Europe/Warsaw',
	});
	assert.equal(resultFor(result, 'chest').performedSets, 4);
	assert.equal(resultFor(result, 'triceps').performedSets, 2);
	assert.equal(getLocalWeekKey(Date.parse('2026-10-18T20:00:00Z'), 'Europe/Warsaw'), '2026-10-12');
});

test('unknown exercise mappings are ignored without throwing', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('custom-unknown', 'Własne ćwiczenie', ['completed'])],
	});
	assert.ok(result.every((muscle) => muscle.performedSets === 0));
});
