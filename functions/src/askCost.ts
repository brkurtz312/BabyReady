/**
 * What one instructor answer costs, from the token counts the API reports.
 * Logged per question (no question text, answer text, or account ID) so the
 * real cost per question can be read from Cloud Logging.
 *
 * Prices are US dollars per million tokens, from Anthropic's price list as of
 * 2026-10-18. Update them if the model or prices change.
 *
 * This file has no imports so plain Node can run it in tests.
 */

type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** Cache writes use the 5-minute TTL, billed at 1.25 times the input price. */
export const PRICES_PER_MTOK: Record<string, Price> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

export type TokenUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export type UsageRecord = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Null when the model that answered isn't in the price table, such as a safety fallback. */
  costUsd: number | null;
};

export function usageRecord(model: string, usage: TokenUsage): UsageRecord {
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const price = PRICES_PER_MTOK[model];
  const costUsd = price
    ? (inputTokens * price.input +
        outputTokens * price.output +
        cacheReadTokens * price.cacheRead +
        cacheWriteTokens * price.cacheWrite) /
      1_000_000
    : null;
  return { model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, costUsd };
}
