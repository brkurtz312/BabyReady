import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';
import {
  contentBlockPath,
  draftPackageKey,
  GOVERNED_DRAFT_PACKAGE_CONFIRMATION,
  loadPreparingForLaborDraftPackageEntries,
  missingPublishedSourceIds,
  sourceIdsForEntries,
  sourcePublicationState,
} from './preparing-for-labor-governed-draft-package-runtime.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);
const AUTOMATION_ACTOR_ID = 'governed-draft-package-cli';

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function usage() {
  return `
Usage:
  npm run generate:preparing-for-labor-governed-drafts
  npm run generate:preparing-for-labor-governed-drafts -- --write --confirm ${GOVERNED_DRAFT_PACKAGE_CONFIRMATION}

Modes:
  Default  Read-only preflight. Lists the exact manifest cards that exist,
           remain missing, or are blocked by an unpublished source.
  --write  Creates only currently missing manifest cards as version-1 drafts.

Write safeguards:
  - --confirm must exactly equal ${GOVERNED_DRAFT_PACKAGE_CONFIRMATION}.
  - FIREBASE_PROJECT_ID must be babyready-8bfd6.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.
  - Every required source for every missing card must exist and be published.
  - A Firestore transaction rechecks target cards and source publication states
    immediately before creation.
  - Existing cards are never updated, merged, submitted, approved, frozen,
    published, deleted, or given a new version.
  - New records have publicationState "draft", no media attachments, no clinical
    reviewer, and no review dates. This command cannot publish learner content.

Attribution:
  New content and version history records identify the automated actor as
  "${AUTOMATION_ACTOR_ID}". The Git commit, command invocation, and Firebase
  Admin credential provide the operator audit trail.
`.trim();
}

function parseArguments(args) {
  const supported = new Set(['--write', '--confirm', '--help', '-h']);
  for (const argument of args) {
    if (!supported.has(argument) && argument !== GOVERNED_DRAFT_PACKAGE_CONFIRMATION) {
      fail(`Unsupported option: ${argument}\n\n${usage()}`);
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  const write = args.includes('--write');
  const confirmationIndex = args.indexOf('--confirm');
  const confirmation =
    confirmationIndex >= 0 ? args[confirmationIndex + 1] : undefined;

  if (confirmationIndex >= 0 && !confirmation) {
    fail(
      `--confirm requires ${GOVERNED_DRAFT_PACKAGE_CONFIRMATION}.\n\n${usage()}`,
    );
  }
  if (!write && confirmationIndex >= 0) {
    fail('--confirm can only be used with --write. No Firestore data was changed.');
  }
  if (write && confirmation !== GOVERNED_DRAFT_PACKAGE_CONFIRMATION) {
    fail(
      `Refusing write mode without --confirm ${GOVERNED_DRAFT_PACKAGE_CONFIRMATION}. No Firestore data was changed.`,
    );
  }

  return { write };
}

function assertApprovedProductionEnvironment() {
  loadProductionEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!APPROVED_PROJECT_IDS.has(projectId)) {
    fail(
      `FIREBASE_PROJECT_ID must be babyready-8bfd6; found ${projectId || '(missing)'}. No Firestore data was changed.`,
    );
  }
  if (
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS?.trim().toLowerCase() ===
    'true'
  ) {
    fail(
      'EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only command.',
    );
  }
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail(
      'FIRESTORE_EMULATOR_HOST must not be set for this production-only command.',
    );
  }

  return projectId;
}

async function inspectDraftPackage(db, entries) {
  const references = entries.map((entry) => db.doc(contentBlockPath(entry)));
  const snapshots = await Promise.all(references.map((reference) => reference.get()));
  const existing = entries.filter((_entry, index) => snapshots[index].exists);
  const missing = entries.filter((_entry, index) => !snapshots[index].exists);
  const sourceIds = sourceIdsForEntries(missing);
  const sourceSnapshotList = await Promise.all(
    sourceIds.map(async (sourceId) => [sourceId, await db.doc(`sources/${sourceId}`).get()]),
  );
  const sourceSnapshots = new Map(sourceSnapshotList);
  const blockedBlocks = missingPublishedSourceIds(missing, sourceSnapshots);

  return { existing, missing, sourceSnapshots, blockedBlocks };
}

