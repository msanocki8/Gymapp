import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getSafeShareReturnTo } from '../src/lib/auth-return-to.ts';
import { parseSharedWorkoutPlan } from '../src/lib/shared-workout-plan.ts';

const migration = readFileSync(
	new URL('../supabase/migrations/20261117195000_workout_plan_sharing.sql', import.meta.url),
	'utf8',
);

test('share tokens are generated for existing and new plans and remain unique', () => {
	assert.match(migration, /add column if not exists share_token uuid/i);
	assert.match(migration, /set share_token = gen_random_uuid\(\)\s+where share_token is null/i);
	assert.match(migration, /alter column share_token set default gen_random_uuid\(\)/i);
	assert.match(migration, /create unique index if not exists workout_plans_share_token_unique/i);
});

test('public plan reads use a narrow token RPC without opening table SELECT', () => {
	assert.match(migration, /security definer\s+set search_path = ''/i);
	assert.match(migration, /where plan\.share_token = p_token\s+limit 1/i);
	assert.match(migration, /revoke all on function public\.get_shared_workout_plan\(uuid\) from public/i);
	assert.match(migration, /grant execute on function public\.get_shared_workout_plan\(uuid\) to anon, authenticated/i);
	assert.doesNotMatch(migration, /grant select .*workout_plans/i);
	assert.doesNotMatch(migration, /workout_sessions|user_id|previous/i);
});

test('shared plan parser retains planned set details but drops other fields', () => {
	const plan = parseSharedWorkoutPlan({
		name: 'Push A',
		focus: 'Klatka',
		duration: 60,
		exercises: ['Wyciskanie'],
		exercise_configs: [{
			name: 'Wyciskanie',
			exerciseId: null,
			sets: [{ weight: '40', reps: '8', previous: '60 x 5' }],
		}],
	});

	assert.deepEqual(plan?.exerciseConfigs, [{
		name: 'Wyciskanie',
		sets: [{ weight: '40', reps: '8' }],
	}]);
});

test('shared plan parser rejects malformed configurations', () => {
	const plan = parseSharedWorkoutPlan({
		name: 'Push A',
		focus: 'Klatka',
		duration: 60,
		exercises: ['Wyciskanie'],
		exercise_configs: [{ name: 'Wyciskanie', sets: [{ weight: 40, reps: '8' }] }],
	});
	assert.equal(plan, null);
});

test('auth return path accepts only a UUID shared-plan route', () => {
	const token = '123e4567-e89b-42d3-a456-426614174000';
	assert.equal(getSafeShareReturnTo(`/share/${token}`), `/share/${token}`);
	assert.equal(getSafeShareReturnTo('https://example.com/'), null);
	assert.equal(getSafeShareReturnTo('/share/not-a-token'), null);
	assert.equal(getSafeShareReturnTo(['/share/not-a-token', `/share/${token}`]), null);
});
