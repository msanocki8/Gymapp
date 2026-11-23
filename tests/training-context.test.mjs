import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTrainingContext } from '../src/lib/training-context.ts';

const NOW = Date.parse('2026-11-22T12:00:00Z');

test('training context aggregates frequency, Epley 1RM and month comparison', () => {
  const context = buildTrainingContext([
    {
      completed_at: '2026-11-20T10:00:00Z',
      duration: 60,
      exercise_performance: [{
        name: 'Wyciskanie sztangi',
        exerciseId: 'bench-press',
        sets: [
          { weight: '80', reps: '8', previous: '—' },
          { weight: '82.5', reps: '6', previous: '—' },
        ],
      }],
    },
    {
      completed_at: '2026-10-15T10:00:00Z',
      duration: 55,
      exercise_performance: [{
        name: 'Wyciskanie sztangi',
        exerciseId: 'bench-press',
        sets: [
          { weight: '75', reps: '8', previous: '—' },
        ],
      }],
    },
  ], NOW);

  assert.match(context, /1 treningów w ostatnich 7 dniach/);
  assert.match(context, /1 treningów w ostatnich 30 dniach/);
  assert.match(context, /Wyciskanie sztangi/);
  assert.match(context, /101\.3 kg/);
  assert.match(context, /trend=progres/);
});

test('training context reports empty history explicitly', () => {
  const context = buildTrainingContext([], NOW);
  assert.equal(
    context,
    'BRAK HISTORII TRENINGOWEJ: użytkownik nie ma zapisanych treningów z ostatnich 90 dni.',
  );
});

test('training context does not report a trend without previous-month data', () => {
  const context = buildTrainingContext([
    {
      completed_at: '2026-11-15T10:00:00Z',
      duration: 45,
      exercise_performance: [{
        name: 'Wyciskanie sztangi',
        exerciseId: 'bench-press',
        sets: [{ weight: '70', reps: '10', previous: '—' }],
      }],
    },
  ], NOW);

  assert.match(context, /brak danych z poprzedniego miesiąca do porównania/);
  assert.match(context, /trend=za mało danych/);
});
