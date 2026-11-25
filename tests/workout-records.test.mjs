import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatRecordValue,
  formatWhen,
  getLastWorkoutSummary,
  getPersonalRecords,
  parseAmount,
} from '../src/lib/workout-records.ts';

const day = (iso) => Date.parse(iso);
const sessions = [
  {
    id: 'a', name: 'PUSH A — SIŁA', duration: 55, completedExercises: 2, completedAt: day('2026-11-11T10:00:00Z'),
    exercisePerformance: [
      { name: 'Wyciskanie leżąc', exerciseId: 'bench', sets: [{ weight: '80', reps: '5' }, { weight: '80', reps: '4' }] },
      { name: 'Pompki', sets: [{ weight: '', reps: '15' }] },
    ],
  },
  {
    id: 'b', name: 'PULL A', duration: 60, completedExercises: 1, completedAt: day('2026-11-14T10:00:00Z'),
    exercisePerformance: [{ name: 'Martwy ciąg', exerciseId: 'dl', sets: [{ weight: '140', reps: '3' }] }],
  },
  {
    id: 'c', name: 'push a — siła', duration: 58, completedExercises: 2, completedAt: day('2026-11-18T10:00:00Z'),
    exercisePerformance: [
      { name: 'Wyciskanie leżąc', exerciseId: 'bench', sets: [{ weight: '82,5', reps: '5' }, { weight: '80', reps: '5' }] },
      { name: 'Pompki', sets: [{ weight: '—', reps: '18' }] },
    ],
  },
];

test('parseAmount handles commas, units and empty values', () => {
  assert.equal(parseAmount('82,5'), 82.5);
  assert.equal(parseAmount('82.5 kg'), 82.5);
  assert.equal(parseAmount('+10'), 10);
  assert.equal(parseAmount('—'), 0);
  assert.equal(parseAmount(''), 0);
});

test('last workout: sets, volume and change vs previous session with the same name', () => {
  const summary = getLastWorkoutSummary(sessions);
  assert.equal(summary.sessionId, 'c');
  assert.equal(summary.sets, 3);
  assert.equal(summary.exercises, 2);
  assert.equal(summary.volumeKg, 813); // 82.5*5 + 80*5 = 812.5 → 813
  assert.equal(summary.volumeChangePercent, 13); // 813 vs 720
  assert.equal(getLastWorkoutSummary([]), null);
});

test('personal records: best weight per exercise, newest first, flags new', () => {
  const records = getPersonalRecords(sessions);
  assert.deepEqual(records.map((r) => [r.name, r.weightKg, r.reps, r.isNew]), [
    ['Wyciskanie leżąc', 82.5, 5, true],
    ['Pompki', 0, 18, true],
    ['Martwy ciąg', 140, 3, false],
  ]);
  assert.equal(formatRecordValue(records[0]), '82,5 kg × 5');
  assert.equal(formatRecordValue(records[1]), '× 18');
});

test('formatWhen gives relative Polish labels', () => {
  const now = day('2026-11-25T12:00:00Z');
  assert.equal(formatWhen(day('2026-11-25T08:00:00Z'), now), 'dziś');
  assert.equal(formatWhen(day('2026-11-24T08:00:00Z'), now), 'wczoraj');
  assert.equal(formatWhen(day('2026-11-18T08:00:00Z'), now), 'tydzień temu');
  assert.equal(formatWhen(day('2026-11-04T08:00:00Z'), now), '3 tyg. temu');
});
