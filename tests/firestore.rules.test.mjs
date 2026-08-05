import { readFileSync } from 'node:fs';
import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectId = 'babyready-rules-test';
const emulatorAddress = new URL(
  `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`,
);
const firestoreHost = emulatorAddress.hostname;
const firestorePort = Number.parseInt(emulatorAddress.port || '8080', 10);
const rules = readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8');

let testEnvironment;

const courseData = (publicationState = 'published') => ({
  id: 'birthready',
  title: 'BirthReady',
  summary: 'A clinically governed childbirth education course.',
  locale: 'en-US',
  publicationState,
  createdBy: 'admin',
});

const clinicalBlock = (overrides = {}) => ({
  id: 'welcome',
  courseId: 'birthready',
  moduleId: 'module-1',
  lessonId: 'lesson-1',
  type: 'text',
  body: 'Clinically reviewed educational copy.',
  isClinicalClaim: true,
  sourceIds: ['acog-labor-delivery'],
  clinicalReviewerId: 'admin',
  lastReviewedAt: Timestamp.fromDate(new Date('2026-08-01T00:00:00.000Z')),
  nextReviewAt: Timestamp.fromDate(new Date('2027-08-01T00:00:00.000Z')),
  publicationState: 'published',
  ...overrides,
});

async function seed(path, data) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

function userDb(uid, tokenOptions) {
  return testEnvironment
    .authenticatedContext(uid, { admin: false, ...tokenOptions })
    .firestore();
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: firestoreHost,
      port: firestorePort,
      rules,
    },
  });
});

afterEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment?.cleanup();
});

test('published curriculum is readable, while draft curriculum stays private', async () => {
  await seed('courses/birthready', courseData('published'));
  await seed('courses/draft-course', courseData('draft'));

  const anonymous = testEnvironment.unauthenticatedContext().firestore();

  await assertSucceeds(getDoc(doc(anonymous, 'courses/birthready')));
  await assertFails(getDoc(doc(anonymous, 'courses/draft-course')));
});

test('only an administrator can create or modify curriculum', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });

  await assertFails(setDoc(doc(author, 'courses/birthready'), courseData()));
  await assertSucceeds(setDoc(doc(admin, 'courses/birthready'), courseData()));
  await assertFails(
    updateDoc(doc(author, 'courses/birthready'), { title: 'Unapproved update' }),
  );
});

test('a clinical block cannot publish without sources, reviewer, and review dates', async () => {
  const admin = userDb('admin', { admin: true });
  const blockPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome';

  await assertFails(
    setDoc(
      doc(admin, blockPath),
      clinicalBlock({
        sourceIds: [],
        clinicalReviewerId: null,
        lastReviewedAt: null,
        nextReviewAt: null,
      }),
    ),
  );

  await assertSucceeds(setDoc(doc(admin, blockPath), clinicalBlock()));
});

test('clinical content version history is admin-readable and append-only', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const anonymous = testEnvironment.unauthenticatedContext().firestore();
  const versionPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome/versions/version-1';
  const version = {
    id: 'version-1',
    versionNumber: 1,
    action: 'draft_saved',
    actorId: 'admin',
    createdAt: Timestamp.fromDate(new Date('2026-08-05T00:00:00.000Z')),
    snapshot: {
      contentBlockId: 'welcome',
      type: 'text',
      body: 'Draft learner-facing educational copy.',
      sourceIds: ['acog-labor-delivery'],
      isClinicalClaim: true,
      publicationState: 'draft',
    },
  };

  await assertFails(setDoc(doc(author, versionPath), version));
  await assertSucceeds(setDoc(doc(admin, versionPath), version));
  await assertSucceeds(getDoc(doc(admin, versionPath)));
  await assertFails(getDoc(doc(anonymous, versionPath)));
  await assertFails(
    updateDoc(doc(admin, versionPath), { note: 'An immutable version cannot be edited.' }),
  );
  await assertFails(deleteDoc(doc(admin, versionPath)));
});

test('comparison audit exports are admin-only, attributable, and append-only', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const anonymous = testEnvironment.unauthenticatedContext().firestore();
  const auditPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome/comparisonAuditExports/export-1';
  const auditExport = {
    id: 'export-1',
    courseId: 'birthready',
    moduleId: 'module-1',
    lessonId: 'lesson-1',
    contentBlockId: 'welcome',
    baselineVersionId: 'version-1',
    baselineVersionNumber: 1,
    comparisonVersionId: 'version-2',
    comparisonVersionNumber: 2,
    exportFormat: 'pdf',
    exportRoute: 'web_print',
    exportedBy: 'admin',
    exportedAt: serverTimestamp(),
  };

  await assertFails(setDoc(doc(author, auditPath), auditExport));
  await assertSucceeds(setDoc(doc(admin, auditPath), auditExport));
  await assertSucceeds(getDoc(doc(admin, auditPath)));
  await assertFails(getDoc(doc(anonymous, auditPath)));
  await assertFails(
    updateDoc(doc(admin, auditPath), { exportRoute: 'file_created' }),
  );
  await assertFails(deleteDoc(doc(admin, auditPath)));
  await assertFails(
    setDoc(doc(admin, `${auditPath}-wrong-actor`), {
      ...auditExport,
      id: `${auditExport.id}-wrong-actor`,
      exportedBy: 'other-clinician',
      exportedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(admin, `${auditPath}-invalid`), {
      ...auditExport,
      id: `${auditExport.id}-invalid`,
      comparisonVersionId: auditExport.baselineVersionId,
      exportedAt: serverTimestamp(),
    }),
  );
});

