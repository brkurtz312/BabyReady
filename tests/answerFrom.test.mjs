// Checks how the instructor's "From:" line is tidied before it's shown.
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanFrom, NOT_COVERED } from '../functions/src/answerFrom.ts';

test('headings pass through unchanged', () => {
  assert.equal(cleanFrom('What early pregnancy can feel like'), 'What early pregnancy can feel like');
  assert.equal(cleanFrom('Nausea is common; Simple ways to ease nausea'), 'Nausea is common; Simple ways to ease nausea');
});

test('a heading wins over "not covered in this lesson"', () => {
  assert.equal(cleanFrom('not covered in this lesson; What early pregnancy can feel like'), 'What early pregnancy can feel like');
  assert.equal(cleanFrom('Not covered in this lesson, but What early pregnancy can feel like.'), 'What early pregnancy can feel like');
  assert.equal(cleanFrom('Folic acid: a small step that matters; not covered in this lesson'), 'Folic acid: a small step that matters');
});

test('headings with commas stay whole, and repeats are dropped', () => {
  assert.equal(cleanFrom('Diapers, baths, and soothing; Diapers, baths, and soothing'), 'Diapers, baths, and soothing');
});

test('nothing used means not covered; nothing written means no line', () => {
  assert.equal(cleanFrom('not covered in this lesson'), NOT_COVERED);
  assert.equal(cleanFrom('Not covered in this lesson.'), NOT_COVERED);
  assert.equal(cleanFrom(''), null);
  assert.equal(cleanFrom(null), null);
});
