import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';
import { preparingForLaborTypoArtifacts } from './preparing-for-labor-typo-artifacts.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);
const REQUIRED_CONFIRMATION = 'DELETE_FROZEN_PREPARING_FOR_LABOR_TYPO_ARTIFACTS';

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function usage() {
  return `
Usage:
  npm run purge:preparing-for-labor-typo-artifacts
  npm run purge:preparing-for-labor-typo-artifacts -- --write --confirm ${REQUIRED_CONFIRMATION}

Modes:
  Default  Read-only verification of exactly four known frozen typo artifacts.
  --write  Deletes only the verified parent content-block documents. Nested
           contentVersions subcollections remain as audit evidence.

Safeguards:
  - FIREBASE_PROJECT_ID must be babyready-8bfd6.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.
  - Every target must exist and have publicationState "frozen".
  - The target list is hard-coded by complete Firestore path; valid manifest
    drafts are not enumerated, altered, or recreated.
`.trim();
}

function parseArguments(args) {
  const supported = new Set(['--write', '--confirm', '--help', '-h']);
  for (const argument of args) {
    if (!supported.has(argument) && argument !== REQUIRED_CONFIRMATION) {
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
    fail(`--confirm requires ${REQUIRED_CONFIRMATION}.\n\n${usage()}`);
  }
  if (write && confirmation !== REQUIRED_CONFIRMATION) {
    fail(
      `Refusing destructive mode without --confirm ${REQUIRED_CONFIRMATION}. No Firestore data was changed.`,
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
      'EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only cleanup.',
    );
  }
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail(
      'FIRESTORE_EMULATOR_HOST must not be set for this production-only cleanup.',
    );
  }

  return projectId;
}

async function main() {
  const { write } = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();
  const app = initializeApp(
    {
      credential: applicationDefault(),
      projectId,
    },
    'purge-preparing-for-labor-typo-artifacts',
  );
  const db = getFirestore(app);

  const targets = await Promise.all(
    preparingForLaborTypoArtifacts.map(async (artifact) => {
      const reference = db.doc(artifact.path);
      const snapshot = await reference.get();
      const publicationState = snapshot.data()?.publicationState;

      if (!snapshot.exists) {
        fail(`Expected frozen typo artifact is absent: ${artifact.path}`);
      }
      if (publicationState !== 'frozen') {
        fail(
          `Refusing to delete ${artifact.path}: expected publicationState "frozen", found "${String(publicationState)}".`,
        );
      }

      return { ...artifact, reference };
    }),
  );

  console.log(`Project: ${projectId}`);
  console.log(`Verified frozen typo artifacts: ${targets.length}`);
  console.table(
    targets.map(({ lessonId, blockId, path }) => ({ lessonId, blockId, path })),
  );

  if (!write) {
    console.log(
      `\nREAD-ONLY: no Firestore data was changed. To delete only these parent documents, rerun with --write --confirm ${REQUIRED_CONFIRMATION}.`,
    );
    return;
  }

  await Promise.all(targets.map(({ reference }) => reference.delete()));
  console.log(
    '\nSUCCESS: deleted exactly 4 frozen typo parent documents. No valid manifest draft, course, source, review, or nested version-history subcollection was changed.',
  );
}

main().catch((error) => {
  fail(
    `Preparing for Labor typo-artifact cleanup failed. Verify local Application Default Credentials and production project access, then retry. ${error instanceof Error ? error.message : String(error)}`,
  );
});