test('only complete, published source records are publicly readable', async () => {
  const admin = userDb('admin', { admin: true });
  const sourceReference = doc(admin, 'sources/acog-labor-delivery');
  const anonymous = testEnvironment.unauthenticatedContext().firestore();

  await assertFails(
    setDoc(sourceReference, {
      id: 'acog-labor-delivery',
      organization: 'ACOG',
      publicationState: 'published',
    }),
  );

  await assertSucceeds(
    setDoc(sourceReference, {
      id: 'acog-labor-delivery',
      organization: 'ACOG',
      title: 'Labor and Delivery',
      url: 'https://www.acog.org/womens-health/pregnancy/labor-and-delivery',
      lastReviewedAt: Timestamp.fromDate(new Date('2026-08-01T00:00:00.000Z')),
      nextReviewAt: Timestamp.fromDate(new Date('2027-08-01T00:00:00.000Z')),
      publicationState: 'published',
    }),
  );

  await assertSucceeds(getDoc(doc(anonymous, 'sources/acog-labor-delivery')));
});

test('a user can access only their own profile, progress, plans, and contacts', async () => {
  const alice = userDb('alice');
  const bob = userDb('bob');

  await assertSucceeds(setDoc(doc(alice, 'users/alice'), { uid: 'alice' }));
  await assertFails(setDoc(doc(alice, 'users/bob'), { uid: 'bob' }));

  await assertSucceeds(
    setDoc(doc(alice, 'users/alice/courseProgress/module-1'), {
      state: 'in_progress',
    }),
  );
  await assertFails(
    setDoc(doc(alice, 'users/bob/courseProgress/module-1'), {
      state: 'in_progress',
    }),
  );

  await assertSucceeds(
    setDoc(doc(alice, 'users/alice/planArtifacts/birth-preferences'), {
      title: 'Birth preferences',
    }),
  );
  await assertFails(getDoc(doc(bob, 'users/alice/planArtifacts/birth-preferences')));

  await assertSucceeds(
    setDoc(doc(alice, 'users/alice/careTeamContacts/default'), {
      laborAndDeliveryTriage: '555-0100',
    }),
  );
  await assertFails(getDoc(doc(bob, 'users/alice/careTeamContacts/default')));
});

test('safety events are server/admin write only', async () => {
  const alice = userDb('alice');
  const admin = userDb('admin', { admin: true });

  await assertFails(
    setDoc(doc(alice, 'users/alice/safetyEvents/event-1'), {
      category: 'maternal_emergency',
    }),
  );
  await assertSucceeds(
    setDoc(doc(admin, 'users/alice/safetyEvents/event-1'), {
      category: 'maternal_emergency',
    }),
  );
  await assertSucceeds(getDoc(doc(alice, 'users/alice/safetyEvents/event-1')));
});

test('support-person invitations are scoped, revocable, and guest updates are limited', async () => {
  const owner = userDb('owner');
  const guest = userDb('guest');
  const unrelatedUser = userDb('unrelated');
  const invite = doc(owner, 'supportInvites/invite-1');

  await assertSucceeds(
    setDoc(invite, {
      ownerId: 'owner',
      guestId: 'guest',
      status: 'pending',
      sharedArtifactIds: ['labor-comfort-menu'],
    }),
  );

  await assertSucceeds(getDoc(doc(guest, 'supportInvites/invite-1')));
  await assertFails(getDoc(doc(unrelatedUser, 'supportInvites/invite-1')));

  await assertSucceeds(
    updateDoc(doc(guest, 'supportInvites/invite-1'), {
      status: 'accepted',
      acceptedAt: Timestamp.fromDate(new Date('2026-08-05T00:00:00.000Z')),
    }),
  );
  await assertFails(
    updateDoc(doc(guest, 'supportInvites/invite-1'), {
      sharedArtifactIds: ['private-health-history'],
    }),
  );
  await assertFails(
    updateDoc(doc(guest, 'supportInvites/invite-1'), {
      status: 'revoked',
    }),
  );

  await assertSucceeds(
    updateDoc(doc(owner, 'supportInvites/invite-1'), {
      status: 'revoked',
    }),
  );
});
