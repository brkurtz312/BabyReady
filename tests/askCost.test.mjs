// Checks the per-question cost that the instructor function logs.
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import test from 'node:test';

import { usageRecord } from '../functions/src/askCost.ts';

test('a first question pays for the lesson text as a cache write', () => {
  const r = usageRecord('claude-opus-5-5', {
    input_tokens: 40,
    output_tokens: 300,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 2600,
  });
  // 40 x $4 + 300 x $20 + 2600 x $5, per million tokens
  assert.equal(r.costUsd.toFixed(5), '0.01916');
  assert.equal(r.cacheWriteTokens, 2600);
});

test('a follow-up reads the lesson text from the cache', () => {
  const r = usageRecord('claude-opus-5-5', {
    input_tokens: 150,
    output_tokens: 300,
    cache_read_input_tokens: 2600,
    cache_creation_input_tokens: 0,
  });
  // 150 x $4 + 300 x $20 + 2600 x $0.20, per million tokens
  assert.equal(r.costUsd.toFixed(5), '0.00712');
});

test('missing counts are zero, and an unpriced model logs no cost', () => {
  const r = usageRecord('claude-opus-5', { input_tokens: 10, output_tokens: null });
  assert.deepEqual(r, {
    model: 'claude-opus-5',
    inputTokens: 10,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: null,
  });
});
