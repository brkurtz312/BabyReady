import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);
const SEED_ACTOR = 'seed-preparing-for-labor-outline';
const courseId = 'preparing-for-labor';
const courseTitle = 'Preparing for Labor';

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function usage() {
  return `
Usage:
  npm run seed:preparing-for-labor-outline
  npm run seed:preparing-for-labor-outline -- --write

Modes:
  Default   Read-only dry run. Reports whether the draft course would be created or updated.
  --write   Creates or updates the draft course outline after all production safeguards pass.

Safeguards:
  - FIREBASE_PROJECT_ID must be an approved production Firebase project.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to read or write Firestore.
  - This seed always writes publicationState: "draft"; it never publishes the course.
`.trim();
}

function parseArguments(args) {
  const supported = new Set(['--write', '--help', '-h']);

  for (const argument of args) {
    if (!supported.has(argument)) {
      fail(`Unsupported option: ${argument}\n\n${usage()}`);
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  return { shouldWrite: args.includes('--write') };
}

function assertApprovedProductionEnvironment() {
  loadProductionEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    fail(
      'Set FIREBASE_PROJECT_ID to an approved production Firebase project before preparing the course outline.',
    );
  }

  if (!APPROVED_PROJECT_IDS.has(projectId)) {
    fail(
      `FIREBASE_PROJECT_ID ${projectId} is not approved for this seed. No Firebase data was changed.`,
    );
  }

  if (
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS?.trim().toLowerCase() ===
    'true'
  ) {
    fail('EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only seed.');
  }

  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail('FIRESTORE_EMULATOR_HOST must not be set for this production-only seed.');
  }

  return projectId;
}

const learnerOutline = [
  {
    id: 'labor-readiness',
    order: 1,
    title: 'Labor readiness',
    summary: 'Prepare for conversations, support, and arrival logistics.',
    lessons: [
      {
        id: 'understanding-labor',
        order: 1,
        title: 'Understanding Labor',
        summary: 'Learn what to prepare and what to discuss with your care team.',
        estimatedMinutes: 8,
      },
      {
        id: 'when-to-contact-your-care-team',
        order: 2,
        title: 'When to Contact Your Care Team',
        summary: 'Confirm your own practice and hospital contact plan before you need it.',
        estimatedMinutes: 8,
      },
      {
        id: 'comfort-and-support',
        order: 3,
        title: 'Comfort and Support',
        summary: 'Identify communication and support preferences to discuss with your team.',
        estimatedMinutes: 10,
      },
      {
        id: 'arriving-prepared',
        order: 4,
        title: 'Arriving Prepared',
        summary: 'Bring your questions, contacts, and readiness plan together.',
        estimatedMinutes: 8,
      },
    ],
  },
];

function outlineRows() {
  return learnerOutline.flatMap((module) =>
    module.lessons.map((lesson) => ({
      courseId,
      moduleId: module.id,
      lessonId: lesson.id,
      estimatedMinutes: lesson.estimatedMinutes,
    })),
  );
}

async function main() {
  const { shouldWrite } = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();

  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = getFirestore(app);
  const courseReference = db.collection('courses').doc(courseId);
  const courseSnapshot = await courseReference.get();
  const currentState = courseSnapshot.exists
    ? String(courseSnapshot.data().publicationState ?? '(missing)')
    : '(new)';
  const action = courseSnapshot.exists ? 'update' : 'create';

  console.log(`Project: ${projectId}`);
  console.log(`Course: ${courseId}`);
  console.log(`Current publication state: ${currentState}`);
  console.log(`Planned action: ${action} draft course outline`);
  console.table(outlineRows());

  if (!shouldWrite) {
    console.log(
      '\nDRY RUN: no changes were made. Rerun with --write to create or update this draft course outline. This seed never publishes the course.',
    );
    return;
  }

  const draftCourse = {
    id: courseId,
    title: courseTitle,
    summary:
      'A practical, clinician-reviewed guide to labor readiness, care-team communication, comfort and support preferences, and arrival preparation.',
    locale: 'en-US',
    publicationState: 'draft',
    learnerOutline,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (courseSnapshot.exists) {
    await courseReference.set(draftCourse, { merge: true });
  } else {
    await courseReference.create({
      ...draftCourse,
      createdBy: SEED_ACTOR,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  console.log(
    `\nSUCCESS: ${action === 'create' ? 'Created' : 'Updated'} the ${courseTitle} course as a draft. The course was not published and no lesson content, learner progress, or review records were changed.`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
