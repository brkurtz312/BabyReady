/**
 * Which lessons a learner has finished, and the last lesson they opened, so the
 * home screen can show checkmarks and a "Continue where you left off" card.
 *
 * This file has no imports so plain Node can run it in tests.
 */

export type LastLesson = { courseId: string; lessonId: string; openedAt: number };

export type LearnerProgress = {
  completedLessonIds: string[];
  lastLesson: LastLesson | null;
};

export const EMPTY_PROGRESS: LearnerProgress = { completedLessonIds: [], lastLesson: null };

const ID = /^[a-z0-9-]{1,120}$/;

/** Reads a stored value defensively: anything malformed is dropped, not trusted. */
export function parseProgress(value: unknown): LearnerProgress {
  if (!value || typeof value !== 'object') return EMPTY_PROGRESS;
  const raw = value as { completedLessonIds?: unknown; lastLesson?: unknown };
  const completedLessonIds = Array.isArray(raw.completedLessonIds)
    ? [...new Set(raw.completedLessonIds.filter((id): id is string => typeof id === 'string' && ID.test(id)))]
    : [];
  const last = raw.lastLesson as Partial<LastLesson> | null | undefined;
  const lastLesson =
    last &&
    typeof last.courseId === 'string' &&
    ID.test(last.courseId) &&
    typeof last.lessonId === 'string' &&
    ID.test(last.lessonId) &&
    typeof last.openedAt === 'number' &&
    Number.isFinite(last.openedAt)
      ? { courseId: last.courseId, lessonId: last.lessonId, openedAt: last.openedAt }
      : null;
  return { completedLessonIds, lastLesson };
}

/** Combines two copies (this device and the private account): every finished lesson, and the newer last lesson. */
export function mergeProgress(a: LearnerProgress, b: LearnerProgress): LearnerProgress {
  const completedLessonIds = [...new Set([...a.completedLessonIds, ...b.completedLessonIds])];
  const lastLesson =
    !a.lastLesson ? b.lastLesson : !b.lastLesson ? a.lastLesson : a.lastLesson.openedAt >= b.lastLesson.openedAt ? a.lastLesson : b.lastLesson;
  return { completedLessonIds, lastLesson };
}

export function withLessonOpened(progress: LearnerProgress, courseId: string, lessonId: string, now: number): LearnerProgress {
  return { ...progress, lastLesson: { courseId, lessonId, openedAt: now } };
}

export function withLessonCompleted(progress: LearnerProgress, lessonId: string): LearnerProgress {
  if (progress.completedLessonIds.includes(lessonId)) return progress;
  return { ...progress, completedLessonIds: [...progress.completedLessonIds, lessonId] };
}

/** Where a module's main button should start: the first unfinished lesson, or the first lesson if all are done. */
export function nextLessonIndex(lessonIds: string[], completedLessonIds: string[]): number {
  const done = new Set(completedLessonIds);
  const k = lessonIds.findIndex((id) => !done.has(id));
  return k === -1 ? 0 : k;
}
