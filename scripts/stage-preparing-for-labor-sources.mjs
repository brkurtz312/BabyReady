import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);
const REQUIRED_CONFIRMATION = 'STAGE_PREPARING_FOR_LABOR_SOURCES';

const sourceCandidates = [
  {
    id: 'acog-how-to-tell-when-labor-begins',
    organization: 'American College of Obstetricians and Gynecologists',
    title: 'How to Tell When Labor Begins',
    url: 'https://www.acog.org/womens-health/faqs/how-to-tell-when-labor-begins',
  },
  {
    id: 'nichd-stages-of-labor',
    organization:
      'Eunice Kennedy Shriver National Institute of Child Health and Human Development',
    title: 'What are the stages of labor?',
    url: 'https://www.nichd.nih.gov/health/topics/labor-delivery/topicinfo/stages',
  },
  {
    id: 'acog-pain-relief-labor-delivery',
    organization: 'American College of Obstetricians and Gynecologists',
    title: 'Medications for Pain Relief During Labor and Delivery',
    url: 'https://www.acog.org/womens-health/faqs/medications-for-pain-relief-during-labor-and-delivery',
  },
  {
    id: 'acog-limit-intervention-labor-birth',
    organization: 'American College of Obstetricians and Gynecologists',
    title: 'Approaches to Limit Intervention During Labor and Birth',
    url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/approaches-to-limit-intervention-during-labor-and-birth',
  },
  {
    id: 'acog-urgent-maternal-warning-signs',
    organization: 'American College of Obstetricians and Gynecologists',
    title: 'Patient Safety Resources',
    url: 'https://www.acog.org/giving/programs/quality-and-safety/resources',
  },
  {
    id: 'acog-car-safety',
    organization: 'American College of Obstetricians and Gynecologists',
    title: 'Car Safety for Pregnant Women, Babies, and Children',
    url: 'https://www.acog.org/womens-health/faqs/car-safety-for-pregnant-women-babies-and-children',
  },
];

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function usage() {
  return `
Usage:
  npm run stage:preparing-for-labor-sources
  npm run stage:preparing-for-labor-sources -- --write --confirm ${REQUIRED_CONFIRMATION} --reviewed-on YYYY-MM-DD --next-review-on YYYY-MM-DD

Modes:
  Default   Read-only preflight. Reports candidate IDs and duplicate conflicts.
  --write   Creates exactly six new source records as drafts after all safeguards pass.

Write safeguards:
  - --confirm must exactly equal ${REQUIRED_CONFIRMATION}.
  - --reviewed-on and --next-review-on must be valid calendar dates.
  - The next-review date must be after the review date and in the future.
  - A Firestore transaction rechecks every candidate ID and canonical URL immediately before creation.
  - Any existing or conflicting record stops the entire write. Nothing is updated or merged.
  - Every created record has publicationState: "draft". This script cannot publish, freeze, or delete records.

Environment safeguards:
  - FIREBASE_PROJECT_ID must be an approved production Firebase project.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.

Credentials:
  Run gcloud auth application-default login outside this repository. Never put
  service-account JSON or other Admin SDK credentials in .env, Expo configuration,
  source control, or a client build.
`.trim();
}

function readOption(args, option) {
  const index = args.indexOf(option);
  if (index === -1) {
    return null;
  }

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    fail(`${option} requires a value.`);
  }

  return value;
}

function parseDate(value, option) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${option} must use YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fail(`${option} must be a valid calendar date.`);
  }

  return date;
}

