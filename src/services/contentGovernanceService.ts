import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';

import { requireAuth, requireFirestore } from '../lib/firebase';
import type {
  ClinicalContentBlock,
  ClinicalMedia,
  ClinicalContentVersion,
  ClinicalContentVersionAction,
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
  'lastReviewedAt' | 'nextReviewAt' | 'publicationState' | 'mediaIds'
> & {
  lastReviewedAt?: Date;
  nextReviewAt?: Date;
  publicationState?: ContentPublicationState;
  mediaIds?: string[];
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
  if ((input.mediaIds ?? []).some((mediaId) => !mediaId.trim())) {
    throw new Error('Remove any empty media attachments before saving.');
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

type VersionedContentUpdate = {
  actorId: string;
  action: ClinicalContentVersionAction;
  note?: string;
  requireExisting?: boolean;
  update: Record<string, unknown>;
};

function snapshotForVersion(
  content: Partial<ClinicalContentBlock>,
  fallbackId: string,
): ClinicalContentVersion['snapshot'] {
  return {
    contentBlockId:
      typeof content.id === 'string' ? content.id : fallbackId,
    type: content.type ?? 'text',
    body: typeof content.body === 'string' ? content.body : '',
    sourceIds: Array.isArray(content.sourceIds) ? content.sourceIds : [],
    mediaIds: Array.isArray(content.mediaIds) ? content.mediaIds : [],
    isClinicalClaim: content.isClinicalClaim === true,
    publicationState: content.publicationState ?? 'draft',
  };
}

async function writeVersionedContentBlock(
  reference: DocumentReference,
  context: VersionedContentUpdate,
): Promise<void> {
  const firestore = requireFirestore();

  await runTransaction(firestore, async (transaction) => {
    const existingSnapshot = await transaction.get(reference);
    if (context.requireExisting && !existingSnapshot.exists()) {
      throw new Error('The clinical content block does not exist.');
    }

    const existing = existingSnapshot.exists()
      ? (existingSnapshot.data() as Partial<ClinicalContentBlock>)
      : {};
    const merged = {
      ...existing,
      ...context.update,
    } as Partial<ClinicalContentBlock>;
    const priorVersionCount =
      typeof existing.versionCount === 'number' ? existing.versionCount : 0;
    const versionNumber = priorVersionCount + 1;
    const versionReference = doc(collection(reference, 'versions'));

    transaction.set(
      reference,
      {
        ...context.update,
        versionCount: versionNumber,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      versionReference,
      {
        id: versionReference.id,
        versionNumber,
        action: context.action,
        actorId: context.actorId,
        createdAt: serverTimestamp(),
        ...(context.note ? { note: context.note } : {}),
        snapshot: snapshotForVersion(merged, reference.id),
      } satisfies ClinicalContentVersion,
    );
  });
}

async function ensurePublishedAttachments(
  db: ReturnType<typeof requireFirestore>,
  sourceIds: string[],
  mediaIds: string[],
): Promise<void> {
  const [sourceSnapshots, mediaSnapshots] = await Promise.all([
    Promise.all(sourceIds.map((sourceId) => getDoc(doc(db, 'sources', sourceId)))),
    Promise.all(
      mediaIds.map((mediaId) => getDoc(doc(db, 'clinicalMedia', mediaId))),
    ),
  ]);

  if (
    sourceSnapshots.some(
      (source) =>
        !source.exists() || source.data().publicationState !== 'published',
    )
  ) {
    throw new Error(
      'Every attached source must still be published before continuing.',
    );
  }

  if (
    mediaSnapshots.some(
      (media) =>
        !media.exists() ||
        (media.data() as ClinicalMedia).publicationState !== 'published',
    )
  ) {
    throw new Error(
      'Every attached figure or media record must be published before continuing.',
    );
  }
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
  const adminId = await requireAdminClaim();
  validateContentBlockInput(input);

  const reference = contentBlockReference(
    input.courseId,
    input.moduleId,
    input.lessonId,
    input.id,
  );
  const {
    lastReviewedAt: _lastReviewedAt,
    nextReviewAt: _nextReviewAt,
    publicationState: _publicationState,
    ...content
  } = input;

  await writeVersionedContentBlock(
    reference,
    {
      actorId: adminId,
      action: 'draft_saved',
      update: {
        ...content,
        sourceIds: input.sourceIds ?? [],
        mediaIds: input.mediaIds ?? [],
        publicationState: 'draft',
        clinicalReviewerId: null,
        lastReviewedAt: null,
        nextReviewAt: null,
      },
    },
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

  }
  await ensurePublishedAttachments(
    db,
    content.sourceIds ?? [],
    content.mediaIds ?? [],
  );

  await writeVersionedContentBlock(
    reference,
    {
      actorId: adminId,
      action: 'submitted',
      requireExisting: true,
      update: {
        publicationState: 'submitted',
        submittedBy: adminId,
        submittedAt: serverTimestamp(),
      },
    },
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

  }
  await ensurePublishedAttachments(
    db,
    content.sourceIds ?? [],
    content.mediaIds ?? [],
  );

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
    writeVersionedContentBlock(
      contentBlock,
      {
        actorId: reviewerId,
        action: 'approved',
        note: reviewNotes.trim(),
        requireExisting: true,
        update: {
          publicationState: 'approved',
          clinicalReviewerId: reviewerId,
          lastReviewedAt: serverTimestamp(),
          nextReviewAt: Timestamp.fromDate(nextReviewAt),
        },
      },
    ),
  ]);
}

export async function publishContentBlock(
  courseId: string,
  moduleId: string,
  lessonId: string,
  contentBlockId: string,
): Promise<void> {
  const adminId = await requireAdminClaim();
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
  await ensurePublishedAttachments(
    requireFirestore(),
    contentBlock.sourceIds ?? [],
    contentBlock.mediaIds ?? [],
  );

  await writeVersionedContentBlock(
    reference,
    {
      actorId: adminId,
      action: 'published',
      requireExisting: true,
      update: {
        publicationState: 'published',
        publishedAt: serverTimestamp(),
      },
    },
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

  await writeVersionedContentBlock(
    reference,
    {
      actorId: adminId,
      action: 'frozen',
      note: freezeReason.trim(),
      requireExisting: true,
      update: {
        publicationState: 'frozen',
        frozenAt: serverTimestamp(),
        frozenBy: adminId,
        freezeReason: freezeReason.trim(),
      },
    },
  );
}
