import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

if (!projectId) {
  throw new Error(
    'Set FIREBASE_PROJECT_ID to the production Firebase project before adding the learner course outline.',
  );
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();
const courseId = 'early-pregnancy-basics';
const courseReference = db.collection('courses').doc(courseId);
const courseSnapshot = await courseReference.get();

if (!courseSnapshot.exists) {
  throw new Error(
    `STOP: no changes made; course ${courseId} was not found.`,
  );
}

if (courseSnapshot.data().publicationState !== 'published') {
  throw new Error(
    `STOP: no changes made; course ${courseId} must be published before its learner outline is added.`,
  );
}

const learnerOutline = [
  {
    id: 'getting-started',
    order: 1,
    title: 'Getting Started',
    summary: 'A practical first look at early pregnancy care and next steps.',
    lessons: [
      {
        id: 'first-steps',
        title: 'Your First Steps',
        summary:
          'Learn what to expect in early pregnancy and how to prepare for your first prenatal care conversations.',
        estimatedMinutes: 8,
      },
    ],
  },
];

await courseReference.set(
  {
    learnerOutline,
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.table(
  learnerOutline.flatMap((module) =>
    module.lessons.map((lesson) => ({
      courseId,
      module: module.title,
      lesson: lesson.title,
      estimatedMinutes: lesson.estimatedMinutes,
    })),
  ),
);
console.log(
  'SUCCESS: Learner navigation was added to the published Early Pregnancy Basics course. No clinical content, source, or media records were changed.',
);
