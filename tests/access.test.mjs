// Checks which lessons are free and which need the full-class purchase.
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { FREE_COURSE_IDS, FREE_LESSON_IDS, isFreeLesson, isLessonLocked } from '../src/lib/access.ts';

const lessonsRoot = new URL('../content/lessons/', import.meta.url);

const lessons = readdirSync(lessonsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => {
    const dir = new URL(`${d.name}/`, lessonsRoot);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
  });

test('every free course and lesson exists, so a rename can’t quietly lock it', () => {
  const courseIds = new Set(lessons.map((l) => l.courseId));
  const lessonIds = new Set(lessons.map((l) => l.lessonId));
  for (const id of FREE_COURSE_IDS) assert.ok(courseIds.has(id), `free course ${id} not found`);
  for (const id of FREE_LESSON_IDS) assert.ok(lessonIds.has(id), `free lesson ${id} not found`);
});

test('every safety lesson is free', () => {
  for (const id of [
    'when-to-contact-your-care-team',
    'postpartum-warning-signs',
    'emotional-health-after-birth',
    'when-to-call-about-your-baby',
    'safe-sleep',
    'infant-cpr-and-choking',
  ]) {
    const lesson = lessons.find((l) => l.lessonId === id);
    assert.ok(isFreeLesson(lesson.courseId, id), `${id} must stay free`);
  }
});

test('all of Early Pregnancy Basics and the welcome are free', () => {
  for (const l of lessons.filter((l) => l.courseId === 'early-pregnancy-basics')) {
    assert.ok(isFreeLesson(l.courseId, l.lessonId), l.lessonId);
  }
  const welcome = lessons.find((l) => l.lessonId === 'welcome-how-this-class-works');
  assert.ok(isFreeLesson(welcome.courseId, welcome.lessonId));
});

test('most lessons are part of the paid class', () => {
  const paid = lessons.filter((l) => !isFreeLesson(l.courseId, l.lessonId));
  assert.ok(paid.length > lessons.length / 2, `only ${paid.length} of ${lessons.length} lessons are paid`);
});

test('nothing is locked while the purchase is switched off or once it is bought', () => {
  const paid = lessons.find((l) => !isFreeLesson(l.courseId, l.lessonId));
  assert.equal(isLessonLocked(paid.courseId, paid.lessonId, { paywallEnabled: false, unlocked: false }), false);
  assert.equal(isLessonLocked(paid.courseId, paid.lessonId, { paywallEnabled: true, unlocked: true }), false);
  assert.equal(isLessonLocked(paid.courseId, paid.lessonId, { paywallEnabled: true, unlocked: false }), true);
  assert.equal(
    isLessonLocked('labor-basics', 'when-to-contact-your-care-team', { paywallEnabled: true, unlocked: false }),
    false,
  );
});

test('the app never writes its own price', () => {
  for (const file of ['src/components/PaywallSheet.tsx', 'src/services/purchaseService.ts', 'App.tsx']) {
    // Comments may mention a price; code may not.
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(source, /\$\s?\d/, `${file} has a hardcoded price; show the store's priceString`);
  }
});
