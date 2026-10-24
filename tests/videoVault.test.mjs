// Checks the Video Vault (src/lib/videoVault.ts) against the real lessons and library.
// Needs Node 22.18+ (runs the TypeScript files directly).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { RECOMMENDED_VIDEOS, VIDEO_LIBRARY } from '../src/content/videoLibrary.ts';
import { buildVideoVault, filterVideoVault, vaultSources } from '../src/lib/videoVault.ts';

const root = new URL('../content/lessons/', import.meta.url);
const courses = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({
    lessons: readdirSync(new URL(`${d.name}/`, root))
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => JSON.parse(readFileSync(new URL(`${d.name}/${f}`, root), 'utf8'))),
  }));
const vault = buildVideoVault(courses, VIDEO_LIBRARY, RECOMMENDED_VIDEOS);
const all = vault.flatMap((g) => g.videos);

test('every video recommended after a lesson is in the vault, once', () => {
  const recommended = new Set(courses.flatMap((c) => c.lessons.flatMap((l) => RECOMMENDED_VIDEOS[l.lessonId] ?? [])));
  assert.equal(all.length, recommended.size);
  assert.deepEqual(new Set(all.map((v) => v.key)), recommended);
});

test('videos are grouped by topic, with all nine months together', () => {
  const months = vault.find((g) => g.topic === 'Fetal Development Month by Month');
  assert.equal(months.videos.length, 9);
  for (const g of vault) assert.ok(g.videos.every((v) => v.topic === g.topic), g.topic);
});

test('each video lists every lesson it goes with', () => {
  const stages = all.find((v) => v.key === 'nichd-the-3-stages-of-labor');
  assert.ok(stages.lessons.length >= 3, stages.lessons.join(', '));
  for (const v of all) assert.ok(v.lessons.length >= 1, v.key);
});

test('search matches titles, sources and lesson names; the source filter narrows', () => {
  const carSeat = filterVideoVault(vault, 'car seat', null).flatMap((g) => g.videos.map((v) => v.key));
  assert.ok(carSeat.includes('nhtsa-install-rear-facing-car-seats'));
  const acog = filterVideoVault(vault, '', 'ACOG').flatMap((g) => g.videos);
  assert.ok(acog.length > 0 && acog.every((v) => v.source === 'ACOG'));
  assert.deepEqual(filterVideoVault(vault, 'zzzz-no-match', null), []);
  assert.equal(vaultSources(vault).length, new Set(all.map((v) => v.source)).size);
});
