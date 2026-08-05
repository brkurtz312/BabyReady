import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import type {
  ClinicalContentBlock,
  ClinicalContentVersion,
  ContentSource,
} from '../models/course';

export type ReviewQueueState =
  | { status: 'unconfigured'; blocks: []; error: null }
  | { status: 'loading'; blocks: ClinicalContentBlock[]; error: null }
  | { status: 'ready'; blocks: ClinicalContentBlock[]; error: null }
  | { status: 'error'; blocks: ClinicalContentBlock[]; error: string };

export type ContentVersionHistoryState =
  | { status: 'unconfigured'; versions: []; error: null }
  | { status: 'loading'; versions: ClinicalContentVersion[]; error: null }
  | { status: 'ready'; versions: ClinicalContentVersion[]; error: null }
  | { status: 'error'; versions: ClinicalContentVersion[]; error: string };

function readableQueueError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load the clinical review queue.';
}

export function subscribeToClinicalReviewQueue(
  onChange: (state: ReviewQueueState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', blocks: [], error: null });
    return null;
  }

  onChange({ status: 'loading', blocks: [], error: null });

  return onSnapshot(
    query(collectionGroup(db, 'contentBlocks'), orderBy('updatedAt', 'desc'), limit(50)),
    (snapshot) => {
      onChange({
        status: 'ready',
        blocks: snapshot.docs.map((contentBlock) => ({
          ...(contentBlock.data() as ClinicalContentBlock),
          id: contentBlock.id,
        })),
        error: null,
      });
    },
    (error) => {
      onChange({ status: 'error', blocks: [], error: readableQueueError(error) });
    },
  );
}

export function subscribeToContentVersionHistory(
  block: ClinicalContentBlock,
  onChange: (state: ContentVersionHistoryState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', versions: [], error: null });
    return null;
  }

  onChange({ status: 'loading', versions: [], error: null });

  const reference = doc(
    db,
    'courses',
    block.courseId,
    'modules',
    block.moduleId,
    'lessons',
    block.lessonId,
    'contentBlocks',
    block.id,
  );

  return onSnapshot(
    query(collection(reference, 'versions'), orderBy('versionNumber', 'desc'), limit(25)),
    (snapshot) => {
      onChange({
        status: 'ready',
        versions: snapshot.docs.map((version) => ({
          ...(version.data() as ClinicalContentVersion),
          id: version.id,
        })),
        error: null,
      });
    },
    (error) => {
      onChange({
        status: 'error',
        versions: [],
        error: readableQueueError(error),
      });
    },
  );
}

export async function loadContentSources(
  sourceIds: string[],
): Promise<ContentSource[]> {
  const firestore = db;
  if (!firestore || sourceIds.length === 0) {
    return [];
  }

  const snapshots = await Promise.all(
    sourceIds.map((sourceId) => getDoc(doc(firestore, 'sources', sourceId))),
  );

  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => snapshot.data() as ContentSource);
}
