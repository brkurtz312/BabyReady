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
import {
  assertPreparingForLaborManifestPlacement,
  getPreparingForLaborDraftPackageEntries,
  type PreparingForLaborPlacementInput,
  type PreparingForLaborDraftPackageEntry,
} from '../content/preparingForLaborManifest';
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

export type PreparingForLaborDraftPackageBlockedBlock = {
  lessonId: string;
  contentBlockId: string;
  missingPublishedSourceIds: string[];
};

export type PreparingForLaborDraftPackagePreflight = {
  totalManifestBlocks: number;
  existingBlockIds: string[];
  missingBlockIds: string[];
  blockedBlocks: PreparingForLaborDraftPackageBlockedBlock[];
  canCreate: boolean;
};

export type PreparingForLaborDraftPackageResult = {
  createdBlockIds: string[];
  skippedExistingBlockIds: string[];
};

function assertGovernedContentPlacement(
  input: PreparingForLaborPlacementInput,
): void {
  assertPreparingForLaborManifestPlacement(input);
}

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
  if (!input.title?.trim()) {
    throw new Error(
      'Add a concise learner-facing title before saving this content block.',
    );
  }
  if (
    !Number.isInteger(input.displayOrder) ||
    (input.displayOrder ?? 0) < 1
  ) {
    throw new Error(
      'Set a positive whole-number learner display order before saving this block.',
    );
  }
  if (input.sourceIds.some((sourceId) => !sourceId.trim())) {
    throw new Error('Remove any empty source attachments before saving.');
  }
  if ((input.mediaIds ?? []).some((mediaId) => !mediaId.trim())) {
    throw new Error('Remove any empty media attachments before saving.');
  }

  assertGovernedContentPlacement({
    ...input,
    displayOrder: input.displayOrder ?? 0,
  });
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

function preparingForLaborDraftPackageBlockKey(
  entry: Pick<PreparingForLaborDraftPackageEntry, 'lessonId' | 'id'>,
): string {
  return `${entry.lessonId}/${entry.id}`;
}

function publishedSourceProblems(
  entries: PreparingForLaborDraftPackageEntry[],
  sourceSnapshots: Map<string, { exists: () => boolean; data: () => Record<string, unknown> | undefined }>,
): PreparingForLaborDraftPackageBlockedBlock[] {
  return entries.flatMap((entry) => {
    const missingPublishedSourceIds = entry.sourceIds.filter((sourceId) => {
      const snapshot = sourceSnapshots.get(sourceId);
      return (
        !snapshot?.exists() ||
        snapshot.data()?.publicationState !== 'published'
      );
    });

    return missingPublishedSourceIds.length
      ? [
          {
            lessonId: entry.lessonId,
            contentBlockId: entry.id,
            missingPublishedSourceIds,
          },
        ]
      : [];
  });
}

function sourceIdsForDraftPackage(
  entries: PreparingForLaborDraftPackageEntry[],
): string[] {
  return [...new Set(entries.flatMap((entry) => entry.sourceIds))];
}

