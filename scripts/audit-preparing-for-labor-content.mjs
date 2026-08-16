import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);
const manifestPath = resolve(
  process.cwd(),
  'docs/content/preparing-for-labor-authoring-manifest.v1.json',
);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function usage() {
  return `
Usage:
  npm run audit:preparing-for-labor-content
  npm run audit:preparing-for-labor-content -- --strict
  npm run audit:preparing-for-labor-content -- --json

Modes:
  Default   Read-only authoring audit. Reports missing, misplaced, duplicate,
            unexpected, and lifecycle-incompatible Preparing for Labor blocks.
  --strict  Returns a non-zero exit code when the audit finds errors.
  --json    Prints the read-only audit report as JSON.

What this checks:
  - Exact course, module, lesson, and block IDs from the reviewed manifest.
  - Required display order, block type, and clinical-claim flag.
  - Duplicate display orders and unexpected source or media attachments.
  - Missing source attachments where the manifest reserves a source slot.
  - Source-record existence and publication state for attached sources.
  - Non-draft blocks and frozen records, including typo-preservation artifacts.

Safeguards:
  - FIREBASE_PROJECT_ID must be an approved production Firebase project.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.
  - This script only reads Firestore. It cannot create, edit, submit, approve,
    publish, freeze, or delete any course, block, source, or review record.
`.trim();
}

function parseArguments(args) {
  const supported = new Set(['--strict', '--json', '--help', '-h']);

  for (const argument of args) {
    if (!supported.has(argument)) {
      fail(`Unsupported option: ${argument}\n\n${usage()}`);
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  return {
    strict: args.includes('--strict'),
    json: args.includes('--json'),
  };
}

function assertApprovedProductionEnvironment() {
  loadProductionEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    fail(
      'Set FIREBASE_PROJECT_ID to an approved production Firebase project before auditing Preparing for Labor content.',
    );
  }
  if (!APPROVED_PROJECT_IDS.has(projectId)) {
    fail(
      `FIREBASE_PROJECT_ID ${projectId} is not approved for this audit. No Firebase data was changed.`,
    );
  }
  if (
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS?.trim().toLowerCase() ===
    'true'
  ) {
    fail(
      'EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only audit.',
    );
  }
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail(
      'FIRESTORE_EMULATOR_HOST must not be set for this production-only audit.',
    );
  }

  return projectId;
}

function expectedBlocks() {
  const { id: courseId, moduleId } = manifest.course;
  return manifest.lessons.flatMap((lesson) =>
    lesson.blocks.map((block) => ({
      courseId,
      moduleId,
      lessonId: lesson.lessonId,
      ...block,
      key: `${moduleId}/${lesson.lessonId}/${block.id}`,
    })),
  );
}

function addIssue(issues, severity, code, message, block) {
  issues.push({
    severity,
    code,
    message,
    ...(block
      ? {
          path: block.path,
          moduleId: block.moduleId,
          lessonId: block.lessonId,
          blockId: block.id,
          publicationState: block.publicationState,
        }
      : {}),
  });
}

function compactBlock(snapshot, moduleId, lessonId) {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    path: snapshot.ref.path,
    moduleId,
    lessonId,
    displayOrder: data.displayOrder,
    type: data.type,
    isClinicalClaim: data.isClinicalClaim === true,
    sourceIds: Array.isArray(data.sourceIds) ? data.sourceIds : [],
    mediaIds: Array.isArray(data.mediaIds) ? data.mediaIds : [],
    publicationState:
      typeof data.publicationState === 'string'
        ? data.publicationState
        : '(missing)',
  };
}

async function readCourseBlocks(db) {
  const courseReference = db.collection('courses').doc(manifest.course.id);
  const courseSnapshot = await courseReference.get();
  if (!courseSnapshot.exists) {
    return { courseExists: false, blocks: [] };
  }

  const modules = await courseReference.collection('modules').get();
  const blocks = [];
  for (const moduleSnapshot of modules.docs) {
    const lessons = await moduleSnapshot.ref.collection('lessons').get();
    for (const lessonSnapshot of lessons.docs) {
      const contentBlocks = await lessonSnapshot.ref
        .collection('contentBlocks')
        .get();
      blocks.push(
        ...contentBlocks.docs.map((snapshot) =>
          compactBlock(snapshot, moduleSnapshot.id, lessonSnapshot.id),
        ),
      );
    }
  }

  return { courseExists: true, blocks };
}

async function readSourceStates(db, sourceIds) {
  const ids = [...new Set(sourceIds)].sort();
  const snapshots = await Promise.all(
    ids.map(async (id) => {
      const snapshot = await db.collection('sources').doc(id).get();
      return [
        id,
        snapshot.exists
          ? String(snapshot.data()?.publicationState ?? '(missing)')
          : '(absent)',
      ];
    }),
  );

  return new Map(snapshots);
}