function parseArguments(args) {
  const supported = new Set([
    '--write',
    '--confirm',
    '--reviewed-on',
    '--next-review-on',
    '--help',
    '-h',
  ]);

  for (const argument of args) {
    if (argument.startsWith('--') && !supported.has(argument)) {
      fail(`Unsupported option: ${argument}\n\n${usage()}`);
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }

  const shouldWrite = args.includes('--write');
  const confirmation = readOption(args, '--confirm');
  const reviewedOn = readOption(args, '--reviewed-on');
  const nextReviewOn = readOption(args, '--next-review-on');

  if (!shouldWrite && (confirmation || reviewedOn || nextReviewOn)) {
    fail('--confirm, --reviewed-on, and --next-review-on require --write.');
  }

  if (!shouldWrite) {
    return { shouldWrite: false };
  }

  if (confirmation !== REQUIRED_CONFIRMATION) {
    fail(
      `--write requires --confirm ${REQUIRED_CONFIRMATION}. No Firebase data was changed.`,
    );
  }
  if (!reviewedOn || !nextReviewOn) {
    fail(
      '--write requires both --reviewed-on and --next-review-on. No Firebase data was changed.',
    );
  }

  const lastReviewedAt = parseDate(reviewedOn, '--reviewed-on');
  const nextReviewAt = parseDate(nextReviewOn, '--next-review-on');
  if (nextReviewAt.getTime() <= lastReviewedAt.getTime()) {
    fail('--next-review-on must be later than --reviewed-on.');
  }
  if (nextReviewAt.getTime() <= Date.now()) {
    fail('--next-review-on must be in the future.');
  }

  return { shouldWrite: true, lastReviewedAt, nextReviewAt };
}

function assertApprovedProductionEnvironment() {
  loadProductionEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    fail(
      'Set FIREBASE_PROJECT_ID to an approved production Firebase project before staging source records.',
    );
  }
  if (!APPROVED_PROJECT_IDS.has(projectId)) {
    fail(
      `FIREBASE_PROJECT_ID ${projectId} is not approved for this staging script. No Firebase data was changed.`,
    );
  }
  if (
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS?.trim().toLowerCase() ===
    'true'
  ) {
    fail(
      'EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only staging script.',
    );
  }
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail(
      'FIRESTORE_EMULATOR_HOST must not be set for this production-only staging script.',
    );
  }

  return projectId;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function simplifiedSource(snapshot) {
  const source = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    url: typeof source.url === 'string' ? source.url : null,
    publicationState:
      typeof source.publicationState === 'string'
        ? source.publicationState
        : null,
  };
}

function findConflicts(sources) {
  return sourceCandidates.flatMap((candidate) => {
    const canonicalUrl = normalizeUrl(candidate.url);
    const matches = sources.filter(
      (source) =>
        source.id === candidate.id || normalizeUrl(source.url) === canonicalUrl,
    );

    return matches.length ? [{ candidate, matches }] : [];
  });
}

function printPreflight(conflicts) {
  console.table(
    sourceCandidates.map((candidate) => {
      const conflict = conflicts.find(
        (entry) => entry.candidate.id === candidate.id,
      );

      return {
        candidateId: candidate.id,
        plannedState: 'draft',
        status: conflict ? 'conflict' : 'eligible-to-stage',
        matchingRecordIds: conflict
          ? conflict.matches.map((match) => match.id).join(', ')
          : '—',
      };
    }),
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();
  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = getFirestore(app);
  const sources = db.collection('sources');

  const preflight = await sources.get();
  const conflicts = findConflicts(preflight.docs.map(simplifiedSource));

  console.log(`Project: ${projectId}`);
  console.log(`Candidate source records: ${sourceCandidates.length}`);
  console.log(
    'Target publication state: draft only. This script has no publish, freeze, update, merge, or delete mode.',
  );
  printPreflight(conflicts);

  if (conflicts.length) {
    fail(
      'No staging occurred because one or more candidate IDs or canonical URLs already exist. Review the matching source records; this script never overwrites or merges them.',
    );
  }

  if (!options.shouldWrite) {
    console.log(
      `\nDRY RUN: no changes were made. To stage exactly ${sourceCandidates.length} draft records, rerun with --write --confirm ${REQUIRED_CONFIRMATION} --reviewed-on YYYY-MM-DD --next-review-on YYYY-MM-DD.`,
    );
    return;
  }

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sources);
    const transactionConflicts = findConflicts(
      snapshot.docs.map(simplifiedSource),
    );

    if (transactionConflicts.length) {
      throw new Error(
        'The source library changed after preflight and now contains a candidate ID or canonical URL. No records were staged; rerun the dry run and reconcile the conflict.',
      );
    }

    for (const candidate of sourceCandidates) {
      transaction.create(sources.doc(candidate.id), {
        ...candidate,
        publicationState: 'draft',
        lastReviewedAt: options.lastReviewedAt,
        nextReviewAt: options.nextReviewAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  console.log(
    `\nSUCCESS: staged exactly ${sourceCandidates.length} new source records as drafts. No source was published, frozen, updated, merged, or deleted.`,
  );
  console.log(
    'Next: source-librarian and clinical-lead review. Publish only records that are current and appropriately scoped; source publication does not publish learner content.',
  );
}

main().catch((error) => {
  fail(
    `Source-record staging failed. ${error instanceof Error ? error.message : String(error)}`,
  );
});
