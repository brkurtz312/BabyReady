import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  clinicalMediaAssetKeys,
  externalVideoAssetKey,
} from '../lib/clinicalMediaAssets';
import { db, requireAuth, requireFirestore } from '../lib/firebase';
import type {
  ClinicalMedia,
  ClinicalMediaReview,
  ClinicalMediaType,
  ClinicalMediaVersion,
  ClinicalMediaVersionAction,
} from '../models/course';

export type SaveClinicalMediaInput = {
  id: string;
  title: string;
  type: ClinicalMediaType;
  assetKey: string;
  altText: string;
  caption?: string;
  externalUrl?: string;
  transcriptUrl?: string;
  publisher?: string;
  language?: string;
  durationSeconds?: number;
  sourceIds: string[];
  isClinicalClaim: boolean;
  lastReviewedAt?: Date;
  nextReviewAt?: Date;
};

export type ClinicalMediaLibraryState =
  | { status: 'unconfigured'; media: []; error: null }
  | { status: 'loading'; media: ClinicalMedia[]; error: null }
  | { status: 'ready'; media: ClinicalMedia[]; error: null }
  | { status: 'error'; media: ClinicalMedia[]; error: string };

export type ClinicalMediaVersionHistoryState =
  | { status: 'unconfigured'; versions: []; error: null }
  | { status: 'loading'; versions: ClinicalMediaVersion[]; error: null }
  | { status: 'ready'; versions: ClinicalMediaVersion[]; error: null }
  | { status: 'error'; versions: ClinicalMediaVersion[]; error: string };

async function requireAdminClaim(): Promise<string> {
  const user = requireAuth().currentUser;
  if (!user) {
    throw new Error('Sign in with an administrator account to manage clinical media.');
  }

  const token = await user.getIdTokenResult();
  if (token.claims.admin !== true) {
    throw new Error('Clinical media records require the Firebase admin custom claim.');
  }

  return user.uid;
}

function readableMediaError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load the clinical media library.';
}

const approvedExternalVideoHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
]);

function validateExternalVideoUrl(value: string | undefined, label: string): void {
  if (!value?.trim()) {
    throw new Error(`${label} is required for an external video.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL.`);
  }

  if (
    parsed.protocol !== 'https:' ||
    !approvedExternalVideoHosts.has(parsed.hostname.toLowerCase())
  ) {
    throw new Error(
      `${label} must use HTTPS and point to an approved YouTube or Vimeo host.`,
    );
  }
}

function validateMediaInput(input: SaveClinicalMediaInput): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)) {
    throw new Error('Use lowercase letters, numbers, and single hyphens for the media ID.');
  }
  if (!input.title.trim() || !input.altText.trim()) {
    throw new Error('A media title and accessible alt text are required.');
  }
  if (input.type === 'figure') {
    if (!clinicalMediaAssetKeys.includes(input.assetKey)) {
      throw new Error(
        'Choose one of the bundled BabyReady figure assets before saving this record.',
      );
    }
  } else if (input.type === 'external_video') {
    if (input.assetKey !== externalVideoAssetKey) {
      throw new Error('External videos must use the controlled external-video delivery type.');
    }
    if (!input.publisher?.trim() || !input.language?.trim()) {
      throw new Error(
        'External videos require a publisher and language before they can be saved.',
      );
    }
    if (
      !Number.isInteger(input.durationSeconds) ||
      (input.durationSeconds ?? 0) <= 0
    ) {
      throw new Error('External videos require a duration in whole seconds.');
    }
    validateExternalVideoUrl(input.externalUrl, 'Original publisher video URL');
    validateExternalVideoUrl(input.transcriptUrl, 'Transcript or captions URL');
  } else {
    throw new Error('This media type is not supported by the current BabyReady release.');
  }
  if (input.sourceIds.some((sourceId) => !sourceId.trim())) {
    throw new Error('Remove any empty source attachments before saving.');
  }
  if (input.isClinicalClaim) {
    if (!input.sourceIds.length) {
      throw new Error('Clinical media needs at least one linked source before publication.');
    }
    if (!input.lastReviewedAt || !input.nextReviewAt) {
      throw new Error('Clinical media needs last and next review dates.');
    }
    if (input.nextReviewAt.getTime() <= input.lastReviewedAt.getTime()) {
      throw new Error('The next review date must be later than the last review date.');
    }
  }
}

async function ensurePublishedSources(sourceIds: string[]): Promise<void> {
  const firestore = requireFirestore();
  const sources = await Promise.all(
    sourceIds.map((sourceId) => getDoc(doc(firestore, 'sources', sourceId))),
  );
  if (
    sources.some(
      (source) =>
        !source.exists() || source.data().publicationState !== 'published',
    )
  ) {
    throw new Error(
      'Every linked source must exist and be published before media publication.',
    );
  }
}

