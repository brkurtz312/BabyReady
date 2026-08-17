import { createHash } from 'node:crypto';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';
import { preparingForLaborReadinessReconciliationTargets } from './preparing-for-labor-readiness-reconciliation.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function usage() {
  return `
Usage:
  npm run compare:preparing-for-labor-readiness-blocks
  npm run compare:preparing-for-labor-readiness-blocks -- --json

Purpose:
  Read-only comparison of the correct manifest checklist record
  (arriving-prepared-readiness-topics) and the active typo draft
  (arrriving-prepared-readiness-topics).

Safeguards:
  - FIREBASE_PROJECT_ID must be babyready-8bfd6.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.
  - This command only reads Firestore. It cannot create, edit, freeze,
    unfreeze, submit, approve, publish, or delete any record.
`.trim();
}

function parseArguments(args) {
  const supported = new Set(['--json', '--help', '-h']);
  for (const argument of args) {
    if (!supported.has(argument)) {
      fail(`Unsupported option: ${argument}\n\n${usage()}`);
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  return { json: args.includes('--json') };
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
      'EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only comparison.',
    );
  }
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail(
      'FIRESTORE_EMULATOR_HOST must not be set for this production-only comparison.',
    );
  }

  return projectId;
}

function normalizedArray(value) {
  return Array.isArray(value) ? [...value].map(String).sort() : [];
}

function compactRecord(target, snapshot) {
  if (!snapshot.exists) {
    return {
      label: target.label,
      path: target.path,
      exists: false,
    };
  }

  const data = snapshot.data() ?? {};
  const body = typeof data.body === 'string' ? data.body : '';

  return {
    label: target.label,
    path: target.path,
    exists: true,
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : '',
    body,
    bodySha256: createHash('sha256').update(body).digest('hex'),
    displayOrder: data.displayOrder ?? null,
    type: data.type ?? null,
    isClinicalClaim: data.isClinicalClaim === true,
    sourceIds: normalizedArray(data.sourceIds),
    mediaIds: normalizedArray(data.mediaIds),
    publicationState: data.publicationState ?? null,
  };
}

function learnerFacingProjection(record) {
  return {
    title: record.title,
    body: record.body,
    type: record.type,
    isClinicalClaim: record.isClinicalClaim,
    sourceIds: record.sourceIds,
    mediaIds: record.mediaIds,
  };
}

function compareRecords(correct, typo) {
  if (!correct.exists || !typo.exists) {
    return {
      recordsAvailable: false,
      learnerFacingContentMatches: false,
      metadataMatches: false,
    };
  }

  return {
    recordsAvailable: true,
    learnerFacingContentMatches:
      JSON.stringify(learnerFacingProjection(correct)) ===
      JSON.stringify(learnerFacingProjection(typo)),
    metadataMatches:
      correct.displayOrder === typo.displayOrder &&
      correct.publicationState === typo.publicationState,
  };
}

function printableRecord(record) {
  const { body, ...summary } = record;
  return {
    ...summary,
    bodyCharacters: body?.length ?? 0,
  };
}

async function main() {
  const { json } = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();
  const app = initializeApp(
    {
      credential: applicationDefault(),
      projectId,
    },
    'compare-preparing-for-labor-readiness-blocks',
  );
  const db = getFirestore(app);
  const targets = preparingForLaborReadinessReconciliationTargets;
  const [correctSnapshot, typoSnapshot] = await Promise.all([
    db.doc(targets.correct.path).get(),
    db.doc(targets.typo.path).get(),
  ]);
  const correct = compactRecord(targets.correct, correctSnapshot);
  const typo = compactRecord(targets.typo, typoSnapshot);
  const comparison = compareRecords(correct, typo);

  if (json) {
    console.log(
      JSON.stringify(
        {
          projectId,
          mode: 'read-only',
          comparison,
          correct,
          typo,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Project: ${projectId}`);
  console.log('Mode: read-only. No Firestore data was changed.');
  console.table([printableRecord(correct), printableRecord(typo)]);
  console.table([comparison]);

  for (const record of [correct, typo]) {
    if (!record.exists) {
      console.log(`\n${record.label}: document is absent.`);
      continue;
    }

    console.log(`\n${record.label} learner copy:\n${record.body || '(empty body)'}`);
  }
}

main().catch((error) => {
  fail(
    `Preparing for Labor readiness comparison failed. Verify local Application Default Credentials and production project access, then retry. ${error instanceof Error ? error.message : String(error)}`,
  );
});