function draftPackagePreflight(
  entries: PreparingForLaborDraftPackageEntry[],
  existingEntries: PreparingForLaborDraftPackageEntry[],
  sourceSnapshots: Map<string, { exists: () => boolean; data: () => Record<string, unknown> | undefined }>,
): PreparingForLaborDraftPackagePreflight {
  const existingBlockIds = existingEntries.map(
    preparingForLaborDraftPackageBlockKey,
  );
  const missingEntries = entries.filter(
    (entry) => !existingBlockIds.includes(preparingForLaborDraftPackageBlockKey(entry)),
  );
  const blockedBlocks = publishedSourceProblems(missingEntries, sourceSnapshots);

  return {
    totalManifestBlocks: entries.length,
    existingBlockIds,
    missingBlockIds: missingEntries.map(preparingForLaborDraftPackageBlockKey),
    blockedBlocks,
    canCreate: missingEntries.length > 0 && blockedBlocks.length === 0,
  };
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
  const displayOrder =
    typeof content.displayOrder === 'number' &&
    Number.isInteger(content.displayOrder) &&
    content.displayOrder > 0
      ? content.displayOrder
      : undefined;

  return {
    contentBlockId:
      typeof content.id === 'string' ? content.id : fallbackId,
    ...(typeof content.title === 'string' && content.title.trim()
      ? { title: content.title.trim() }
      : {}),
    type: content.type ?? 'text',
    body: typeof content.body === 'string' ? content.body : '',
    sourceIds: Array.isArray(content.sourceIds) ? content.sourceIds : [],
    mediaIds: Array.isArray(content.mediaIds) ? content.mediaIds : [],
    isClinicalClaim: content.isClinicalClaim === true,
    publicationState: content.publicationState ?? 'draft',
    ...(displayOrder ? { displayOrder } : {}),
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

/**
 * Reads the live course and Source Library for a package-generation preview.
 * This is intentionally read-only and never treats the screen's source cache
 * as authority for a clinical attachment.
 */
export async function inspectPreparingForLaborDraftPackage(): Promise<PreparingForLaborDraftPackagePreflight> {
  await requireAdminClaim();
  const firestore = requireFirestore();
  const entries = getPreparingForLaborDraftPackageEntries();
  const references = entries.map((entry) =>
    contentBlockReference(
      entry.courseId,
      entry.moduleId,
      entry.lessonId,
      entry.id,
    ),
  );
  const sourceIds = sourceIdsForDraftPackage(entries);
  const [blockSnapshots, sourceSnapshotList] = await Promise.all([
    Promise.all(references.map((reference) => getDoc(reference))),
    Promise.all(sourceIds.map((sourceId) => getDoc(doc(firestore, 'sources', sourceId)))),
  ]);
  const sourceSnapshots = new Map(
    sourceSnapshotList.map((snapshot) => [snapshot.id, snapshot]),
  );
  const existingEntries = entries.filter(
    (_entry, index) => blockSnapshots[index].exists(),
  );

  return draftPackagePreflight(entries, existingEntries, sourceSnapshots);
}

/**
 * Generates only missing Preparing for Labor cards as draft version 1 records.
 * It never overwrites existing content, changes source/media records, submits,
 * approves, publishes, freezes, or deletes a block. The transaction rechecks
 * every target and every required source immediately before it writes.
 */
export async function createPreparingForLaborDraftPackage(): Promise<PreparingForLaborDraftPackageResult> {
  const adminId = await requireAdminClaim();
  const firestore = requireFirestore();
  const entries = getPreparingForLaborDraftPackageEntries();

  for (const entry of entries) {
    validateContentBlockInput({
      ...entry,
      publicationState: 'draft',
    });
  }

  return runTransaction(firestore, async (transaction) => {
    const entrySnapshots: Array<{
      entry: PreparingForLaborDraftPackageEntry;
      exists: boolean;
    }> = [];

    for (const entry of entries) {
      const reference = contentBlockReference(
        entry.courseId,
        entry.moduleId,
        entry.lessonId,
        entry.id,
      );
      const snapshot = await transaction.get(reference);
      entrySnapshots.push({ entry, exists: snapshot.exists() });
    }

    const missingEntries = entrySnapshots
      .filter((item) => !item.exists)
      .map((item) => item.entry);
    const sourceSnapshots = new Map<
      string,
      { exists: () => boolean; data: () => Record<string, unknown> | undefined }
    >();

    for (const sourceId of sourceIdsForDraftPackage(missingEntries)) {
      const snapshot = await transaction.get(doc(firestore, 'sources', sourceId));
      sourceSnapshots.set(sourceId, snapshot);
    }

    const blockedBlocks = publishedSourceProblems(missingEntries, sourceSnapshots);
    if (blockedBlocks.length) {
      const detail = blockedBlocks
        .map(
          (block) =>
            `${block.lessonId}/${block.contentBlockId}: ${block.missingPublishedSourceIds.join(', ')}`,
        )
        .join('; ');
      throw new Error(
        `The governed draft package was not created because required published source records are unavailable: ${detail}.`,
      );
    }

    const createdBlockIds: string[] = [];
    const skippedExistingBlockIds = entrySnapshots
      .filter((item) => item.exists)
      .map((item) => preparingForLaborDraftPackageBlockKey(item.entry));

    for (const entry of missingEntries) {
      const reference = contentBlockReference(
        entry.courseId,
        entry.moduleId,
        entry.lessonId,
        entry.id,
      );
      const versionReference = doc(collection(reference, 'versions'));
      const draft = {
        ...entry,
        publicationState: 'draft' as const,
        clinicalReviewerId: null,
        lastReviewedAt: null,
        nextReviewAt: null,
      };

      transaction.set(reference, {
        ...draft,
        createdBy: adminId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        versionCount: 1,
      });
      transaction.set(versionReference, {
        id: versionReference.id,
        versionNumber: 1,
        action: 'draft_saved',
        actorId: adminId,
        createdAt: serverTimestamp(),
        note: 'Generated from the Preparing for Labor governed draft package.',
        snapshot: snapshotForVersion(draft, entry.id),
      } satisfies ClinicalContentVersion);
      createdBlockIds.push(preparingForLaborDraftPackageBlockKey(entry));
    }

    return {
      createdBlockIds,
      skippedExistingBlockIds,
    };
  });
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
  assertGovernedContentPlacement({
    courseId,
    moduleId,
    lessonId,
    id: contentBlockId,
    displayOrder: content.displayOrder ?? 0,
    type: content.type ?? 'text',
    isClinicalClaim: content.isClinicalClaim === true,
  });
  if (!content.body?.trim()) {
    throw new Error('Add learner-facing content before submitting this block.');
  }
  if (!content.title?.trim()) {
    throw new Error(
      'Add a concise learner-facing title before submitting this block.',
    );
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
  assertGovernedContentPlacement({
    courseId,
    moduleId,
    lessonId,
    id: contentBlockId,
    displayOrder: content.displayOrder ?? 0,
    type: content.type ?? 'text',
    isClinicalClaim: content.isClinicalClaim === true,
  });
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
  assertGovernedContentPlacement({
    courseId,
    moduleId,
    lessonId,
    id: contentBlockId,
    displayOrder: contentBlock.displayOrder ?? 0,
    type: contentBlock.type ?? 'text',
    isClinicalClaim: contentBlock.isClinicalClaim === true,
  });
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
