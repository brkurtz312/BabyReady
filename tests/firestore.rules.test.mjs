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
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
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
  title: 'Welcome',
  displayOrder: 1,
  type: 'text',
  body: 'Clinically reviewed educational copy.',
  isClinicalClaim: true,
  sourceIds: ['acog-labor-delivery'],
  mediaIds: [],
  clinicalReviewerId: 'admin',
  lastReviewedAt: Timestamp.fromDate(new Date('2026-08-01T00:00:00.000Z')),
  nextReviewAt: Timestamp.fromDate(new Date('2027-08-01T00:00:00.000Z')),
  publicationState: 'published',
  ...overrides,
});

const auditReportManifest = (overrides = {}) => ({
  id: 'BR-AUDIT-20260805-010203004Z',
  reportId: 'BR-AUDIT-20260805-010203004Z',
  exportFormat: 'pdf',
  exportRoute: 'web_print',
  exportedBy: 'admin',
  exportedAt: serverTimestamp(),
  filterSnapshot: {
    scope: 'module-1',
    clinicianId: '',
    exportRoute: 'all',
    startDate: '',
    endDate: '',
    versionNumber: '',
  },
  recordCount: 2,
  pageCount: 1,
  auditRecordIds: ['export-1', 'export-2'],
  auditRecordPaths: [
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome/comparisonAuditExports/export-1',
    'courses/birthready/modules/module-2/lessons/lesson-2/contentBlocks/breathing/comparisonAuditExports/export-2',
  ],
  ...overrides,
});