function dateFromUnknown(value: unknown): Date | undefined {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return value instanceof Date ? value : undefined;
}

function versionSnapshot(
  media: Partial<ClinicalMedia>,
  fallbackId: string,
): ClinicalMediaVersion['snapshot'] {
  return {
    mediaId: typeof media.id === 'string' ? media.id : fallbackId,
    title: typeof media.title === 'string' ? media.title : '',
    type: media.type ?? 'figure',
    assetKey: typeof media.assetKey === 'string' ? media.assetKey : '',
    altText: typeof media.altText === 'string' ? media.altText : '',
    ...(typeof media.caption === 'string' && media.caption.trim()
      ? { caption: media.caption.trim() }
      : {}),
    ...(media.type === 'external_video' &&
    typeof media.externalUrl === 'string' &&
    media.externalUrl.trim() &&
    typeof media.transcriptUrl === 'string' &&
    media.transcriptUrl.trim() &&
    typeof media.publisher === 'string' &&
    media.publisher.trim() &&
    typeof media.language === 'string' &&
    media.language.trim() &&
    typeof media.durationSeconds === 'number'
      ? {
          externalUrl: media.externalUrl.trim(),
          transcriptUrl: media.transcriptUrl.trim(),
          publisher: media.publisher.trim(),
          language: media.language.trim(),
          durationSeconds: media.durationSeconds,
        }
      : {}),
    sourceIds: Array.isArray(media.sourceIds) ? media.sourceIds : [],
    isClinicalClaim: media.isClinicalClaim === true,
    publicationState: media.publicationState ?? 'draft',
  };
}

type VersionedMediaUpdate = {
  actorId: string;
  action: ClinicalMediaVersionAction;
  note?: string;
  requireExisting?: boolean;
  expectedState?: ClinicalMedia['publicationState'];
  update: Record<string, unknown>;
};

