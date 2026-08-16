import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(
  await readFile(
    new URL(
      '../docs/content/preparing-for-labor-authoring-manifest.v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

const validTypes = new Set([
  'text',
  'callout',
  'checklist',
  'question',
  'audio',
  'video',
  'figure',
  'citation',
  'emergency_card',
  'artifact_prompt',
]);

test('Preparing for Labor manifest has the governed course shape', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.course.id, 'preparing-for-labor');
  assert.equal(manifest.course.moduleId, 'labor-readiness');
  assert.equal(manifest.lessons.length, 4);
  assert.deepEqual(
    manifest.lessons.map((lesson) => lesson.lessonId),
    [
      'understanding-labor',
      'when-to-contact-your-care-team',
      'comfort-and-support',
      'arriving-prepared',
    ],
  );
});

test('Preparing for Labor manifest blocks have unique approved placements', () => {
  const allBlocks = manifest.lessons.flatMap((lesson) =>
    lesson.blocks.map((block) => ({ ...block, lessonId: lesson.lessonId })),
  );

  assert.equal(allBlocks.length, 25);
  assert.equal(
    new Set(allBlocks.map((block) => `${block.lessonId}/${block.id}`)).size,
    allBlocks.length,
  );

  for (const lesson of manifest.lessons) {
    assert.equal(
      new Set(lesson.blocks.map((block) => block.displayOrder)).size,
      lesson.blocks.length,
      `${lesson.lessonId} has duplicate display orders`,
    );
    for (const block of lesson.blocks) {
      assert.match(block.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(Number.isInteger(block.displayOrder) && block.displayOrder > 0);
      assert.ok(validTypes.has(block.type), `unsupported type ${block.type}`);
      assert.equal(typeof block.isClinicalClaim, 'boolean');
      assert.ok(Array.isArray(block.sourceSlotIds));
    }
  }
});

test('Preparing for Labor safety cards retain their governed placement', () => {
  const safetyCards = manifest.lessons.map((lesson) => ({
    lessonId: lesson.lessonId,
    block: lesson.blocks.find((block) => block.type === 'emergency_card'),
  }));

  assert.deepEqual(
    safetyCards.map(({ lessonId, block }) => ({
      lessonId,
      id: block?.id,
      isClinicalClaim: block?.isClinicalClaim,
      sourceSlotIds: block?.sourceSlotIds,
    })),
    [
      {
        lessonId: 'understanding-labor',
        id: 'understanding-labor-emergency-help',
        isClinicalClaim: true,
        sourceSlotIds: ['preparing-labor-safety-escalation-source'],
      },
      {
        lessonId: 'when-to-contact-your-care-team',
        id: 'contact-care-team-emergency-help',
        isClinicalClaim: true,
        sourceSlotIds: ['preparing-labor-safety-escalation-source'],
      },
      {
        lessonId: 'comfort-and-support',
        id: 'comfort-support-emergency-help',
        isClinicalClaim: true,
        sourceSlotIds: ['preparing-labor-safety-escalation-source'],
      },
      {
        lessonId: 'arriving-prepared',
        id: 'arriving-prepared-emergency-help',
        isClinicalClaim: true,
        sourceSlotIds: ['preparing-labor-safety-escalation-source'],
      },
    ],
  );
});
