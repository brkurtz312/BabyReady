import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';
import {
  preparingForLaborReadinessReconciliationTargets,
  readinessReconciliationConfirmation,
  readinessReconciliationPreflight,
} from './preparing-for-labor-readiness-reconciliation.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function usage() {
  return `
Usage:
  npm run reconcile:preparing-for-labor-readiness-blocks
  npm run reconcile:preparing-for-labor-readiness-blocks -- --write --confirm ${readinessReconciliationConfirmation}

Modes:
  Default  Read-only preflight. Verifies the two exact documents are safe to reconcile.
  --write  In one transaction, changes only the canonical record's publicationState
           from "frozen" to "draft" and deletes only the malformed typo parent
           document. No learner-facing content, source, media, course, review, or
           nested version-history subcollection is changed.

Required preflight:
  - Canonical and malformed documents both exist at the exact hard-coded paths.
  - Canonical record is the manifest-approved checklist at display order 2 and is frozen.
  - Malformed typo record is draft.
  - Title, body, display order, type, clinical flag, source IDs, and media IDs match exactly.

Safeguards:
  - FIREBASE_PROJECT_ID must be babyready-8bfd6.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.
  - --write requires the exact confirmation phrase shown above.
`.trim();
}

function parseArguments(args) {
  const supported = new Set(['--write', '--confirm', '--help', '-h']);
  for (const argument of args) {
    if (!supported.has(argument) && argument !== readinessReconciliationConfirmation) {
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
      `--confirm requires ${readinessReconciliationConfirmation}.\n\n${usage()}`,
    );
  }
  if (write && confirmation !== readinessReconciliationConfirmation) {
    fail(
      `Refusing write mode without --confirm ${readinessReconciliationConfirmation}. No Firestore data was changed.`,
    );
  }
  if (!write && confirmationIndex >= 0) {
    fail('--confirm can only be used with --write. No Firestore data was changed.');
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
      'EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only reconciliation.',
    );
  }
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail(
      'FIRESTORE_EMULATOR_HOST must not be set for this production-only reconciliation.',
    );
  }

  return projectId;
}

function dataOrNull(snapshot) {
  return snapshot.exists ? snapshot.data() ?? {} : null;
}

function printPreflight(projectId, preflight) {
  console.log(`Project: ${projectId}`);
  console.log('Mode: read-only preflight. No Firestore data was changed.');
  console.table([
    {
      eligible: preflight.eligible,
      requiredConfirmation: readinessReconciliationConfirmation,
      canonicalOutcome: 'publicationState frozen -> draft',
      malformedOutcome: 'delete parent document only',
    },
  ]);

  if (preflight.errors.length) {
    console.log('\nPreflight errors:');
    for (const error of preflight.errors) {
      console.log(`- ${error}`);
    }
  } else {
    console.log(
      '\nPreflight passed. The explicitly confirmed write mode will change only the canonical publication state and delete only the malformed typo parent document.',
    );
  }
}

function requireEligible(preflight) {
  if (!preflight.eligible) {
    fail(
      `Reconciliation preflight failed:\n${preflight.errors.map((error) => `- ${error}`).join('\n')}\n\nNo Firestore data was changed.`,
    );
  }
}

async function main() {
  const { write } = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();
  const app = initializeApp(
    {
      credential: applicationDefault(),
      projectId,
    },
    'reconcile-preparing-for-labor-readiness-blocks',
  );
  const db = getFirestore(app);
  const { correct, typo } = preparingForLaborReadinessReconciliationTargets;
  const correctRef = db.doc(correct.path);
  const typoRef = db.doc(typo.path);

  if (!write) {
    const [correctSnapshot, typoSnapshot] = await Promise.all([
      correctRef.get(),
      typoRef.get(),
    ]);
    const preflight = readinessReconciliationPreflight(
      dataOrNull(correctSnapshot),
      dataOrNull(typoSnapshot),
    );
    printPreflight(projectId, preflight);
    if (!preflight.eligible) {
      process.exitCode = 1;
    }
    return;
  }

  await db.runTransaction(async (transaction) => {
    const [correctSnapshot, typoSnapshot] = await Promise.all([
      transaction.get(correctRef),
      transaction.get(typoRef),
    ]);
    const preflight = readinessReconciliationPreflight(
      dataOrNull(correctSnapshot),
      dataOrNull(typoSnapshot),
    );
    requireEligible(preflight);

    transaction.update(correctRef, { publicationState: 'draft' });
    transaction.delete(typoRef);
  });

  console.log(`Project: ${projectId}`);
  console.log(
    'SUCCESS: changed only the canonical record publicationState from frozen to draft and deleted only the malformed typo parent document. No learner-facing content, source, media, course, review, or nested version-history subcollection was changed.',
  );
}

main().catch((error) => {
  fail(
    `Preparing for Labor readiness reconciliation failed. ${error instanceof Error ? error.message : String(error)}`,
  );
});