async function writeVersionedClinicalMedia(
  mediaId: string,
  context: VersionedMediaUpdate,
): Promise<void> {
  const firestore = requireFirestore();
  const reference = doc(firestore, 'clinicalMedia', mediaId);

  await runTransaction(firestore, async (transaction) => {
    const existingSnapshot = await transaction.get(reference);
    if (context.requireExisting && !existingSnapshot.exists()) {
      throw new Error('The clinical media record does not exist.');
    }

    const existing = existingSnapshot.exists()
      ? (existingSnapshot.data() as Partial<ClinicalMedia>)
      : {};
    if (
      context.expectedState &&
      existing.publicationState !== context.expectedState
    ) {
      throw new Error(
        `This media record is no longer ${context.expectedState}. Refresh the review queue and try again.`,
      );
    }
    const update = { ...context.update };
    if (existingSnapshot.exists() && 'createdBy' in update) {
      delete update.createdBy;
    }
    const merged = { ...existing, ...update } as Partial<ClinicalMedia>;
    const priorVersionCount =
      typeof existing.versionCount === 'number' ? existing.versionCount : 0;
    const versionNumber = priorVersionCount + 1;
    const versionReference = doc(collection(reference, 'versions'));

    transaction.set(
      reference,
      {
        ...update,
        versionCount: versionNumber,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(versionReference, {
      id: versionReference.id,
      versionNumber,
      action: context.action,
      actorId: context.actorId,
      createdAt: serverTimestamp(),
      ...(context.note?.trim() ? { note: context.note.trim() } : {}),
      snapshot: versionSnapshot(merged, mediaId),
    } satisfies ClinicalMediaVersion);
  });
}

async function approveVersionedClinicalMedia(
  mediaId: string,
  reviewerId: string,
  reviewNotes: string,
  nextReviewAt: Date,
): Promise<void> {
  const firestore = requireFirestore();
  const reference = doc(firestore, 'clinicalMedia', mediaId);
  const reviewReference = doc(collection(firestore, 'clinicalMediaReviews'));

  await runTransaction(firestore, async (transaction) => {
    const existingSnapshot = await transaction.get(reference);
    if (!existingSnapshot.exists()) {
      throw new Error('The clinical media record does not exist.');
    }

    const media = {
      ...(existingSnapshot.data() as ClinicalMedia),
      id: existingSnapshot.id,
    };
    if (media.publicationState !== 'submitted') {
      throw new Error(
        `Only submitted media can be approved. Current state: ${media.publicationState}.`,
      );
    }

    const priorVersionCount =
      typeof media.versionCount === 'number' ? media.versionCount : 0;
    const versionNumber = priorVersionCount + 1;
    const versionReference = doc(collection(reference, 'versions'));
    const update = {
      publicationState: 'approved' as const,
      clinicalReviewerId: reviewerId,
      lastReviewedAt: serverTimestamp(),
      nextReviewAt: Timestamp.fromDate(nextReviewAt),
    };
    const merged = { ...media, ...update } as Partial<ClinicalMedia>;

    transaction.set(
      reference,
      {
        ...update,
        versionCount: versionNumber,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(versionReference, {
      id: versionReference.id,
      versionNumber,
      action: 'approved',
      actorId: reviewerId,
      createdAt: serverTimestamp(),
      note: reviewNotes.trim(),
      snapshot: versionSnapshot(merged, mediaId),
    } satisfies ClinicalMediaVersion);
    transaction.set(reviewReference, {
      id: reviewReference.id,
      mediaId,
      reviewerId,
      reviewNotes: reviewNotes.trim(),
      versionNumber,
      approvedAt: serverTimestamp(),
    } satisfies ClinicalMediaReview);
  });
}

export function subscribeToClinicalMediaLibrary(
  onChange: (state: ClinicalMediaLibraryState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', media: [], error: null });
    return null;
  }

  onChange({ status: 'loading', media: [], error: null });
  return onSnapshot(
    query(collection(db, 'clinicalMedia'), orderBy('updatedAt', 'desc'), limit(100)),
    (snapshot) => {
      onChange({
        status: 'ready',
        media: snapshot.docs.map((record) => ({
          ...(record.data() as ClinicalMedia),
          id: record.id,
        })),
        error: null,
      });
    },
    (error) => {
      onChange({ status: 'error', media: [], error: readableMediaError(error) });
    },
  );
}

export function subscribeToClinicalMediaVersionHistory(
  mediaId: string | null,
  onChange: (state: ClinicalMediaVersionHistoryState) => void,
): Unsubscribe | null {
  if (!db || !mediaId) {
    onChange({ status: 'unconfigured', versions: [], error: null });
    return null;
  }

  onChange({ status: 'loading', versions: [], error: null });
  return onSnapshot(
    query(
      collection(doc(db, 'clinicalMedia', mediaId), 'versions'),
      orderBy('versionNumber', 'desc'),
      limit(25),
    ),
    (snapshot) => {
      onChange({
        status: 'ready',
        versions: snapshot.docs.map((record) => ({
          ...(record.data() as ClinicalMediaVersion),
          id: record.id,
        })),
        error: null,
      });
    },
    (error) => {
      onChange({
        status: 'error',
        versions: [],
        error: readableMediaError(error),
      });
    },
  );
}

export async function loadClinicalMedia(
  mediaIds: string[],
): Promise<ClinicalMedia[]> {
  const firestore = db;
  if (!firestore || mediaIds.length === 0) {
    return [];
  }

  const snapshots = await Promise.all(
    mediaIds.map((mediaId) => getDoc(doc(firestore, 'clinicalMedia', mediaId))),
  );
  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({ ...(snapshot.data() as ClinicalMedia), id: snapshot.id }));
}

export async function saveClinicalMediaDraft(
  input: SaveClinicalMediaInput,
): Promise<void> {
  const adminId = await requireAdminClaim();
  validateMediaInput(input);

  await writeVersionedClinicalMedia(input.id, {
    actorId: adminId,
    action: 'draft_saved',
    update: {
      id: input.id,
      title: input.title.trim(),
      type: input.type,
      assetKey: input.assetKey,
      altText: input.altText.trim(),
      ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
      externalUrl:
        input.type === 'external_video' ? input.externalUrl?.trim() ?? null : null,
      transcriptUrl:
        input.type === 'external_video' ? input.transcriptUrl?.trim() ?? null : null,
      publisher:
        input.type === 'external_video' ? input.publisher?.trim() ?? null : null,
      language:
        input.type === 'external_video' ? input.language?.trim() ?? null : null,
      durationSeconds:
        input.type === 'external_video' ? input.durationSeconds ?? null : null,
      sourceIds: input.sourceIds,
      isClinicalClaim: input.isClinicalClaim,
      publicationState: 'draft',
      clinicalReviewerId: null,
      lastReviewedAt: input.lastReviewedAt
        ? Timestamp.fromDate(input.lastReviewedAt)
        : null,
      nextReviewAt: input.nextReviewAt
        ? Timestamp.fromDate(input.nextReviewAt)
        : null,
      createdBy: adminId,
      submittedBy: null,
      submittedAt: null,
    },
  });
}

export async function submitClinicalMediaForClinicalReview(
  mediaId: string,
): Promise<void> {
  const adminId = await requireAdminClaim();
  const firestore = requireFirestore();
  const reference = doc(firestore, 'clinicalMedia', mediaId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    throw new Error('Save the media record before submitting it for review.');
  }

  const media = { ...(snapshot.data() as ClinicalMedia), id: snapshot.id };
  if (media.publicationState !== 'draft') {
    throw new Error(
      `Only draft media can be submitted for review. Current state: ${media.publicationState}.`,
    );
  }
  validateMediaInput({
    id: media.id,
    title: media.title,
    type: media.type,
    assetKey: media.assetKey,
    altText: media.altText,
    caption: media.caption,
    externalUrl: media.externalUrl ?? undefined,
    transcriptUrl: media.transcriptUrl ?? undefined,
    publisher: media.publisher ?? undefined,
    language: media.language ?? undefined,
    durationSeconds: media.durationSeconds ?? undefined,
    sourceIds: media.sourceIds ?? [],
    isClinicalClaim: media.isClinicalClaim,
    lastReviewedAt: dateFromUnknown(media.lastReviewedAt),
    nextReviewAt: dateFromUnknown(media.nextReviewAt),
  });

  if (media.isClinicalClaim) {
    await ensurePublishedSources(media.sourceIds ?? []);
  }

  await writeVersionedClinicalMedia(mediaId, {
    actorId: adminId,
    action: 'submitted',
    requireExisting: true,
    expectedState: 'draft',
    update: {
      publicationState: 'submitted',
      submittedBy: adminId,
      submittedAt: serverTimestamp(),
    },
  });
}

export async function approveClinicalMedia(
  mediaId: string,
  reviewNotes: string,
  nextReviewAt: Date,
): Promise<void> {
  const reviewerId = await requireAdminClaim();
  const firestore = requireFirestore();
  const snapshot = await getDoc(doc(firestore, 'clinicalMedia', mediaId));
  if (!snapshot.exists()) {
    throw new Error('The clinical media record does not exist.');
  }

  const media = { ...(snapshot.data() as ClinicalMedia), id: snapshot.id };
  if (media.publicationState !== 'submitted') {
    throw new Error(
      `Only submitted media can be approved. Current state: ${media.publicationState}.`,
    );
  }
  if (!reviewNotes.trim()) {
    throw new Error('Add clinical review notes before approving media.');
  }
  if (nextReviewAt.getTime() <= Date.now()) {
    throw new Error('Set the next clinical review date in the future before approval.');
  }
  if (media.isClinicalClaim) {
    if (!media.sourceIds?.length) {
      throw new Error('Clinical media needs at least one linked source before approval.');
    }
    await ensurePublishedSources(media.sourceIds);
  }

  await approveVersionedClinicalMedia(
    mediaId,
    reviewerId,
    reviewNotes,
    nextReviewAt,
  );
}

export async function publishClinicalMedia(mediaId: string): Promise<void> {
  const adminId = await requireAdminClaim();
  const firestore = requireFirestore();
  const reference = doc(firestore, 'clinicalMedia', mediaId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    throw new Error('The clinical media record does not exist.');
  }

  const media = { ...(snapshot.data() as ClinicalMedia), id: snapshot.id };
  if (media.publicationState !== 'approved') {
    throw new Error(
      `Only approved media can be published. Current state: ${media.publicationState}.`,
    );
  }
  if (
    media.isClinicalClaim &&
    (!media.sourceIds?.length ||
      !media.clinicalReviewerId ||
      !media.lastReviewedAt ||
      !media.nextReviewAt)
  ) {
    throw new Error(
      'Clinical media cannot be published without sources, a reviewer, and review dates.',
    );
  }
  if (media.isClinicalClaim) {
    await ensurePublishedSources(media.sourceIds);
    const nextReview = dateFromUnknown(media.nextReviewAt);
    if (!nextReview || nextReview.getTime() <= Date.now()) {
      throw new Error('Set a future next-review date before publishing this media record.');
    }
  }

  await writeVersionedClinicalMedia(mediaId, {
    actorId: adminId,
    action: 'published',
    requireExisting: true,
    expectedState: 'approved',
    update: {
      publicationState: 'published',
      publishedAt: serverTimestamp(),
    },
  });
}

export async function freezeClinicalMedia(
  mediaId: string,
  freezeReason: string,
): Promise<void> {
  const adminId = await requireAdminClaim();
  if (!freezeReason.trim()) {
    throw new Error('Document why this media record is being frozen.');
  }

  await writeVersionedClinicalMedia(mediaId, {
    actorId: adminId,
    action: 'frozen',
    note: freezeReason,
    requireExisting: true,
    update: {
      publicationState: 'frozen',
      frozenAt: serverTimestamp(),
      frozenBy: adminId,
      freezeReason: freezeReason.trim(),
    },
  });
}
