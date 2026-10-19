/**
 * Which lessons are free and which need the full-class purchase.
 *
 * Free for everyone: all of Early Pregnancy Basics, the class welcome, and the
 * lessons that teach when to get urgent help, for the pregnant person and the
 * baby. Decided by the clinical lead on 2026-10-19: safety guidance is never
 * behind the purchase.
 *
 * This file has no imports so plain Node can run it in tests.
 */

export const FREE_COURSE_IDS = ['early-pregnancy-basics'];

export const FREE_LESSON_IDS = [
  'welcome-how-this-class-works',
  'when-to-contact-your-care-team',
  'postpartum-warning-signs',
  'when-to-call-about-your-baby',
  'safe-sleep',
  'infant-cpr-and-choking',
];

export function isFreeLesson(courseId: string, lessonId: string): boolean {
  return FREE_COURSE_IDS.includes(courseId) || FREE_LESSON_IDS.includes(lessonId);
}

/**
 * A lesson is locked only when the purchase is switched on, the learner hasn't
 * bought the full class, and the lesson isn't free.
 */
export function isLessonLocked(
  courseId: string,
  lessonId: string,
  access: { paywallEnabled: boolean; unlocked: boolean },
): boolean {
  return access.paywallEnabled && !access.unlocked && !isFreeLesson(courseId, lessonId);
}
