// Checks the printable Birth Readiness Brief (src/lib/briefDocument.ts).
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import test from 'node:test';

import { briefDocumentHtml } from '../src/lib/briefDocument.ts';

const base = {
  readiness: [
    { label: 'I have my care team’s contact information.', checked: true },
    { label: 'I have prepared questions for my care team.', checked: false },
  ],
  discussionQuestions: ['When should I call about contractions?', '  '],
  reflections: [{ lessonTitle: 'Labor Basics · Lesson 2', prompt: 'Who will you call?', text: 'My midwife\nthen my partner' }],
  printedOn: 'October 24, 2026',
};

test('the brief shows every prompt, the questions, the reflections and the date', () => {
  const html = briefDocumentHtml(base);
  assert.match(html, /Printed on October 24, 2026/);
  assert.match(html, /<li class="done"><span class="box">&#10003;<\/span>I have my care team’s contact information\.<\/li>/);
  assert.match(html, /<li class=""><span class="box"><\/span>I have prepared questions/);
  assert.match(html, /<li>When should I call about contractions\?<\/li>/);
  assert.equal((html.match(/<ol>.*?<\/ol>/s)?.[0].match(/<li>/g) ?? []).length, 1, 'blank questions are left out');
  assert.match(html, /My midwife<br>then my partner/);
  assert.match(html, /not medical advice/);
});

test('what the learner typed is escaped, never run as HTML', () => {
  const html = briefDocumentHtml({ ...base, discussionQuestions: ['<script>alert(1)</script> & "more"'] });
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;more&quot;/);
});

test('empty sections say so', () => {
  const html = briefDocumentHtml({ ...base, discussionQuestions: [], reflections: [] });
  assert.match(html, /No questions added yet\./);
  assert.match(html, /No class reflections saved yet\./);
});
