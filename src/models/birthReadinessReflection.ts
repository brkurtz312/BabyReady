/**
 * A learner's answer to a reflection slide in the class player. Each answer is
 * its own private document under users/{uid}/birthReadinessReflections, so new
 * lessons can add reflection slides without changing the database rules.
 *
 * The prompt text is not stored; the Brief looks it up from the lesson content
 * by lessonId and slideId.
 */

export const BIRTH_READINESS_REFLECTION_MAX_LENGTH = 2000;

/** Lesson and slide ids are lowercase words joined by hyphens. */
export const REFLECTION_ID_PART = /^[a-z0-9-]{1,80}$/;

export type BirthReadinessReflection = {
  courseId: string;
  lessonId: string;
  slideId: string;
  text: string;
  updatedAt: unknown;
};

export function reflectionDocumentId(lessonId: string, slideId: string): string {
  return `${lessonId}__${slideId}`;
}
