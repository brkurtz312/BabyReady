import {
  collectionGroup,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import type { ClinicalContentBlock } from '../models/course';

export type PreparingForLaborCourseBlocksState =
  | { status: 'unconfigured'; blocks: []; error: null }
  | { status: 'loading'; blocks: ClinicalContentBlock[]; error: null }
  | { status: 'ready'; blocks: ClinicalContentBlock[]; error: null }
  | { status: 'error'; blocks: ClinicalContentBlock[]; error: string };

function readableCourseReadinessError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load Preparing for Labor course readiness.';
}

/**
 * A course-scoped collection-group listener keeps the mobile overview live
 * without assuming that the course has a fixed number of Firestore records.
 * The screen reconciles these records against the immutable authoring
 * manifest, so missing or unexpected records remain visible as governance
 * work instead of being silently omitted.
 */
export function subscribeToPreparingForLaborCourseBlocks(
  onChange: (state: PreparingForLaborCourseBlocksState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', blocks: [], error: null });
    return null;
  }

  onChange({ status: 'loading', blocks: [], error: null });

  return onSnapshot(
    query(
      collectionGroup(db, 'contentBlocks'),
      where('courseId', '==', 'preparing-for-labor'),
    ),
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
      onChange({
        status: 'error',
        blocks: [],
        error: readableCourseReadinessError(error),
      });
    },
  );
}
