import test from 'node:test';
import assert from 'node:assert/strict';

import { selectGeminiApiKey } from '../src/lib/gemini-api-key.ts';

test('a supplied Gemini key takes precedence over the Vercel default', () => {
  assert.deepEqual(selectGeminiApiKey(' user-key ', 'server-key'), { apiKey: 'user-key' });
});

test('the Vercel key is used when no user key is supplied', () => {
  assert.deepEqual(selectGeminiApiKey(undefined, ' server-key '), { apiKey: 'server-key' });
});

test('an invalid user key does not silently fall back to the Vercel key', () => {
  assert.deepEqual(selectGeminiApiKey(' ', 'server-key'), { error: 'invalid-override' });
  assert.deepEqual(selectGeminiApiKey('x'.repeat(513), 'server-key'), { error: 'invalid-override' });
});

test('missing user and Vercel keys are reported explicitly', () => {
  assert.deepEqual(selectGeminiApiKey(undefined, undefined), { error: 'missing' });
});
