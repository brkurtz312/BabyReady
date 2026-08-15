import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import type { CourseProgress, LessonState } from '../models/course';

export type LearnerProgressState =
  | { status: 'unconfigured'; progress: CourseProgress[]; error: null }
  | { status: 'unauthenticated'; progress: CourseProgress[]; error: null }
  | { status: 'loading'; progress: CourseProgress[]; error: null }
  | { status: 'ready'; progress: CourseProgress[]; error: null }
  | { status: 'error'; progress: CourseProgress[]; error: string };

export type CourseLessonProgressInput = {
  userId: string | null | undefined;
  courseId: string;
  moduleId: string;
  lessonId: string;
  state: LessonState;
};

function readableError(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'BabyReady could not load your learning progress.';
}

/**
 * Produces one stable document ID per learner/course/module/lesson tuple.
 * Encoding preserves IDs that contain spaces or punctuation without allowing
 * a slash in an authored identifier to create an unintended Firestore path.
 */
export function courseProgressDocumentId(
  courseId: string,
  moduleId: string,
  lessonId: string,
): string {
  return [
    'course',
    encodeURIComponent(courseId),
    'module',
    encodeURIComponent(moduleId),
    'lesson',
    encodeURIComponent(lessonId),
  ].join('__');
}

export function subscribeToLearnerProgress(
  userId: string | null | undefined,
  onChange: (state: LearnerProgressState) => void,
): Unsubscribe | null {
  if (!db) {
    onChange({ status: 'unconfigured', progress: [], error: null });
    return null;
  }

  if (!userId) {
    onChange({ status: 'unauthenticated', progress: [], error: null });
    return null;
  }

  onChange({ status: 'loading', progress: [], error: null });
  return onSnapshot(
    collection(db, 'users', userId, 'courseProgress'),
    (snapshot) => {
      const progress = snapshot.docs.map((record) => ({
        ...(record.data() as CourseProgress),
      }));

      onChange({ status: 'ready', progress, error: null });
    },
    (error) => {
      onChange({
        status: 'error',
        progress: [],
        error: readableError(error),
      });
    },
  );
}

/**
 * Creates or updates the one deterministic learner-progress document for a
 * lesson. Calling it repeatedly for the same state is safe and does not
 * create duplicate progress records.
 */
export async function upsertCourseLessonProgress(
  input: CourseLessonProgressInput,
): Promise<'saved' | 'unavailable'> {
  const firestore = db;
  if (!firestore || !input.userId) {
    return 'unavailable';
  }

  const updatedAt = new Date().toISOString();
  const reference = doc(
    firestore,
    'users',
    input.userId,
    'courseProgress',
    courseProgressDocumentId(input.courseId, input.moduleId, input.lessonId),
  );

  const progress: CourseProgress = {
    userId: input.userId,
    courseId: input.courseId,
    moduleId: input.moduleId,
    lessonId: input.lessonId,
    state: input.state,
    completedAt: input.state === 'completed' ? updatedAt : null,
    updatedAt,
  };

  if (input.state === 'completed') {
    progress.startedAt = updatedAt;
  }

  await setDoc(
    reference,
    progress,
    { merge: true },
  );

  return 'saved';
}
