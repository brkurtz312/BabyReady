// Checks EPDS scoring, the reviewer's score bands, the anxiety flag, and the
// self-harm rule. Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EPDS_QUESTIONS,
  bandFor,
  needsCrisisHelp,
  scoreEpds,
} from '../src/lib/epds.ts';

const zeros = () => EPDS_QUESTIONS.map(() => 0);

test('the scale has ten questions, each with four answers scored 0 to 3', () => {
  assert.equal(EPDS_QUESTIONS.length, 10);
  EPDS_QUESTIONS.forEach((q, k) => {
    assert.equal(q.number, k + 1);
    assert.deepEqual(
      q.options.map((o) => o.score).sort(),
      [0, 1, 2, 3],
      `question ${q.number} must score 0, 1, 2, and 3 once each`,
    );
  });
});

test('reverse-scored questions list the highest score first', () => {
  for (const n of [3, 5, 6, 7, 8, 9, 10]) {
    assert.equal(EPDS_QUESTIONS[n - 1].options[0].score, 3, `question ${n}`);
  }
  for (const n of [1, 2, 4]) {
    assert.equal(EPDS_QUESTIONS[n - 1].options[0].score, 0, `question ${n}`);
  }
});

test('bands follow the reviewer: 0-9, 10-12, 13 and up', () => {
  assert.equal(bandFor(0), 'low');
  assert.equal(bandFor(9), 'low');
  assert.equal(bandFor(10), 'possible');
  assert.equal(bandFor(12), 'possible');
  assert.equal(bandFor(13), 'likely');
  assert.equal(bandFor(30), 'likely');
});

test('totals and the anxiety flag at 6 or more on questions 3 to 5', () => {
  const answers = zeros();
  answers[2] = 2;
  answers[3] = 2;
  answers[4] = 1;
  let result = scoreEpds(answers);
  assert.equal(result.total, 5);
  assert.equal(result.anxietyScore, 5);
  assert.equal(result.anxietyFlag, false);
  answers[4] = 2;
  result = scoreEpds(answers);
  assert.equal(result.anxietyScore, 6);
  assert.equal(result.anxietyFlag, true);
  assert.equal(result.band, 'low');
});

test('any answer but "Never" on question 10 needs crisis help, whatever the total', () => {
  assert.equal(needsCrisisHelp(10, 0), false);
  for (const score of [1, 2, 3]) assert.equal(needsCrisisHelp(10, score), true);
  for (let n = 1; n <= 9; n++) assert.equal(needsCrisisHelp(n, 3), false);
  const answers = zeros();
  answers[9] = 1;
  const result = scoreEpds(answers);
  assert.equal(result.total, 1);
  assert.equal(result.band, 'low');
  assert.equal(result.selfHarm, true);
});

test('incomplete or impossible answers are rejected', () => {
  assert.throws(() => scoreEpds([0, 0, 0]));
  const answers = zeros();
  answers[0] = 4;
  assert.throws(() => scoreEpds(answers));
});
