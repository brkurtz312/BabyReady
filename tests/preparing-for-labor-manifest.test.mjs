import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { parsePreparingForLaborContentBlockPath } from '../scripts/preparing-for-labor-audit-utils.mjs';

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

async function loadManifestModule() {
  const source = await readFile(
    new URL('../src/content/preparingForLaborManifest.ts', import.meta.url),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (specifier) => {
      if (specifier.endsWith('preparing-for-labor-authoring-manifest.v1.json')) {
        return manifest;
      }

      throw new Error(`Unexpected manifest helper dependency: ${specifier}`);
    },
  });

  return module.exports;
}

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

test('Preparing for Labor manifest resolver prepopulates the complete immutable placement', async () => {
  const {
    getPreparingForLaborManifestPlacement,
    assertPreparingForLaborManifestPlacement,
  } = await loadManifestModule();
  const placement = getPreparingForLaborManifestPlacement(
    'arriving-prepared',
    'arriving-prepared-readiness-topics',
  );

  assert.deepEqual(JSON.parse(JSON.stringify(placement)), {
    courseId: 'preparing-for-labor',
    moduleId: 'labor-readiness',
    lessonId: 'arriving-prepared',
    id: 'arriving-prepared-readiness-topics',
    displayOrder: 2,
    type: 'checklist',
    isClinicalClaim: true,
  });
  assert.doesNotThrow(() =>
    assertPreparingForLaborManifestPlacement(placement),
  );
});

test('Preparing for Labor resolver rejects malformed lesson and block IDs before authoring', async () => {
  const {
    getPreparingForLaborManifestPlacement,
    assertPreparingForLaborManifestPlacement,
  } = await loadManifestModule();

  assert.equal(
    getPreparingForLaborManifestPlacement(
      'arriving-prepared',
      'arrriving-prepared-readiness-topics',
    ),
    undefined,
  );
  assert.throws(
    () =>
      assertPreparingForLaborManifestPlacement({
        courseId: 'preparing-for-labor',
        moduleId: 'labor-readiness',
        lessonId: 'arriving-prepared',
        id: 'arrriving-prepared-readiness-topics',
        displayOrder: 2,
        type: 'checklist',
        isClinicalClaim: true,
      }),
    /not approved/,
  );
  assert.throws(
    () =>
      assertPreparingForLaborManifestPlacement({
        courseId: 'preparing-for-labor',
        moduleId: 'labor-readiness',
        lessonId: 'when-to-conact-your-care-team',
        id: 'contact-care-team-save-details',
        displayOrder: 3,
        type: 'artifact_prompt',
        isClinicalClaim: false,
      }),
    /not in the Preparing for Labor authoring manifest/,
  );
});

test('Preparing for Labor audit recognizes blocks without parent documents', () => {
  assert.deepEqual(
    parsePreparingForLaborContentBlockPath(
      'courses/preparing-for-labor/modules/labor-readiness/lessons/understanding-labor/contentBlocks/understanding-labor-purpose',
      'preparing-for-labor',
    ),
    {
      moduleId: 'labor-readiness',
      lessonId: 'understanding-labor',
      id: 'understanding-labor-purpose',
    },
  );
  assert.deepEqual(
    parsePreparingForLaborContentBlockPath(
      'courses/preparing-for-labor/modules/labor-readiness/lessons/when-to-conact-your-care-team/contentBlocks/contact-care-team-save-details',
      'preparing-for-labor',
    ),
    {
      moduleId: 'labor-readiness',
      lessonId: 'when-to-conact-your-care-team',
      id: 'contact-care-team-save-details',
    },
  );
  assert.equal(
    parsePreparingForLaborContentBlockPath(
      'courses/another-course/modules/labor-readiness/lessons/understanding-labor/contentBlocks/understanding-labor-purpose',
      'preparing-for-labor',
    ),
    null,
  );
});
