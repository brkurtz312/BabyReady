import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';

import { requireAuth, requireFirestore } from '../lib/firebase';
import type {
  ClinicalContentBlock,
  ClinicalReview,
  ContentPublicationState,
  CourseRecord,
} from '../models/course';

type CreateCourseInput = {
  courseId: string;
  title: string;
  summary: string;
  locale?: string;
};

type UpsertContentBlockInput = Omit<
  ClinicalContentBlock,
  'lastReviewedAt' | 'nextReviewAt' | 'publicationState'
> & {
  lastReviewedAt?: Date;
  nextReviewAt?: Date;
  publicationState?: ContentPublicationState;
};

function validateContentBlockInput(input: UpsertContentBlockInput): void {
  const identifierFields = [
    ['course ID', input.courseId],
    ['module ID', input.moduleId],
    ['lesson ID', input.lessonId],
    ['content block ID', input.id],
  ] as const;

  if (
    identifierFields.some(
      ([, value]) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    )
  ) {
    throw new Error(
      'Use lowercase letters, numbers, and single hyphens for course, module, lesson, and content block IDs.',
    );
  }
  if (!input.body.trim()) {
    throw new Error('Add learner-facing content before saving this block.');
  }
  if (input.sourceIds.some((sourceId) => !sourceId.trim())) {
    throw new Error('Remove any empty source attachments before saving.');
  }
}

async function requireAdminClaim(): Promise<string> {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in with a clinician or administrator account to manage clinical content.');
  }

  const token = await user.getIdTokenResult();
  if (token.claims.admin !== true) {
    throw new Error('Clinical content changes require the Firebase admin custom claim.');
  }

  return user.uid;
}

function courseReference(courseId: string): DocumentReference {
  return doc(requireFirestore(), 'courses', courseId);
}

function contentBlockReference(
  courseId: string,
  moduleId: string,
  lessonId: string,
  contentBlockId: string,
): DocumentReference {
  return doc(
    requireFirestore(),
    'courses',
    courseId,
    'modules',
    moduleId,
    'lessons',
    lessonId,
    'contentBlocks',
    contentBlockId,
  );
}

export async function createCourseDraft(input: CreateCourseInput): Promise<void> {
  const adminId = await requireAdminClaim();

  await setDoc(courseReference(input.courseId), {
    id: input.courseId,
    title: input.title,
    summary: input.summary,
    locale: input.locale ?? 'en-US',
    publicationState: 'draft',
    createdBy: adminId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies CourseRecord);
}

export async function upsertClinicalContentBlock(
  input: UpsertContentBlockInput,
): Promise<void> {
  await requireAdminClaim();
  validateContentBlockInput(input);

  const reference = contentBlockReference(
    input.courseId,
    input.moduleId,
    input.lessonId,
    input.id,
  );

  await setDoc(
    reference,
    {
      ...input,
      sourceIds: input.sourceIds ?? [],
      publicationState: input.publicationState ?? 'draft',
      lastReviewedAt: input.lastReviewedAt
        ? Timestamp.fromDate(input.lastReviewedAt)
        : null,
      nextReviewAt: input.nextReviewAt
        ? Timestamp.fromDate(input.nextReviewAt)
        : null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function submitContentBlockForClinicalReview(
  courseId: string,
  moduleId: string,
  lessonId: string,
  contentBlockId: string,
): Promise<void> {
  const adminId = await requireAdminClaim();
  const db = requireFirestore();
  const reference = contentBlockReference(courseId, moduleId, lessonId, contentBlockId);
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error('Save the clinical content block before submitting it for review.');
  }

  const content = snapshot.data() as Partial<ClinicalContentBlock>;
  if (!content.body?.trim()) {
    throw new Error('Add learner-facing content before submitting this block.');
  }
  if (content.isClinicalClaim) {
    if (!content.sourceIds?.length) {
      throw new Error('Attach at least one published source before submitting a clinical claim.');
    }

    const sourceSnapshots = await Promise.all(
      content.sourceIds.map((sourceId) => getDoc(doc(db, 'sources', sourceId))),
    );
    if (
      sourceSnapshots.some(
        (source) =>
          !source.exists() || source.data().publicationState !== 'published',
      )
    ) {
      throw new Error(
        'Every attached source must still be published before review submission.',
      );
    }
  }

  await setDoc(
    reference,
    {
      publicationState: 'submitted',
      submittedBy: adminId,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function approveContentBlock(
  courseId: string,
  moduleId: string,
  lessonId: string,
  contentBlockId: string,
  reviewNotes: string,
  nextReviewAt: Date,
): Promise<void> {
  const reviewerId = await requireAdminClaim();
  const db = requireFirestore();
  const contentBlock = contentBlockReference(courseId, moduleId, lessonId, contentBlockId);
  const contentSnapshot = await getDoc(contentBlock);

  if (!contentSnapshot.exists()) {
    throw new Error('The clinical content block does not exist.');
  }

  const content = contentSnapshot.data() as Partial<ClinicalContentBlock>;
  if (content.isClinicalClaim) {
    if (!content.sourceIds?.length) {
      throw new Error('Clinical claims need at least one linked source before approval.');
    }
    if (nextReviewAt.getTime() <= Date.now()) {
      throw new Error('Set the next clinical review date in the future before approval.');
    }

    const sourceSnapshots = await Promise.all(
      content.sourceIds.map((sourceId) => getDoc(doc(db, 'sources', sourceId))),
    );
    if (
      sourceSnapshots.some(
        (source) =>
          !source.exists() || source.data().publicationState !== 'published',
      )
    ) {
      throw new Error(
        'Every linked source must exist and be published before clinical approval.',
      );
    }
  }

  const reviewReference = doc(collection(db, 'clinicalReviews'));

  const review: ClinicalReview = {
    id: reviewReference.id,
    courseId,
    moduleId,
    lessonId,
    contentBlockId,
    reviewerId,
    reviewNotes,
    approvedAt: new Date().toISOString(),
  };

  await Promise.all([
    setDoc(reviewReference, {
      ...review,
      approvedAt: serverTimestamp(),
    }),
    setDoc(
      contentBlock,
      {
        publicationState: 'approved',
        clinicalReviewerId: reviewerId,
        lastReviewedAt: serverTimestamp(),
        nextReviewAt: Timestamp.fromDate(nextReviewAt),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
}

export async function publishContentBlock(
  courseId: string,
  moduleId: string,
  lessonId: string,
  contentBlockId: string,
): Promise<void> {
  await requireAdminClaim();
  const reference = contentBlockReference(courseId, moduleId, lessonId, contentBlockId);
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error('The clinical content block does not exist.');
  }

  const contentBlock = snapshot.data() as Partial<ClinicalContentBlock>;
  if (
    contentBlock.isClinicalClaim &&
    (!contentBlock.sourceIds?.length ||
      !contentBlock.clinicalReviewerId ||
      !contentBlock.lastReviewedAt ||
      !contentBlock.nextReviewAt)
  ) {
    throw new Error(
      'Clinical content cannot be published without sources, a reviewer, and review dates.',
    );
  }

  await setDoc(
    reference,
    {
      publicationState: 'published',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function freezeContentBlock(
  courseId: string,
  moduleId: string,
  lessonId: string,
  contentBlockId: string,
  freezeReason: string,
): Promise<void> {
  const adminId = await requireAdminClaim();
  const reference = contentBlockReference(courseId, moduleId, lessonId, contentBlockId);

  await setDoc(
    reference,
    {
      publicationState: 'frozen',
      frozenAt: serverTimestamp(),
      frozenBy: adminId,
      freezeReason,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
