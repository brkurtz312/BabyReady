import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const shouldApply = process.env.APPLY_CONTENT_ORDER_MIGRATION === '1';
const migrationActorId = process.env.CONTENT_ORDER_ACTOR_ID?.trim();

if (!projectId) {
  throw new Error(
    'Set FIREBASE_PROJECT_ID to the production Firebase project before preparing the content-order migration.',
  );
}
if (shouldApply && !migrationActorId) {
  throw new Error(
    'Set CONTENT_ORDER_ACTOR_ID to the clinician Firebase user ID before applying the content-order migration.',
  );
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();
const courseId = 'early-pregnancy-basics';
const moduleId = 'first-trimester-comfort-and-care';
const lessonId = 'common-changes-simple-support-and-when-to-reach-out';

const orderedBlocks = [
  {
    id: 'first-trimester-common-changes-and-when-to-reach-out',
    displayOrder: 1,
    label: 'Common Changes, Simple Support, and When to Reach Out',
  },
  {
    id: 'nausea-support-ideas-figure',
    displayOrder: 2,
    label: 'Nausea-Support Ideas',
  },
  {
    id: 'bleeding-during-pregnancy-callout',
    displayOrder: 3,
    label: 'Bleeding During Pregnancy',
  },
  {
    id: 'urgent-maternal-warning-signs-safety-card',
    displayOrder: 4,
    label: 'Urgent Maternal Warning Signs',
  },
];

function contentBlockReference(contentBlockId) {
  return db
    .collection('courses')
    .doc(courseId)
    .collection('modules')
    .doc(moduleId)
    .collection('lessons')
    .doc(lessonId)
    .collection('contentBlocks')
    .doc(contentBlockId);
}

function currentOrder(data) {
  return typeof data.displayOrder === 'number' ? data.displayOrder : '(unset)';
}

function assertEligible(snapshot, block) {
  if (!snapshot.exists) {
    throw new Error(`STOP: no changes made; ${block.id} was not found.`);
  }

  const data = snapshot.data();
  if (data.publicationState !== 'published') {
    throw new Error(
      `STOP: no changes made; ${block.id} must be published. Current state: ${String(data.publicationState)}.`,
    );
  }

  if (Object.hasOwn(data, 'displayOrder')) {
    throw new Error(
      `STOP: no changes made; ${block.id} already has learner display order ${String(data.displayOrder)}.`,
    );
  }

  return data;
}

const references = orderedBlocks.map((block) => contentBlockReference(block.id));
const snapshots = await Promise.all(references.map((reference) => reference.get()));
const preflight = snapshots.map((snapshot, index) => ({
  ...orderedBlocks[index],
  currentOrder: currentOrder(assertEligible(snapshot, orderedBlocks[index])),
  publicationState: snapshot.data().publicationState,
}));

console.table(
  preflight.map(({ id, label, currentOrder: priorOrder, displayOrder, publicationState }) => ({
    id,
    title: label,
    currentOrder: priorOrder,
    newOrder: displayOrder,
    publicationState,
  })),
);

if (!shouldApply) {
  console.log(
    'DRY RUN: no changes were made. After deploying the updated Firestore rules, rerun with APPLY_CONTENT_ORDER_MIGRATION=1 and CONTENT_ORDER_ACTOR_ID set to the reviewing clinician’s Firebase user ID to apply this immutable, audited order migration.',
  );
  process.exit(0);
}

await db.runTransaction(async (transaction) => {
  const transactionSnapshots = await Promise.all(
    references.map((reference) => transaction.get(reference)),
  );

  for (const [index, snapshot] of transactionSnapshots.entries()) {
    const block = orderedBlocks[index];
    const data = assertEligible(snapshot, block);
    const reference = references[index];
    const versionNumber =
      (typeof data.versionCount === 'number' ? data.versionCount : 0) + 1;
    const versionReference = reference.collection('versions').doc();

    transaction.update(reference, {
      displayOrder: block.displayOrder,
      versionCount: versionNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(versionReference, {
      id: versionReference.id,
      versionNumber,
      action: 'order_updated',
      actorId: migrationActorId,
      createdAt: FieldValue.serverTimestamp(),
      note: 'Assigned learner display order during the first-trimester content-order migration.',
      snapshot: {
        contentBlockId: reference.id,
        displayOrder: block.displayOrder,
        type: data.type,
        body: data.body,
        sourceIds: Array.isArray(data.sourceIds) ? data.sourceIds : [],
        mediaIds: Array.isArray(data.mediaIds) ? data.mediaIds : [],
        isClinicalClaim: data.isClinicalClaim === true,
        publicationState: data.publicationState,
      },
    });
  }
});

console.log(
  'SUCCESS: All four published First-Trimester content blocks were ordered atomically and each received an immutable order_updated version.',
);
