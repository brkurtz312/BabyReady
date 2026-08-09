import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { clinicalMediaAssetKeys } from '../lib/clinicalMediaAssets';
import { db, requireAuth, requireFirestore } from '../lib/firebase';
import type { ClinicalMedia, ClinicalMediaType } from '../models/course';

export type SaveClinicalMediaInput = {
  id: string;
  title: string;
  type: ClinicalMediaType;
  assetKey: string;
  altText: string;
  caption?: string;
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

function validateMediaInput(input: SaveClinicalMediaInput): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)) {
    throw new Error('Use lowercase letters, numbers, and single hyphens for the media ID.');
  }
  if (!input.title.trim() || !input.altText.trim()) {
    throw new Error('A media title and accessible alt text are required.');
  }
  if (input.type !== 'figure') {
    throw new Error(
      'This BabyReady release supports the bundled static figures only. Audio and video records need a future hosted-media release.',
    );
  }
  if (!clinicalMediaAssetKeys.includes(input.assetKey)) {
    throw new Error(
      'Choose one of the bundled BabyReady figure assets before saving this record.',
    );
  }
  if (input.sourceIds.some((sourceId) => !sourceId.trim())) {
    throw new Error('Remove any empty source attachments before saving.');
  }
  if (input.isClinicalClaim) {
    if (!input.sourceIds.length) {
      throw new Error('Clinical figures need at least one linked source before publication.');
    }
    if (!input.lastReviewedAt || !input.nextReviewAt) {
      throw new Error('Clinical figures need last and next review dates.');
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

  await setDoc(
    doc(requireFirestore(), 'clinicalMedia', input.id),
    {
      id: input.id,
      title: input.title.trim(),
      type: input.type,
      assetKey: input.assetKey,
      altText: input.altText.trim(),
      ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
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
      updatedAt: serverTimestamp(),
    } satisfies ClinicalMedia,
    { merge: true },
  );
}

export async function publishClinicalMedia(mediaId: string): Promise<void> {
  const reviewerId = await requireAdminClaim();
  const firestore = requireFirestore();
  const reference = doc(firestore, 'clinicalMedia', mediaId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    throw new Error('Save the media record before publishing it.');
  }

  const media = { ...(snapshot.data() as ClinicalMedia), id: snapshot.id };
  validateMediaInput({
    id: media.id,
    title: media.title,
    type: media.type,
    assetKey: media.assetKey,
    altText: media.altText,
    caption: media.caption,
    sourceIds: media.sourceIds ?? [],
    isClinicalClaim: media.isClinicalClaim,
    lastReviewedAt: media.lastReviewedAt instanceof Timestamp
      ? media.lastReviewedAt.toDate()
      : media.lastReviewedAt as Date | undefined,
    nextReviewAt: media.nextReviewAt instanceof Timestamp
      ? media.nextReviewAt.toDate()
      : media.nextReviewAt as Date | undefined,
  });

  if (media.isClinicalClaim) {
    await ensurePublishedSources(media.sourceIds ?? []);
    const nextReview =
      media.nextReviewAt instanceof Timestamp
        ? media.nextReviewAt.toDate()
        : media.nextReviewAt as Date | undefined;
    if (!nextReview || nextReview.getTime() <= Date.now()) {
      throw new Error('Set a future next-review date before publishing this media record.');
    }
  }

  await setDoc(
    reference,
    {
      publicationState: 'published',
      clinicalReviewerId: reviewerId,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function freezeClinicalMedia(
  mediaId: string,
  freezeReason: string,
): Promise<void> {
  const adminId = await requireAdminClaim();
  if (!freezeReason.trim()) {
    throw new Error('Document why this media record is being frozen.');
  }

  await setDoc(
    doc(requireFirestore(), 'clinicalMedia', mediaId),
    {
      publicationState: 'frozen',
      frozenAt: serverTimestamp(),
      frozenBy: adminId,
      freezeReason: freezeReason.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
