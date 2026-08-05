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
  const reference = contentBlockReference(courseId, moduleId, lessonId, contentBlockId);

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
): Promise<void> {
  const reviewerId = await requireAdminClaim();
  const db = requireFirestore();
  const contentBlock = contentBlockReference(courseId, moduleId, lessonId, contentBlockId);
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
