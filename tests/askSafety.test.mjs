// Checks the deterministic safety routing that runs before any AI call.
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import test from 'node:test';

import { routeQuestion } from '../src/lib/askSafety.ts';

const cases = {
  crisis: [
    'I want to kill myself',
    'Sometimes I think about suicide',
    'I keep thinking I might hurt my baby',
    'I don’t want to live anymore',
  ],
  urgent: [
    'I am bleeding a lot',
    'How much bleeding is normal?',
    'There is blood in my underwear',
    'I can’t breathe well',
    'I have chest pain',
    'I have a severe headache',
    'I have a headache that won’t go away',
    'The baby is not moving as much today',
    'I haven’t felt the baby kick since this morning',
    'I have a fever',
    'My vision is blurry',
    'I think I had a seizure',
    'I fainted earlier',
    'Sudden swelling in my face',
  ],
  'water-broke': [
    'My water broke',
    'I think my water just broke but no contractions',
    'I am leaking fluid',
  ],
  ok: [
    'What is bloody show?',
    'How do I time contractions?',
    'What does 5-1-1 mean?',
    'What is effacement?',
    'Can I eat during early labor?',
    'Why wait to clamp the cord?',
    'What is skin to skin?',
  ],
};

for (const [expected, questions] of Object.entries(cases)) {
  test(`routes to "${expected}"`, () => {
    for (const q of questions) {
      assert.equal(routeQuestion(q), expected, q);
    }
  });
}

test('crisis wins over other matches', () => {
  assert.equal(routeQuestion('I am bleeding and want to end my life'), 'crisis');
});

test('urgent wins over water broke', () => {
  assert.equal(routeQuestion('My water broke and there is blood'), 'urgent');
});

test('every suggested question in the Ask panel reaches the lesson helper', async () => {
  const { ASK_SUGGESTIONS } = await import('../src/content/askSuggestions.ts');
  for (const questions of Object.values(ASK_SUGGESTIONS)) {
    for (const q of questions) assert.equal(routeQuestion(q), 'ok', q);
  }
});
