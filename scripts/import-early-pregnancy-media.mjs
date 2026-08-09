import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

if (!projectId) {
  throw new Error(
    'Set FIREBASE_PROJECT_ID to the production Firebase project before importing media.',
  );
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();
const lastReviewedAt = new Date('2026-08-08T12:00:00-05:00');
const nextReviewAt = new Date('2027-08-08T12:00:00-05:00');

const drafts = [
  {
    id: 'early-pregnancy-care-timeline',
    title: 'Early Pregnancy Care Timeline',
    type: 'figure',
    assetKey: 'early-pregnancy-care-timeline',
    altText:
      'A vertically arranged timeline of common early pregnancy care milestones, including confirming pregnancy, a first prenatal visit, routine screening discussions, and planning the next visit with the obstetric care team.',
    caption:
      'A general early-pregnancy care timeline. Your own visits and tests may differ based on your health history and care plan.',
    sourceIds: ['acog-prenatal-care-2026'],
  },
  {
    id: 'folic-acid-early-pregnancy',
    title: 'Folic Acid in Early Pregnancy',
    type: 'figure',
    assetKey: 'folic-acid-early-pregnancy',
    altText:
      'An educational figure explaining that folic acid is a B vitamin commonly included in prenatal vitamins and that people should ask their obstetric clinician about the right supplement plan for them.',
    caption:
      'Ask your obstetric clinician which prenatal vitamin and folic-acid plan is right for you.',
    sourceIds: ['cdc-folic-acid-2025'],
  },
  {
    id: 'nausea-support-ideas',
    title: 'Nausea-Support Ideas',
    type: 'figure',
    assetKey: 'nausea-support-ideas',
    altText:
      'A set of practical early-pregnancy nausea-support ideas, such as small frequent meals, hydration, rest, and contacting an obstetric clinician when symptoms are severe or persistent.',
    caption:
      'Nausea can be common in pregnancy. Contact your obstetric team if you cannot keep fluids down, have concerning symptoms, or need individualized guidance.',
    sourceIds: ['acog-morning-sickness-2025'],
  },
];

const references = drafts.map((draft) => db.collection('clinicalMedia').doc(draft.id));
const existing = await Promise.all(references.map((reference) => reference.get()));
const existingIds = existing
  .filter((snapshot) => snapshot.exists)
  .map((snapshot) => snapshot.id);

if (existingIds.length) {
  throw new Error(
    `STOP: no changes made; media IDs already exist: ${existingIds.join(', ')}`,
  );
}

const batch = db.batch();
for (const draft of drafts) {
  batch.create(db.collection('clinicalMedia').doc(draft.id), {
    ...draft,
    isClinicalClaim: true,
    publicationState: 'draft',
    clinicalReviewerId: null,
    lastReviewedAt,
    nextReviewAt,
    createdBy: 'initial-media-import',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

await batch.commit();

console.table(
  drafts.map((draft) => ({
    id: draft.id,
    state: 'draft',
    title: draft.title,
  })),
);
console.log(
  'SUCCESS: Three unpublished clinical-media drafts were created. Review and publish them in BabyReady’s Figure and media library.',
);
