import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import type {
  ClinicalContentBlock,
  ClinicalMedia,
  ContentSource,
  CourseRecord,
} from '../models/course';

export type PublishedCourseCatalogState =
  | { status: 'unconfigured'; courses: []; error: null }
  | { status: 'loading'; courses: CourseRecord[]; error: null }
  | { status: 'ready'; courses: CourseRecord[]; error: null }
  | { status: 'error'; courses: CourseRecord[]; error: string };

export type PublishedLessonState =
  | { status: 'unconfigured'; blocks: []; error: null }
  | { status: 'loading'; blocks: ClinicalContentBlock[]; error: null }
  | { status: 'ready'; blocks: ClinicalContentBlock[]; error: null }
  | { status: 'error'; blocks: ClinicalContentBlock[]; error: string };

export type PublishedLessonAttachments = {
  media: ClinicalMedia[];
  sources: ContentSource[];
};

function readableError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return fallback;
}

function validDisplayOrder(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

/**
 * Gives clinically authored ordering precedence while retaining a predictable
 * fallback for legacy records that predate displayOrder.
 */
export function compareClinicalContentBlocks(
  left: ClinicalContentBlock,
  right: ClinicalContentBlock,
): number {
  const leftOrder = validDisplayOrder(left.displayOrder);
  const rightOrder = validDisplayOrder(right.displayOrder);

  if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  if (leftOrder !== null && rightOrder === null) {
    return -1;
  }
  if (leftOrder === null && rightOrder !== null) {
    return 1;
  }

  return left.id.localeCompare(right.id);
}

export function subscribeToPublishedCourses(
  onChange: (state: PublishedCourseCatalogState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', courses: [], error: null });
    return null;
  }

  onChange({ status: 'loading', courses: [], error: null });
  return onSnapshot(
    query(
      collection(db, 'courses'),
      where('publicationState', '==', 'published'),
    ),
    (snapshot) => {
      const courses = snapshot.docs
        .map((record) => ({
          ...(record.data() as CourseRecord),
          id: record.id,
        }))
        .sort((left, right) => left.title.localeCompare(right.title));

      onChange({ status: 'ready', courses, error: null });
    },
    (error) => {
      onChange({
        status: 'error',
        courses: [],
        error: readableError(
          error,
          'BabyReady could not load the learning library.',
        ),
      });
    },
  );
}

export function subscribeToPublishedLessonContent(
  courseId: string,
  moduleId: string,
  lessonId: string,
  onChange: (state: PublishedLessonState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', blocks: [], error: null });
    return null;
  }

  onChange({ status: 'loading', blocks: [], error: null });
  return onSnapshot(
    query(
      collection(
        db,
        'courses',
        courseId,
        'modules',
        moduleId,
        'lessons',
        lessonId,
        'contentBlocks',
      ),
      where('publicationState', '==', 'published'),
    ),
    (snapshot) => {
      const blocks = snapshot.docs
        .map((record) => ({
          ...(record.data() as ClinicalContentBlock),
          id: record.id,
        }))
        .sort(compareClinicalContentBlocks);

      onChange({ status: 'ready', blocks, error: null });
    },
    (error) => {
      onChange({
        status: 'error',
        blocks: [],
        error: readableError(
          error,
          'BabyReady could not load this lesson.',
        ),
      });
    },
  );
}

export async function loadPublishedLessonAttachments(
  blocks: ClinicalContentBlock[],
): Promise<PublishedLessonAttachments> {
  const firestore = db;

  if (!firestore || blocks.length === 0) {
    return { media: [], sources: [] };
  }

  const sourceIds = [
    ...new Set(blocks.flatMap((block) => block.sourceIds ?? [])),
  ];
  const mediaIds = [
    ...new Set(blocks.flatMap((block) => block.mediaIds ?? [])),
  ];
  const [sourceSnapshots, mediaSnapshots] = await Promise.all([
    Promise.all(
      sourceIds.map((sourceId) => getDoc(doc(firestore, 'sources', sourceId))),
    ),
    Promise.all(
      mediaIds.map((mediaId) =>
        getDoc(doc(firestore, 'clinicalMedia', mediaId)),
      ),
    ),
  ]);

  return {
    sources: sourceSnapshots
      .filter(
        (snapshot) =>
          snapshot.exists() &&
          (snapshot.data() as ContentSource).publicationState === 'published',
      )
      .map((snapshot) => ({
        ...(snapshot.data() as ContentSource),
        id: snapshot.id,
      })),
    media: mediaSnapshots
      .filter(
        (snapshot) =>
          snapshot.exists() &&
          (snapshot.data() as ClinicalMedia).publicationState === 'published',
      )
      .map((snapshot) => ({
        ...(snapshot.data() as ClinicalMedia),
        id: snapshot.id,
      })),
  };
}
