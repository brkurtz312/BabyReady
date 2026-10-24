// Checks the video library and the videos recommended after each lesson.
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { RECOMMENDED_VIDEOS, VIDEO_LIBRARY, recommendedVideosFor } from '../src/content/videoLibrary.ts';

const lessonsRoot = new URL('../content/lessons/', import.meta.url);
const lessonIds = new Set(
  readdirSync(lessonsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(new URL(`${d.name}/`, lessonsRoot))
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(new URL(`${d.name}/${f}`, lessonsRoot), 'utf8')).lessonId),
    ),
);

test('every video has a unique key and a YouTube link over https', () => {
  const keys = new Set();
  for (const video of VIDEO_LIBRARY) {
    assert.ok(!keys.has(video.key), `duplicate key ${video.key}`);
    keys.add(video.key);
    assert.match(video.url, /^https:\/\/www\.youtube\.com\//, video.key);
    assert.ok(video.title && video.source, video.key);
  }
});

test('recommendations point at real lessons and real videos, at most three each', () => {
  for (const [lessonId, keys] of Object.entries(RECOMMENDED_VIDEOS)) {
    assert.ok(lessonIds.has(lessonId), `no lesson ${lessonId}`);
    assert.ok(keys.length >= 1 && keys.length <= 3, `${lessonId} has ${keys.length}`);
    assert.equal(recommendedVideosFor(lessonId).length, keys.length, `${lessonId} names a video that isn't in the library`);
  }
});

test('a lesson without recommendations shows none', () => {
  assert.deepEqual(recommendedVideosFor('welcome-how-this-class-works'), []);
});
