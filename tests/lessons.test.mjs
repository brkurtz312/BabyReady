// Checks every lesson JSON file against the quality rules in src/lib/lessonRules.ts.
// Needs Node 22.18+ (runs the TypeScript rules file directly).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { checkCourse, checkLesson } from '../src/lib/lessonRules.ts';

const lessonsRoot = new URL('../content/lessons/', import.meta.url);

function loadCourse(courseDir) {
  const dir = new URL(`${courseDir}/`, lessonsRoot);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
}

const courses = readdirSync(lessonsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const courseDir of courses) {
  test(`${courseDir}: every lesson follows the quality rules`, () => {
    const lessons = loadCourse(courseDir);
    assert.ok(lessons.length > 0, 'course folder has no lessons');
    for (const lesson of lessons) assert.equal(lesson.courseId, courseDir, `${lesson.lessonId} is in the wrong folder`);

    const { errors, warnings } = checkCourse(lessons);
    if (warnings.length) {
      console.log(`${courseDir}: ${warnings.length} reminder(s), e.g. sources still to verify.`);
    }
    assert.deepEqual(
      errors.map((e) => `${e.lessonId} ${e.where}: ${e.message}`),
      [],
    );
  });
}

test('the checker catches a teaching slide with no source', () => {
  const [lesson] = loadCourse('labor-basics');
  const broken = structuredClone(lesson);
  const slide = broken.slides.find((s) => s.type === 'content');
  slide.sourceIds = [];
  const { errors } = checkLesson(broken);
  assert.ok(errors.some((e) => e.message.includes('No source, no slide')));
});

test('the checker catches an unapproved organization', () => {
  const [lesson] = loadCourse('labor-basics');
  const broken = structuredClone(lesson);
  broken.sources[0].organization = 'SomeBlog';
  assert.ok(checkLesson(broken).errors.some((e) => e.message.includes('not an approved organization')));
});

test('a reviewed lesson needs a reviewer, dates within 12 months, and verified sources', () => {
  const [lesson] = loadCourse('labor-basics');
  const reviewed = structuredClone(lesson);
  reviewed.review = { status: 'reviewed', reviewedBy: null, reviewedOn: '2026-10-01', nextReviewBy: '2028-01-01' };
  const messages = checkLesson(reviewed).errors.map((e) => e.message);
  assert.ok(messages.some((m) => m.includes('name the reviewer')));
  assert.ok(messages.some((m) => m.includes('at most 12 months')));
  assert.ok(messages.some((m) => m.includes('unverified sources')));

  for (const s of reviewed.sources) s.verifiedOn = '2026-10-01';
  reviewed.review = { status: 'reviewed', reviewedBy: 'Jane Doe, RN', reviewedOn: '2026-10-01', nextReviewBy: '2027-10-01' };
  assert.deepEqual(checkLesson(reviewed).errors, []);
});