function printPreflight(entries, preflight) {
  const blockedByKey = new Map(
    preflight.blockedBlocks.map((block) => [
      `${block.lessonId}/${block.contentBlockId}`,
      block.missingPublishedSourceIds,
    ]),
  );

  console.table(
    entries.map((entry) => {
      const key = draftPackageKey(entry);
      const exists = preflight.existing.some(
        (existing) => draftPackageKey(existing) === key,
      );
      const missingSources = blockedByKey.get(key) ?? [];

      return {
        lessonId: entry.lessonId,
        blockId: entry.id,
        displayOrder: entry.displayOrder,
        type: entry.type,
        status: exists
          ? 'existing-unchanged'
          : missingSources.length
            ? 'blocked'
            : 'eligible-to-create',
        missingPublishedSourceIds: missingSources.join(', ') || '—',
      };
    }),
  );

  if (preflight.missing.length) {
    console.table(
      sourceIdsForEntries(preflight.missing).map((sourceId) => ({
        sourceId,
        publicationState: sourcePublicationState(
          preflight.sourceSnapshots.get(sourceId),
        ),
      })),
    );
  }
}

function draftRecord(entry) {
  return {
    ...entry,
    publicationState: 'draft',
    clinicalReviewerId: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    createdBy: AUTOMATION_ACTOR_ID,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    versionCount: 1,
  };
}

function versionRecord(entry, versionReference) {
  return {
    id: versionReference.id,
    versionNumber: 1,
    action: 'draft_saved',
    actorId: AUTOMATION_ACTOR_ID,
    createdAt: FieldValue.serverTimestamp(),
    note: 'Generated by the Preparing for Labor governed local draft package.',
    snapshot: {
      contentBlockId: entry.id,
      title: entry.title,
      type: entry.type,
      body: entry.body,
      sourceIds: entry.sourceIds,
      mediaIds: [],
      isClinicalClaim: entry.isClinicalClaim,
      publicationState: 'draft',
      displayOrder: entry.displayOrder,
    },
  };
}

async function createMissingDrafts(db, entries) {
  return db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(
      entries.map((entry) => transaction.get(db.doc(contentBlockPath(entry)))),
    );
    const missing = entries.filter((_entry, index) => !snapshots[index].exists);
    const sourceIds = sourceIdsForEntries(missing);
    const sourceSnapshotList = await Promise.all(
      sourceIds.map(async (sourceId) => [
        sourceId,
        await transaction.get(db.doc(`sources/${sourceId}`)),
      ]),
    );
    const blockedBlocks = missingPublishedSourceIds(
      missing,
      new Map(sourceSnapshotList),
    );

    if (blockedBlocks.length) {
      const details = blockedBlocks
        .map(
          (block) =>
            `${block.lessonId}/${block.contentBlockId}: ${block.missingPublishedSourceIds.join(', ')}`,
        )
        .join('; ');
      throw new Error(
        `Required published sources changed after preflight: ${details}. No drafts were created.`,
      );
    }

    for (const entry of missing) {
      const reference = db.doc(contentBlockPath(entry));
      const versionReference = reference.collection('versions').doc();

      transaction.create(reference, draftRecord(entry));
      transaction.create(versionReference, versionRecord(entry, versionReference));
    }

    return {
      createdBlockIds: missing.map(draftPackageKey),
      skippedExistingBlockIds: entries
        .filter((entry) => !missing.includes(entry))
        .map(draftPackageKey),
    };
  });
}

async function main() {
  const { write } = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();
  const entries = await loadPreparingForLaborDraftPackageEntries();
  const app = initializeApp(
    {
      credential: applicationDefault(),
      projectId,
    },
    'generate-preparing-for-labor-governed-drafts',
  );
  const db = getFirestore(app);
  const preflight = await inspectDraftPackage(db, entries);

  console.log(`Project: ${projectId}`);
  console.log(`Governed manifest blocks: ${entries.length}`);
  console.log('Mode: draft-only. No course, source, review, media, or learner record can be changed.');
  printPreflight(entries, preflight);

  if (preflight.blockedBlocks.length) {
    fail(
      `No drafts were created because ${preflight.blockedBlocks.length} missing manifest block(s) require unpublished or absent source records. Publish the listed source records, then rerun the read-only preflight.`,
    );
  }
  if (!preflight.missing.length) {
    console.log(
      '\nNo action: every manifest block already exists. Existing records were left unchanged.',
    );
    return;
  }
  if (!write) {
    console.log(
      `\nREAD-ONLY: no Firestore data was changed. To create exactly ${preflight.missing.length} missing draft record(s), rerun with --write --confirm ${GOVERNED_DRAFT_PACKAGE_CONFIRMATION}.`,
    );
    return;
  }

  const result = await createMissingDrafts(db, entries);
  console.log(
    `\nSUCCESS: created exactly ${result.createdBlockIds.length} governed draft record(s): ${result.createdBlockIds.join(', ') || 'none'}.`,
  );
  console.log(
    `Existing records left unchanged: ${result.skippedExistingBlockIds.length}. No record was submitted, approved, frozen, published, deleted, or given a new version.`,
  );
}

main().catch((error) => {
  fail(
    `Governed Preparing for Labor draft generation failed. Verify local Application Default Credentials and production project access, then rerun the read-only preflight. ${error instanceof Error ? error.message : String(error)}`,
  );
});
