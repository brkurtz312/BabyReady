import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadProductionEnvironment } from './production-env.mjs';

const APPROVED_PROJECT_IDS = new Set(['babyready-8bfd6']);

const preparingForLaborCandidates = [
  {
    id: 'acog-how-to-tell-when-labor-begins',
    url: 'https://www.acog.org/womens-health/faqs/how-to-tell-when-labor-begins',
  },
  {
    id: 'nichd-stages-of-labor',
    url: 'https://www.nichd.nih.gov/health/topics/labor-delivery/topicinfo/stages',
  },
  {
    id: 'acog-pain-relief-labor-delivery',
    url: 'https://www.acog.org/womens-health/faqs/medications-for-pain-relief-during-labor-and-delivery',
  },
  {
    id: 'acog-limit-intervention-labor-birth',
    url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/approaches-to-limit-intervention-during-labor-and-birth',
  },
  {
    id: 'acog-urgent-maternal-warning-signs',
    url: 'https://www.acog.org/giving/programs/quality-and-safety/resources',
  },
  {
    id: 'acog-car-safety',
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
  npm run inspect:source-library
  npm run inspect:source-library -- --all
  npm run inspect:source-library -- --json

Modes:
  Default   Read-only duplicate check for Preparing for Labor candidate source IDs and URLs.
  --all     Read-only listing of all source records in the approved production project.
  --json    Print the selected read-only result as JSON.

Safeguards:
  - FIREBASE_PROJECT_ID must be an approved production Firebase project.
  - The Local Emulator Suite must be disabled.
  - Application Default Credentials must be available to this server-only process.
  - This script only reads Firestore; it cannot create, edit, publish, freeze, or delete source records.

Operator setup:
  Run gcloud auth application-default login outside this repository, then rerun
  npm run inspect:source-library. Do not put service-account JSON or other Admin
  SDK credentials in .env, Expo configuration, source control, or a client build.
`.trim();
}

function parseArguments(args) {
  const supported = new Set(['--all', '--json', '--help', '-h']);

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
    includeAll: args.includes('--all'),
    json: args.includes('--json'),
  };
}

function assertApprovedProductionEnvironment() {
  loadProductionEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    fail(
      'Set FIREBASE_PROJECT_ID to an approved production Firebase project before inspecting source records.',
    );
  }

  if (!APPROVED_PROJECT_IDS.has(projectId)) {
    fail(
      `FIREBASE_PROJECT_ID ${projectId} is not approved for this inspection. No Firebase data was changed.`,
    );
  }

  if (
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS?.trim().toLowerCase() ===
    'true'
  ) {
    fail(
      'EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be false for this production-only inspection.',
    );
  }

  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    fail(
      'FIRESTORE_EMULATOR_HOST must not be set for this production-only inspection.',
    );
  }

  return projectId;
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function serializableSource(snapshot) {
  const source = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    organization:
      typeof source.organization === 'string' ? source.organization : null,
    title: typeof source.title === 'string' ? source.title : null,
    url: typeof source.url === 'string' ? source.url : null,
    publicationState:
      typeof source.publicationState === 'string'
        ? source.publicationState
        : null,
    lastReviewedAt: formatDate(source.lastReviewedAt),
    nextReviewAt: formatDate(source.nextReviewAt),
    updatedAt: formatDate(source.updatedAt),
  };
}

function candidateResult(candidate, sources) {
  const canonicalUrl = normalizeUrl(candidate.url);
  const idMatches = sources.filter((source) => source.id === candidate.id);
  const urlMatches = sources.filter(
    (source) => normalizeUrl(source.url) === canonicalUrl,
  );
  const matches = [...new Map([...idMatches, ...urlMatches].map((source) => [source.id, source])).values()];

  return {
    candidate,
    status:
      matches.length === 0
        ? 'absent'
        : idMatches.length === 1 &&
            urlMatches.length === 1 &&
            idMatches[0].id === urlMatches[0].id
          ? 'exact-canonical-record'
          : 'possible-duplicate-or-conflict',
    matches,
  };
}

function printCandidateResults(results) {
  console.table(
    results.map(({ candidate, status, matches }) => ({
      candidateId: candidate.id,
      status,
      matchingRecordIds: matches.map((source) => source.id).join(', ') || '—',
      states:
        matches.map((source) => source.publicationState ?? '(missing)').join(', ') ||
        '—',
      matchingUrls: matches.map((source) => source.url ?? '(missing)').join(', ') || '—',
    })),
  );
}

async function main() {
  const { includeAll, json } = parseArguments(process.argv.slice(2));
  const projectId = assertApprovedProductionEnvironment();
  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = getFirestore(app);

  const snapshot = await db.collection('sources').get();
  const sources = snapshot.docs
    .map(serializableSource)
    .sort((left, right) => left.id.localeCompare(right.id));
  const results = preparingForLaborCandidates.map((candidate) =>
    candidateResult(candidate, sources),
  );
  const payload = {
    projectId,
    readOnly: true,
    sourceRecordCount: sources.length,
    candidates: results,
    ...(includeAll ? { sources } : {}),
  };

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`Project: ${projectId}`);
  console.log(`Source records read: ${sources.length}`);
  console.log(
    'Mode: read-only. No source record was created, edited, published, frozen, or deleted.',
  );
  printCandidateResults(results);

  if (includeAll) {
    console.table(sources);
  }

  if (results.some((result) => result.status === 'possible-duplicate-or-conflict')) {
    console.log(
      '\nReview every matching record before creating or changing a source record. Use the existing canonical record when it is suitable.',
    );
  } else if (results.every((result) => result.status === 'absent')) {
    console.log(
      '\nNo Preparing for Labor candidate source record was found by exact ID or normalized canonical URL. A source librarian may now evaluate each candidate for draft creation; this script does not make that change.',
    );
  }
}

main().catch((error) => {
  fail(
    `Firestore source-library read failed. Verify local Application Default Credentials and production project access, then retry. ${error instanceof Error ? error.message : String(error)}`,
  );
});