const mediaIntakeCandidate = (overrides = {}) => ({
  inputType: 'video_url',
  originalUrl: 'https://www.youtube.com/watch?v=example',
  transcriptUrl: 'https://www.youtube.com/watch?v=example',
  attestedNoPatientInformation: true,
  status: 'queued',
  submittedBy: 'admin',
  submittedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const birthReadinessBrief = (overrides = {}) => ({
  id: 'preparing-for-labor',
  courseId: 'preparing-for-labor',
  schemaVersion: 1,
  readinessItems: {
    careTeamContactConfirmed: false,
    afterHoursPlanConfirmed: false,
    arrivalLocationConfirmed: false,
    transportationPlanDiscussed: false,
    supportPersonPlanDiscussed: false,
    questionsPrepared: false,
  },
  discussionQuestions: ['What should I review with my care team?'],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
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

test('learners can read only published blocks within a published course', async () => {
  const publishedBlockPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/published-welcome';
  const draftBlockPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/draft-welcome';
  const anonymous = testEnvironment.unauthenticatedContext().firestore();

  await seed('courses/birthready', courseData('published'));
  await seed(
    publishedBlockPath,
    clinicalBlock({ id: 'published-welcome', publicationState: 'published' }),
  );
  await seed(
    draftBlockPath,
    clinicalBlock({
      id: 'draft-welcome',
      publicationState: 'draft',
      clinicalReviewerId: null,
      lastReviewedAt: null,
      nextReviewAt: null,
    }),
  );

  await assertSucceeds(getDoc(doc(anonymous, publishedBlockPath)));
  await assertFails(getDoc(doc(anonymous, draftBlockPath)));

  const publishedLessonQuery = query(
    collection(
      anonymous,
      'courses',
      'birthready',
      'modules',
      'module-1',
      'lessons',
      'lesson-1',
      'contentBlocks',
    ),
    where('publicationState', '==', 'published'),
  );
  const publishedBlocks = await assertSucceeds(getDocs(publishedLessonQuery));
  assert.equal(publishedBlocks.size, 1);
  assert.equal(publishedBlocks.docs[0].id, 'published-welcome');
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

test('only administrators can query clinical content across the review queue', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const firstBlockPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome';
  const secondBlockPath =
    'courses/birthready/modules/module-2/lessons/lesson-2/contentBlocks/check-in';

  await seed(firstBlockPath, clinicalBlock({
    publicationState: 'draft',
    clinicalReviewerId: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    updatedAt: Timestamp.fromDate(new Date('2026-08-08T00:00:00.000Z')),
  }));
  await seed(secondBlockPath, clinicalBlock({
    id: 'check-in',
    moduleId: 'module-2',
    lessonId: 'lesson-2',
    publicationState: 'submitted',
    updatedAt: Timestamp.fromDate(new Date('2026-08-08T01:00:00.000Z')),
  }));

  const adminQueue = query(
    collectionGroup(admin, 'contentBlocks'),
    orderBy('updatedAt', 'desc'),
    limit(50),
  );
  const results = await assertSucceeds(getDocs(adminQueue));
  assert.equal(results.size, 2);
  assert.equal(results.docs[0].id, 'check-in');

  const authorQueue = query(
    collectionGroup(author, 'contentBlocks'),
    orderBy('updatedAt', 'desc'),
    limit(50),
  );
  await assertFails(getDocs(authorQueue));
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
      title: 'Welcome',
      displayOrder: 1,
      type: 'text',
      body: 'Draft learner-facing educational copy.',
      sourceIds: ['acog-labor-delivery'],
      mediaIds: [],
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

test('learner display order must be a positive whole number and is auditable', async () => {
  const admin = userDb('admin', { admin: true });
  const blockPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome';
  const versionPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome/versions/order-update';

  await assertSucceeds(
    setDoc(doc(admin, blockPath), clinicalBlock({ displayOrder: 2 })),
  );
  await assertFails(
    setDoc(
      doc(admin, `${blockPath}-invalid-order`),
      clinicalBlock({ id: 'invalid-order', displayOrder: 0 }),
    ),
  );
  await assertFails(
    setDoc(
      doc(admin, `${blockPath}-missing-title`),
      clinicalBlock({ id: 'invalid-title', title: 42 }),
    ),
  );

  await assertSucceeds(
    setDoc(doc(admin, versionPath), {
      id: 'order-update',
      versionNumber: 2,
      action: 'order_updated',
      actorId: 'admin',
      createdAt: Timestamp.fromDate(new Date('2026-08-08T00:00:00.000Z')),
      snapshot: {
        contentBlockId: 'welcome',
        title: 'Welcome',
        displayOrder: 2,
        type: 'text',
        body: 'Clinically reviewed educational copy.',
        sourceIds: ['acog-labor-delivery'],
        mediaIds: [],
        isClinicalClaim: true,
        publicationState: 'published',
      },
    }),
  );
});

test('published clinical media is learner-readable, while drafts remain administrator-only', async () => {
  const anonymous = testEnvironment.unauthenticatedContext().firestore();
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const publishedMedia = {
    id: 'early-pregnancy-care-timeline',
    title: 'Early Pregnancy Care Timeline',
    type: 'figure',
    assetKey: 'early-pregnancy-care-timeline',
    altText: 'A timeline showing common early pregnancy care milestones.',
    sourceIds: ['acog-prenatal-care-2026'],
    isClinicalClaim: true,
    clinicalReviewerId: 'admin',
    lastReviewedAt: Timestamp.fromDate(new Date('2026-08-08T00:00:00.000Z')),
    nextReviewAt: Timestamp.fromDate(new Date('2027-08-08T00:00:00.000Z')),
    publicationState: 'published',
  };

  await assertFails(
    setDoc(doc(author, 'clinicalMedia', publishedMedia.id), publishedMedia),
  );
  await assertSucceeds(
    setDoc(doc(admin, 'clinicalMedia', publishedMedia.id), publishedMedia),
  );
  await assertSucceeds(
    setDoc(doc(admin, 'clinicalMedia', 'bleeding-during-pregnancy-contact-care'), {
      ...publishedMedia,
      id: 'bleeding-during-pregnancy-contact-care',
      title: 'Bleeding During Pregnancy: Contact Your Care Team',
      assetKey: 'bleeding-during-pregnancy-contact-care',
    }),
  );
  await assertSucceeds(
    setDoc(doc(admin, 'clinicalMedia', 'urgent-maternal-warning-signs-get-help-now'), {
      ...publishedMedia,
      id: 'urgent-maternal-warning-signs-get-help-now',
      title: 'Urgent Warning Signs: Get Help Now',
      assetKey: 'urgent-maternal-warning-signs-get-help-now',
    }),
  );
  await assertFails(
    setDoc(doc(admin, 'clinicalMedia', 'unapproved-figure'), {
      ...publishedMedia,
      id: 'unapproved-figure',
      assetKey: 'unapproved-figure',
    }),
  );
  await assertFails(
    setDoc(doc(admin, 'clinicalMedia', 'mismatched-media-id'), {
      ...publishedMedia,
      id: publishedMedia.id,
    }),
  );
  await assertSucceeds(
    getDoc(doc(anonymous, 'clinicalMedia', publishedMedia.id)),
  );

  await seed('clinicalMedia/draft-figure', {
    ...publishedMedia,
    id: 'draft-figure',
    publicationState: 'draft',
    clinicalReviewerId: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  });
  await assertFails(getDoc(doc(anonymous, 'clinicalMedia/draft-figure')));
  await assertSucceeds(getDoc(doc(admin, 'clinicalMedia/draft-figure')));
});

test('published external videos require controlled provider, transcript, and immutable metadata', async () => {
  const anonymous = testEnvironment.unauthenticatedContext().firestore();
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const externalVideo = {
    id: 'cdc-hear-her-allyson-felix',
    title: 'CDC Hear Her: A Conversation with Allyson Felix',
    type: 'external_video',
    assetKey: 'external-video',
    altText:
      'A CDC video interview about urgent maternal warning signs and speaking up during pregnancy.',
    externalUrl: 'https://www.youtube.com/watch?v=zG_W5Q9NbCE',
    transcriptUrl: 'https://www.youtube.com/watch?v=zG_W5Q9NbCE',
    publisher: 'Centers for Disease Control and Prevention',
    language: 'en',
    durationSeconds: 788,
    sourceIds: ['cdc-urgent-maternal-warning-signs-2026'],
    isClinicalClaim: true,
    clinicalReviewerId: 'admin',
    lastReviewedAt: Timestamp.fromDate(new Date('2026-08-08T00:00:00.000Z')),
    nextReviewAt: Timestamp.fromDate(new Date('2027-08-08T00:00:00.000Z')),
    publicationState: 'published',
  };

  await assertFails(
    setDoc(doc(author, 'clinicalMedia', externalVideo.id), externalVideo),
  );
  await assertSucceeds(
    setDoc(doc(admin, 'clinicalMedia', externalVideo.id), externalVideo),
  );
  await assertSucceeds(getDoc(doc(anonymous, 'clinicalMedia', externalVideo.id)));

  await assertFails(
    setDoc(doc(admin, 'clinicalMedia', 'unsafe-external-video'), {
      ...externalVideo,
      id: 'unsafe-external-video',
      externalUrl: 'http://example.invalid/video',
    }),
  );
  await assertFails(
    setDoc(doc(admin, 'clinicalMedia', 'missing-video-transcript'), {
      ...externalVideo,
      id: 'missing-video-transcript',
      transcriptUrl: '',
    }),
  );

  const versionPath = `clinicalMedia/${externalVideo.id}/versions/version-1`;
  await assertSucceeds(
    setDoc(doc(admin, versionPath), {
      id: 'version-1',
      versionNumber: 1,
      action: 'published',
      actorId: 'admin',
      createdAt: Timestamp.fromDate(new Date('2026-08-08T00:00:00.000Z')),
      snapshot: {
        mediaId: externalVideo.id,
        title: externalVideo.title,
        type: externalVideo.type,
        assetKey: externalVideo.assetKey,
        altText: externalVideo.altText,
        externalUrl: externalVideo.externalUrl,
        transcriptUrl: externalVideo.transcriptUrl,
        publisher: externalVideo.publisher,
        language: externalVideo.language,
        durationSeconds: externalVideo.durationSeconds,
        sourceIds: externalVideo.sourceIds,
        isClinicalClaim: externalVideo.isClinicalClaim,
        publicationState: externalVideo.publicationState,
      },
    }),
  );
  await assertFails(
    updateDoc(doc(admin, versionPath), { title: 'Changed after publication.' }),
  );
});

test('media review queue, immutable versions, and clinical approval records are administrator-governed', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const anonymous = testEnvironment.unauthenticatedContext().firestore();
  const mediaPath = 'clinicalMedia/nausea-support-ideas';
  const versionPath = `${mediaPath}/versions/version-1`;
  const reviewPath = 'clinicalMediaReviews/review-1';
  const submittedMedia = {
    id: 'nausea-support-ideas',
    title: 'Nausea-Support Ideas',
    type: 'figure',
    assetKey: 'nausea-support-ideas',
    altText: 'A figure with practical nausea-support ideas for early pregnancy.',
    sourceIds: ['acog-morning-sickness-2025'],
    isClinicalClaim: true,
    clinicalReviewerId: null,
    lastReviewedAt: Timestamp.fromDate(new Date('2026-08-08T00:00:00.000Z')),
    nextReviewAt: Timestamp.fromDate(new Date('2027-08-08T00:00:00.000Z')),
    publicationState: 'submitted',
    versionCount: 1,
    updatedAt: Timestamp.fromDate(new Date('2026-08-09T00:00:00.000Z')),
  };
  const submittedVersion = {
    id: 'version-1',
    versionNumber: 1,
    action: 'submitted',
    actorId: 'admin',
    createdAt: Timestamp.fromDate(new Date('2026-08-09T00:00:00.000Z')),
    snapshot: {
      mediaId: 'nausea-support-ideas',
      title: 'Nausea-Support Ideas',
      type: 'figure',
      assetKey: 'nausea-support-ideas',
      altText: 'A figure with practical nausea-support ideas for early pregnancy.',
      sourceIds: ['acog-morning-sickness-2025'],
      isClinicalClaim: true,
      publicationState: 'submitted',
    },
  };

  await seed(mediaPath, submittedMedia);
  await assertSucceeds(setDoc(doc(admin, versionPath), submittedVersion));
  await assertFails(getDoc(doc(author, versionPath)));
  await assertFails(getDoc(doc(anonymous, versionPath)));
  await assertFails(
    updateDoc(doc(admin, versionPath), { note: 'Immutable records cannot change.' }),
  );
  await assertFails(deleteDoc(doc(admin, versionPath)));

  const adminQueue = query(
    collection(admin, 'clinicalMedia'),
    orderBy('updatedAt', 'desc'),
    limit(50),
  );
  const queueResults = await assertSucceeds(getDocs(adminQueue));
  assert.equal(queueResults.size, 1);
  assert.equal(queueResults.docs[0].id, 'nausea-support-ideas');

  const authorQueue = query(
    collection(author, 'clinicalMedia'),
    orderBy('updatedAt', 'desc'),
    limit(50),
  );
  await assertFails(getDocs(authorQueue));

  const approvalRecord = {
    id: 'review-1',
    mediaId: 'nausea-support-ideas',
    reviewerId: 'admin',
    reviewNotes: 'Reviewed linked source, learner-facing phrasing, and alt text.',
    versionNumber: 2,
    approvedAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(admin, reviewPath), approvalRecord));

  const approvalVersion = {
    ...submittedVersion,
    id: 'version-2',
    versionNumber: 2,
    action: 'approved',
    createdAt: serverTimestamp(),
    snapshot: {
      ...submittedVersion.snapshot,
      publicationState: 'approved',
    },
  };
  const approvalBatch = writeBatch(admin);
  approvalBatch.update(doc(admin, mediaPath), {
    publicationState: 'approved',
    clinicalReviewerId: 'admin',
    lastReviewedAt: serverTimestamp(),
    nextReviewAt: Timestamp.fromDate(new Date('2027-08-10T00:00:00.000Z')),
    versionCount: 2,
    updatedAt: serverTimestamp(),
  });
  approvalBatch.set(doc(admin, `${mediaPath}/versions/version-2`), approvalVersion);
  approvalBatch.set(doc(admin, reviewPath), approvalRecord);
  await assertSucceeds(approvalBatch.commit());

  await assertSucceeds(getDoc(doc(admin, reviewPath)));
  await assertFails(getDoc(doc(author, reviewPath)));
  await assertFails(getDoc(doc(anonymous, reviewPath)));
  await assertFails(
    updateDoc(doc(admin, reviewPath), { reviewNotes: 'Changed after the fact.' }),
  );
  await assertFails(deleteDoc(doc(admin, reviewPath)));
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

test('administrators can query cross-content comparison audit exports', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const firstAuditPath =
    'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome/comparisonAuditExports/export-1';
  const secondAuditPath =
    'courses/birthready/modules/module-2/lessons/lesson-2/contentBlocks/breathing/comparisonAuditExports/export-2';
  const firstAudit = {
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
    exportedAt: Timestamp.fromDate(new Date('2026-08-05T00:00:00.000Z')),
  };

  await seed(firstAuditPath, firstAudit);
  await seed(secondAuditPath, {
    ...firstAudit,
    id: 'export-2',
    moduleId: 'module-2',
    lessonId: 'lesson-2',
    contentBlockId: 'breathing',
    exportRoute: 'native_share',
    exportedAt: Timestamp.fromDate(new Date('2026-08-05T01:00:00.000Z')),
  });

  const adminQuery = query(
    collectionGroup(admin, 'comparisonAuditExports'),
    orderBy('exportedAt', 'desc'),
    limit(200),
  );
  const results = await assertSucceeds(getDocs(adminQuery));
  assert.equal(results.size, 2);
  assert.equal(results.docs[0].id, 'export-2');

  const authorQuery = query(
    collectionGroup(author, 'comparisonAuditExports'),
    orderBy('exportedAt', 'desc'),
    limit(200),
  );
  await assertFails(getDocs(authorQuery));
});

test('audit report manifests are admin-only, attributable, and append-only', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const anonymous = testEnvironment.unauthenticatedContext().firestore();
  const reportId = 'BR-AUDIT-20260805-010203004Z';
  const manifestPath = `auditReportManifests/${reportId}`;
  const manifest = auditReportManifest();

  await assertFails(setDoc(doc(author, manifestPath), manifest));
  await assertSucceeds(setDoc(doc(admin, manifestPath), manifest));
  await assertSucceeds(getDoc(doc(admin, manifestPath)));
  await assertFails(getDoc(doc(author, manifestPath)));
  await assertFails(getDoc(doc(anonymous, manifestPath)));
  await assertFails(
    updateDoc(doc(admin, manifestPath), { recordCount: 3 }),
  );
  await assertFails(deleteDoc(doc(admin, manifestPath)));
  await assertFails(
    setDoc(
      doc(admin, 'auditReportManifests/BR-AUDIT-20260805-WRONG'),
      auditReportManifest({
        exportedAt: serverTimestamp(),
      }),
    ),
  );
  await assertFails(
    setDoc(
      doc(admin, 'auditReportManifests/BR-AUDIT-20260805-INVALID'),
      auditReportManifest({
        id: 'BR-AUDIT-20260805-INVALID',
        reportId: 'BR-AUDIT-20260805-INVALID',
        recordCount: 2,
        auditRecordIds: ['export-1'],
        auditRecordPaths: [
          'courses/birthready/modules/module-1/lessons/lesson-1/contentBlocks/welcome/comparisonAuditExports/export-1',
        ],
        exportedAt: serverTimestamp(),
      }),
    ),
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

test('media intake is clinician-only, source-immutable, and assessment snapshots are worker-only', async () => {
  const author = userDb('author');
  const admin = userDb('admin', { admin: true });
  const anonymous = testEnvironment.unauthenticatedContext().firestore();
  const intakePath = 'mediaIntakes/cdc-video';

  await assertFails(setDoc(doc(author, intakePath), mediaIntakeCandidate({ submittedBy: 'author' })));
  await assertSucceeds(setDoc(doc(admin, intakePath), mediaIntakeCandidate()));
  await assertSucceeds(getDoc(doc(admin, intakePath)));
  await assertFails(getDoc(doc(anonymous, intakePath)));
  await assertFails(
    updateDoc(doc(admin, intakePath), {
      originalUrl: 'https://example.com/replaced',
      status: 'held',
      finalDisposition: 'held',
      decisionNote: 'Changed source.',
      decidedBy: 'admin',
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(admin, intakePath), {
      status: 'held',
      finalDisposition: 'held',
      decisionNote: 'Hold for clinical review of accessibility details.',
      decidedBy: 'admin',
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(admin, `${intakePath}/analyses/analysis-1`), {
      id: 'analysis-1',
      intakeId: 'cdc-video',
      status: 'complete',
    }),
  );
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

test('a learner alone can create, read, update, and delete their Birth Readiness Brief', async () => {
  const alice = userDb('alice');
  const bob = userDb('bob');
  const path = 'users/alice/birthReadinessBriefs/preparing-for-labor';
  const aliceBrief = doc(alice, path);

  await assertSucceeds(setDoc(aliceBrief, birthReadinessBrief()));
  await assertSucceeds(getDoc(aliceBrief));
  await assertFails(getDoc(doc(bob, path)));
  await assertFails(setDoc(doc(bob, path), birthReadinessBrief()));

  await assertSucceeds(
    updateDoc(aliceBrief, {
      readinessItems: {
        careTeamContactConfirmed: true,
        afterHoursPlanConfirmed: false,
        arrivalLocationConfirmed: false,
        transportationPlanDiscussed: false,
        supportPersonPlanDiscussed: false,
        questionsPrepared: true,
      },
      discussionQuestions: ['Who should my support person contact after hours?'],
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(deleteDoc(aliceBrief));
});

test('Birth Readiness Brief rules reject invalid IDs, fields, and readiness values', async () => {
  const alice = userDb('alice');

  await assertFails(
    setDoc(
      doc(alice, 'users/alice/birthReadinessBriefs/a-different-brief'),
      birthReadinessBrief(),
    ),
  );
  await assertFails(
    setDoc(
      doc(alice, 'users/alice/birthReadinessBriefs/preparing-for-labor'),
      birthReadinessBrief({ unexpectedField: true }),
    ),
  );
  await assertFails(
    setDoc(
      doc(alice, 'users/alice/birthReadinessBriefs/preparing-for-labor'),
      birthReadinessBrief({
        readinessItems: {
          careTeamContactConfirmed: 'yes',
          afterHoursPlanConfirmed: false,
          arrivalLocationConfirmed: false,
          transportationPlanDiscussed: false,
          supportPersonPlanDiscussed: false,
          questionsPrepared: false,
        },
      }),
    ),
  );
});

test('Birth Readiness Brief rules enforce bounded, trimmed discussion questions', async () => {
  const alice = userDb('alice');
  const path = 'users/alice/birthReadinessBriefs/preparing-for-labor';

  await assertSucceeds(
    setDoc(
      doc(alice, path),
      birthReadinessBrief({
        discussionQuestions: Array.from(
          { length: 10 },
          (_, index) => `Question ${index + 1}`,
        ),
      }),
    ),
  );
  await assertFails(
    updateDoc(doc(alice, path), {
      discussionQuestions: Array.from(
        { length: 11 },
        (_, index) => `Question ${index + 1}`,
      ),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(alice, path), {
      discussionQuestions: ['x'.repeat(281)],
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(alice, path), {
      discussionQuestions: [' A question that was not trimmed '],
      updatedAt: serverTimestamp(),
    }),
  );
});

test('Birth Readiness Brief timestamps must be server-generated and preserve createdAt', async () => {
  const alice = userDb('alice');
  const path = 'users/alice/birthReadinessBriefs/preparing-for-labor';
  const brief = doc(alice, path);
  const clientTimestamp = Timestamp.fromDate(new Date('2026-08-01T00:00:00.000Z'));

  await assertFails(
    setDoc(
      brief,
      birthReadinessBrief({
        createdAt: clientTimestamp,
        updatedAt: clientTimestamp,
      }),
    ),
  );
  await assertSucceeds(setDoc(brief, birthReadinessBrief()));
  await assertFails(
    updateDoc(brief, {
      updatedAt: clientTimestamp,
    }),
  );
  await assertFails(
    updateDoc(brief, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

const birthReadinessReflection = (overrides = {}) => ({
  courseId: 'labor-basics',
  lessonId: 'how-labor-begins',
  slideId: 'your-call-plan',
  text: 'Call when contractions are 5-1-1.',
  updatedAt: serverTimestamp(),
  ...overrides,
});

test('a learner alone can save, read, and delete their class reflections', async () => {
  const alice = userDb('alice');
  const bob = userDb('bob');
  const path = 'users/alice/birthReadinessReflections/how-labor-begins__your-call-plan';
  const reflection = doc(alice, path);

  await assertSucceeds(setDoc(reflection, birthReadinessReflection()));
  await assertSucceeds(getDoc(reflection));
  await assertSucceeds(getDocs(collection(alice, 'users/alice/birthReadinessReflections')));
  await assertFails(getDoc(doc(bob, path)));
  await assertFails(setDoc(doc(bob, path), birthReadinessReflection()));
  await assertSucceeds(
    setDoc(reflection, birthReadinessReflection({ text: 'Updated answer.' })),
  );
  await assertFails(deleteDoc(doc(bob, path)));
  await assertSucceeds(deleteDoc(reflection));
});

test('class reflection rules reject mismatched ids, extra fields, and unbounded text', async () => {
  const alice = userDb('alice');
  const path = 'users/alice/birthReadinessReflections/how-labor-begins__your-call-plan';

  await assertFails(
    setDoc(
      doc(alice, 'users/alice/birthReadinessReflections/some-other-id'),
      birthReadinessReflection(),
    ),
  );
  await assertFails(setDoc(doc(alice, path), birthReadinessReflection({ prompt: 'Injected' })));
  await assertFails(setDoc(doc(alice, path), birthReadinessReflection({ text: '' })));
  await assertFails(setDoc(doc(alice, path), birthReadinessReflection({ text: 'x'.repeat(2001) })));
  await assertSucceeds(setDoc(doc(alice, path), birthReadinessReflection({ text: 'x'.repeat(2000) })));
  await assertFails(setDoc(doc(alice, path), birthReadinessReflection({ courseId: 'Labor Basics!' })));
  await assertFails(
    setDoc(
      doc(alice, path),
      birthReadinessReflection({
        updatedAt: Timestamp.fromDate(new Date('2026-08-01T00:00:00.000Z')),
      }),
    ),
  );
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
