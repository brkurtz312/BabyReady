#!/usr/bin/env node
// Summarizes what instructor answers have cost, from the `ask_usage` lines the
// askLessonQuestion function writes to Cloud Logging (token counts only).
//
//   node scripts/ask-cost-report.mjs            # last 30 days
//   node scripts/ask-cost-report.mjs --days 7
//
// Needs the gcloud CLI, signed in with access to the Firebase project.
import { execFileSync } from 'node:child_process';

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'babyready-8bfd6';
const daysArg = process.argv.indexOf('--days');
const days = daysArg > -1 ? Number(process.argv[daysArg + 1]) : 30;

const raw = execFileSync(
  'gcloud',
  ['logging', 'read', 'jsonPayload.message="ask_usage"', `--project=${PROJECT}`, `--freshness=${days}d`, '--format=json', '--limit=100000'],
  { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
);
const rows = JSON.parse(raw).map((entry) => entry.jsonPayload);
if (!rows.length) {
  console.log(`No instructor questions logged in the last ${days} days.`);
  process.exit(0);
}

const priced = rows.filter((r) => typeof r.costUsd === 'number');
const total = priced.reduce((sum, r) => sum + r.costUsd, 0);
const sorted = priced.map((r) => r.costUsd).sort((a, b) => a - b);
const cents = (usd) => `${(usd * 100).toFixed(2)}¢`;
const avg = (key) => Math.round(rows.reduce((sum, r) => sum + (r[key] || 0), 0) / rows.length);

console.log(`Instructor questions, last ${days} days (project ${PROJECT})`);
console.log(`  Questions answered:   ${rows.length}`);
console.log(`  Total cost:           $${total.toFixed(2)}`);
if (priced.length) {
  console.log(`  Average per question: ${cents(total / priced.length)}`);
  console.log(`  Median per question:  ${cents(sorted[Math.floor(sorted.length / 2)])}`);
  console.log(`  Most expensive:       ${cents(sorted.at(-1))}`);
}
console.log(`  Follow-ups that hit the cache: ${rows.filter((r) => r.cacheReadTokens > 0).length}`);
console.log(`  Average tokens: input ${avg('inputTokens')}, cache read ${avg('cacheReadTokens')}, cache write ${avg('cacheWriteTokens')}, output ${avg('outputTokens')}`);
const unpriced = rows.length - priced.length;
if (unpriced) console.log(`  Answered by an unpriced model (safety fallback), not in the totals: ${unpriced}`);
