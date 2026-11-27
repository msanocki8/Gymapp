import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBmr,
  calculateTargets,
  calculateTdee,
  formatDayLabel,
  parseGrams,
  remaining,
  scaleNutrients,
  shiftDateKey,
  sumMacros,
  totalsByMeal,
} from '../src/lib/nutrition.ts';

const profile = { sex: 'male', age: 25, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'maintain' };

test('BMR (Mifflin–St Jeor) and TDEE', () => {
  assert.equal(calculateBmr(profile), 1805); // 800 + 1125 - 125 + 5
  assert.equal(calculateBmr({ ...profile, sex: 'female' }), 1639);
  assert.equal(calculateTdee(profile), 2798); // 1805 * 1.55
});

test('targets: kcal by goal, protein g/kg, fat 25 %, carbs = rest', () => {
  const maintain = calculateTargets(profile);
  assert.deepEqual(maintain, { kcal: 2800, protein: 144, carbs: 381, fat: 78 });
  const cut = calculateTargets({ ...profile, goal: 'cut' });
  assert.equal(cut.kcal, 2380);
  assert.equal(cut.protein, 160);
  const manual = calculateTargets({ ...profile, kcalTarget: 2000, proteinTarget: 170 });
  assert.equal(manual.kcal, 2000);
  assert.equal(manual.protein, 170);
  assert.equal(manual.fat, 56);
  assert.equal(manual.carbs, 204);
});

test('scaling per 100 g and summing', () => {
  const oats = { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 };
  assert.deepEqual(scaleNutrients(oats, 150), { kcal: 558, protein: 20.3, carbs: 88.1, fat: 10.5 });
  const total = sumMacros([scaleNutrients(oats, 50), scaleNutrients(oats, 50)]);
  assert.deepEqual(total, { kcal: 372, protein: 13.6, carbs: 58.8, fat: 7 });
  const byMeal = totalsByMeal([{ meal: 'breakfast', kcal: 300, protein: 10, carbs: 40, fat: 8 }, { meal: 'snack', kcal: 120, protein: 2, carbs: 20, fat: 3 }]);
  assert.equal(byMeal.breakfast.kcal, 300);
  assert.equal(byMeal.lunch.kcal, 0);
  assert.equal(remaining({ kcal: 2000, protein: 150, carbs: 200, fat: 60 }, byMeal.breakfast).kcal, 1700);
});

test('dates and grams input', () => {
  assert.equal(shiftDateKey('2026-11-30', 1), '2026-12-01');
  assert.equal(formatDayLabel('2026-11-26', '2026-11-26'), 'Dziś · czw 26 lis');
  assert.equal(formatDayLabel('2026-11-25', '2026-11-26'), 'Wczoraj · śr 25 lis');
  assert.equal(parseGrams('150,5'), 150.5);
  assert.equal(parseGrams('0'), null);
  assert.equal(parseGrams('abc'), null);
});

test('activity suggested from weekly workout goal', async () => {
  const { activityFromWeeklyGoal } = await import('../src/lib/nutrition.ts');
  assert.equal(activityFromWeeklyGoal(3), 'moderate');
  assert.equal(activityFromWeeklyGoal(1), 'light');
  assert.equal(activityFromWeeklyGoal(7), 'very_active');
});