function auditBlocks(actualBlocks, sourceStates) {
  const expected = expectedBlocks();
  const expectedByKey = new Map(expected.map((block) => [block.key, block]));
  const actualByKey = new Map();
  const issues = [];

  for (const block of actualBlocks) {
    const key = `${block.moduleId}/${block.lessonId}/${block.id}`;
    const matchingExpected = expectedByKey.get(key);

    if (!matchingExpected) {
      const isFrozen = block.publicationState === 'frozen';
      addIssue(
        issues,
        isFrozen ? 'info' : 'error',
        isFrozen ? 'frozen-audit-artifact' : 'unexpected-placement-or-block',
        isFrozen
          ? 'Frozen block is retained as an audit artifact and is outside the active authoring plan.'
          : 'Block path or ID is not present in the Preparing for Labor authoring manifest.',
        block,
      );
      continue;
    }

    actualByKey.set(key, block);

    if (block.displayOrder !== matchingExpected.displayOrder) {
      addIssue(
        issues,
        'error',
        'display-order-mismatch',
        `Expected display order ${matchingExpected.displayOrder}; found ${String(block.displayOrder)}.`,
        block,
      );
    }
    if (block.type !== matchingExpected.type) {
      addIssue(
        issues,
        'error',
        'type-mismatch',
        `Expected type "${matchingExpected.type}"; found "${String(block.type)}".`,
        block,
      );
    }
    if (block.isClinicalClaim !== matchingExpected.isClinicalClaim) {
      addIssue(
        issues,
        'error',
        'clinical-claim-mismatch',
        `Expected isClinicalClaim ${matchingExpected.isClinicalClaim}; found ${block.isClinicalClaim}.`,
        block,
      );
    }
    if (matchingExpected.sourceSlotIds.length === 0 && block.sourceIds.length) {
      addIssue(
        issues,
        'warning',
        'unexpected-source-attachment',
        'This manifest block has no source slot, but source records are attached.',
        block,
      );
    }
    if (matchingExpected.sourceSlotIds.length > 0 && !block.sourceIds.length) {
      addIssue(
        issues,
        block.publicationState === 'draft' ? 'warning' : 'error',
        'missing-source-attachment',
        'This manifest block reserves a source slot, but no source record is attached.',
        block,
      );
    }
    if (block.mediaIds.length) {
      addIssue(
        issues,
        'warning',
        'unexpected-media-attachment',
        'The reviewed Preparing for Labor manifest does not authorize media attachments for this block.',
        block,
      );
    }
    for (const sourceId of block.sourceIds) {
      const sourceState = sourceStates.get(sourceId) ?? '(not-read)';
      if (sourceState !== 'published') {
        addIssue(
          issues,
          block.publicationState === 'draft' ? 'warning' : 'error',
          'source-not-published',
          `Attached source "${sourceId}" is ${sourceState}, not published.`,
          block,
        );
      }
    }
    if (block.publicationState !== 'draft') {
      addIssue(
        issues,
        block.publicationState === 'frozen' ? 'warning' : 'error',
        'unexpected-publication-state',
        `Current authoring phase requires draft-only blocks; found "${block.publicationState}".`,
        block,
      );
    }
  }

  for (const item of expected) {
    if (!actualByKey.has(item.key)) {
      addIssue(
        issues,
        'error',
        'missing-manifest-block',
        `Expected ${item.lessonId}/${item.id} at display order ${item.displayOrder} has not been entered.`,
      );
    }
  }

  const blocksByLesson = new Map();
  for (const block of actualBlocks.filter(
    (block) => block.publicationState !== 'frozen',
  )) {
    const key = `${block.moduleId}/${block.lessonId}`;
    blocksByLesson.set(key, [...(blocksByLesson.get(key) ?? []), block]);
  }
  for (const [lessonKey, blocks] of blocksByLesson) {
    const byOrder = new Map();
    for (const block of blocks) {
      if (!Number.isInteger(block.displayOrder)) {
        continue;
      }
      byOrder.set(block.displayOrder, [
        ...(byOrder.get(block.displayOrder) ?? []),
        block,
      ]);
    }
    for (const [displayOrder, duplicates] of byOrder) {
      if (duplicates.length > 1) {
        for (const block of duplicates) {
          addIssue(
            issues,
            'error',
            'duplicate-display-order',
            `${lessonKey} has ${duplicates.length} non-frozen blocks at display order ${displayOrder}.`,
            block,
          );
        }
      }
    }
  }

  return { expected, issues };
}

function reportRows(issues) {
  return issues.map((issue) => ({
    severity: issue.severity,
    code: issue.code,
    lesson: issue.lessonId ?? '—',
    block: issue.blockId ?? '—',
    state: issue.publicationState ?? '—',
    message: issue.message,
  }));
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();
  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = getFirestore(app);
  const course = await readCourseBlocks(db);
  const sourceStates = await readSourceStates(
    db,
    course.blocks.flatMap((block) => block.sourceIds),
  );
  const { expected, issues } = auditBlocks(course.blocks, sourceStates);
  const counts = {
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
  };
  const payload = {
    projectId,
    readOnly: true,
    courseId: manifest.course.id,
    courseExists: course.courseExists,
    expectedBlockCount: expected.length,
    discoveredBlockCount: course.blocks.length,
    counts,
    issues,
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Project: ${projectId}`);
    console.log(`Course: ${manifest.course.id}`);
    console.log(`Expected manifest blocks: ${expected.length}`);
    console.log(`Discovered content blocks: ${course.blocks.length}`);
    console.log(
      'Mode: read-only. No course, content block, source, review, or learner record was changed.',
    );
    console.table(reportRows(issues));
    console.log(
      `RESULT: ${counts.errors} error(s), ${counts.warnings} warning(s), and ${counts.info} informational audit artifact(s).`,
    );
  }

  if (options.strict && counts.errors > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  fail(
    `Preparing for Labor audit failed. Verify local Application Default Credentials and production project access, then retry. ${error instanceof Error ? error.message : String(error)}`,
  );
});
