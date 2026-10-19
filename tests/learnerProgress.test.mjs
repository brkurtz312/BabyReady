// Checks how lesson progress is read, merged, and updated for the home screen.
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PROGRESS,
  mergeProgress,
  nextLessonIndex,
  parseProgress,
  withLessonCompleted,
  withLessonOpened,
} from '../src/models/learnerProgress.ts';

test('malformed stored values are dropped, not trusted', () => {
  assert.deepEqual(parseProgress(null), EMPTY_PROGRESS);
  assert.deepEqual(parseProgress('oops'), EMPTY_PROGRESS);
  const parsed = parseProgress({
    completedLessonIds: ['safe-sleep', 'safe-sleep', 42, 'Bad Id!'],
    lastLesson: { courseId: 'feeding-and-newborn-care', lessonId: 'safe-sleep', openedAt: 'yesterday' },
  });
  assert.deepEqual(parsed, { completedLessonIds: ['safe-sleep'], lastLesson: null });
});

test('merging keeps every finished lesson and the newer last lesson', () => {
  const device = { completedLessonIds: ['a'], lastLesson: { courseId: 'c', lessonId: 'a', openedAt: 100 } };
  const account = { completedLessonIds: ['b'], lastLesson: { courseId: 'c', lessonId: 'b', openedAt: 200 } };
  const merged = mergeProgress(device, account);
  assert.deepEqual(merged.completedLessonIds.sort(), ['a', 'b']);
  assert.equal(merged.lastLesson.lessonId, 'b');
  assert.equal(mergeProgress(device, EMPTY_PROGRESS).lastLesson.lessonId, 'a');
  assert.equal(mergeProgress(EMPTY_PROGRESS, account).lastLesson.lessonId, 'b');
});

test('opening and finishing lessons update progress', () => {
  let progress = withLessonOpened(EMPTY_PROGRESS, 'feeding-and-newborn-care', 'safe-sleep', 5);
  assert.deepEqual(progress.lastLesson, { courseId: 'feeding-and-newborn-care', lessonId: 'safe-sleep', openedAt: 5 });
  progress = withLessonCompleted(progress, 'safe-sleep');
  assert.deepEqual(progress.completedLessonIds, ['safe-sleep']);
  assert.equal(withLessonCompleted(progress, 'safe-sleep'), progress, 'finishing twice changes nothing');
});

test('a module continues at its first unfinished lesson', () => {
  const ids = ['one', 'two', 'three'];
  assert.equal(nextLessonIndex(ids, []), 0);
  assert.equal(nextLessonIndex(ids, ['one']), 1);
  assert.equal(nextLessonIndex(ids, ['one', 'three']), 1);
  assert.equal(nextLessonIndex(ids, ['one', 'two', 'three']), 0, 'all done: start over for review');
});
