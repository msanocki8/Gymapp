import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDietVisionItems } from '../src/lib/diet-vision.ts';

test('accepts a clean list of Polish food estimates and rounds numeric values', () => {
  assert.deepEqual(parseDietVisionItems({
    items: [{
      name: 'Pierś z kurczaka',
      estimated_grams: 199.96,
      calories: 330.4,
      protein: 62.36,
      carbs: 0,
      fat: 7.24,
    }],
  }), [{
    name: 'Pierś z kurczaka',
    estimated_grams: 200,
    calories: 330,
    protein: 62.4,
    carbs: 0,
    fat: 7.2,
  }]);
});

test('rejects malformed, oversized, and out-of-range AI results', () => {
  assert.equal(parseDietVisionItems({ items: 'not an array' }), null);
  assert.equal(parseDietVisionItems({ items: Array.from({ length: 21 }, () => ({})) }), null);
  assert.equal(parseDietVisionItems({
    items: [{ name: 'Składnik', estimated_grams: 0, calories: 10, protein: 1, carbs: 1, fat: 1 }],
  }), null);
  assert.equal(parseDietVisionItems({
    items: [{ name: 'Składnik', estimated_grams: 100, calories: 10, protein: -1, carbs: 1, fat: 1 }],
  }), null);
  assert.equal(parseDietVisionItems({
    items: [{ name: 'Składnik', estimated_grams: 1, calories: 1001, protein: 1, carbs: 1, fat: 1 }],
  }), null);
});
