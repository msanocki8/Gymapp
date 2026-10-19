import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMuscleVolume, getLocalWeekKey } from '../src/lib/muscle-volume.ts';

const set = (status) => ({ status });
const exercise = (exerciseId, name, statuses) => ({
	exerciseId,
	name,
	sets: statuses.map(set),
});
const resultFor = (result, muscleId) => result.find((muscle) => muscle.muscleId === muscleId);

test('planned sets do not add volume; an empty session is zero', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', ['pending', 'pending'])],
	});
	assert.equal(resultFor(result, 'chest').effectiveSets, 0);
	assert.equal(resultFor(result, 'chest').status, 'no-stimulus');
});

test('completed sets use direct and weighted indirect mappings', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed', 'pending'])],
	});
	assert.equal(resultFor(result, 'chest').directSets, 2);
	assert.equal(resultFor(result, 'triceps').indirectSets, 1);
	assert.equal(resultFor(result, 'frontDelts').indirectSets, 0.8);
});

test('recalculation after an edit or removal never double counts sets', () => {
	const original = exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed']);
	const edited = exercise('bench-press', 'Wyciskanie sztangi', ['completed']);
	const first = calculateMuscleVolume({ exercises: [original] });
	const second = calculateMuscleVolume({ exercises: [edited] });
	const removed = calculateMuscleVolume({ exercises: [] });
	assert.equal(resultFor(first, 'chest').effectiveSets, 2);
	assert.equal(resultFor(second, 'chest').effectiveSets, 1);
	assert.equal(resultFor(removed, 'chest').effectiveSets, 0);
});

test('contributions from multiple exercises sum and retain per-exercise details', () => {
	const result = calculateMuscleVolume({
		exercises: [
			exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed']),
			exercise('flat-dumbbell-press', 'Wyciskanie hantli', ['completed']),
		],
	});
	const chest = resultFor(result, 'chest');
	assert.equal(chest.effectiveSets, 3);
	assert.equal(chest.exerciseContributions.length, 2);
});

test('configured thresholds distinguish below, preferred, excess and warning', () => {
	const rangeOverrides = { chest: { minimum: 2, preferredMin: 3, preferredMax: 4, warningAbove: 6 } };
	const volumeFor = (count) => resultFor(calculateMuscleVolume({
		exercises: [exercise('bench-press', 'Wyciskanie sztangi', Array(count).fill('completed'))],
		period: 'week',
		rangeOverrides,
	}), 'chest').status;
	assert.equal(volumeFor(0), 'no-stimulus');
	assert.equal(volumeFor(1), 'below');
	assert.equal(volumeFor(4), 'in-range');
	assert.equal(volumeFor(5), 'above-preferred');
	assert.equal(volumeFor(7), 'warning');
});

test('weekly analysis adds current session and only history from the local Monday week', () => {
	const currentSession = exercise('bench-press', 'Wyciskanie sztangi', ['completed']);
	const sameWeek = {
		completedAt: Date.parse('2026-10-19T08:00:00Z'),
		exercisePerformance: [exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed'])],
	};
	const previousWeek = {
		completedAt: Date.parse('2026-10-18T20:00:00Z'),
		exercisePerformance: [exercise('bench-press', 'Wyciskanie sztangi', ['completed', 'completed', 'completed'])],
	};
	const sessionResult = calculateMuscleVolume({ exercises: [currentSession] });
	const weekResult = calculateMuscleVolume({
		exercises: [currentSession],
		sessions: [sameWeek, previousWeek],
		period: 'week',
		now: Date.parse('2026-10-21T12:00:00Z'),
		timeZone: 'Europe/Warsaw',
	});
	assert.equal(resultFor(sessionResult, 'chest').effectiveSets, 1);
	assert.equal(resultFor(weekResult, 'chest').effectiveSets, 3);
	assert.equal(getLocalWeekKey(Date.parse('2026-10-18T20:00:00Z'), 'Europe/Warsaw'), '2026-10-12');
});

test('unknown exercise mappings are ignored without throwing', () => {
	const result = calculateMuscleVolume({
		exercises: [exercise('custom-unknown', 'Własne ćwiczenie', ['completed'])],
	});
	assert.ok(result.every((muscle) => muscle.effectiveSets === 0));
});
