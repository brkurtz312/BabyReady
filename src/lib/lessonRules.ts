/**
 * Checks lessons against the lightweight quality model in src/models/lesson.ts.
 *
 * Errors block a lesson from shipping. Warnings are reminders (for example,
 * a source nobody has verified yet) that are fine while a lesson is a draft.
 *
 * This file only uses type imports so plain Node can run it in tests.
 */
import type { ApprovedOrganization, CheckInQuestion, Lesson } from '../models/lesson';

export const APPROVED_ORGANIZATIONS: readonly ApprovedOrganization[] = [
  'ACOG',
  'AAP',
  'CDC',
  'NICHD',
  'AAFP',
  'ACNM',
  'WHO',
  'Lamaze',
  'ICEA',
];

const SLIDE_TYPES = [
  'title',
  'content',
  'comparison',
  'video',
  'checkin',
  'reflection',
  'safety',
  'summary',
];

/** Slides that teach facts and so must cite a source. */
const TEACHING_SLIDE_TYPES = ['content', 'comparison', 'video', 'safety'];

export type LessonIssue = { lessonId: string; where: string; message: string };

export type LessonCheckResult = { errors: LessonIssue[]; warnings: LessonIssue[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function checkQuestion(q: CheckInQuestion | undefined, where: string, error: (w: string, m: string) => void) {
  if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) {
    error(where, 'Question needs a prompt.');
    return;
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    error(where, 'Question needs at least two answer options.');
    return;
  }
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    error(where, 'Question correctIndex does not point at one of its options.');
  }
  if (typeof q.explanation !== 'string' || !q.explanation.trim()) {
    error(where, 'Question needs an explanation shown after answering.');
  }
}

export function checkLesson(lesson: Lesson): LessonCheckResult {
  const lessonId = lesson?.lessonId || '(missing lessonId)';
  const errors: LessonIssue[] = [];
  const warnings: LessonIssue[] = [];
  const error = (where: string, message: string) => errors.push({ lessonId, where, message });
  const warn = (where: string, message: string) => warnings.push({ lessonId, where, message });

  for (const field of ['courseId', 'lessonId', 'title'] as const) {
    if (typeof lesson[field] !== 'string' || !lesson[field].trim()) error('lesson', `Missing ${field}.`);
  }
  if (!Number.isInteger(lesson.order) || lesson.order < 1) error('lesson', 'order must be a whole number from 1.');
  if (!Array.isArray(lesson.learningGoals) || lesson.learningGoals.length === 0) {
    error('lesson', 'Add at least one learning goal.');
  }

  // Review status
  const review = lesson.review;
  if (!review || (review.status !== 'draft' && review.status !== 'reviewed')) {
    error('review', 'review.status must be "draft" or "reviewed".');
  } else if (review.status === 'reviewed') {
    if (!review.reviewedBy?.trim()) error('review', 'Reviewed lessons must name the reviewer and credentials.');
    if (!isIsoDate(review.reviewedOn)) error('review', 'Reviewed lessons need reviewedOn as YYYY-MM-DD.');
    if (!isIsoDate(review.nextReviewBy)) error('review', 'Reviewed lessons need nextReviewBy as YYYY-MM-DD.');
    if (isIsoDate(review.reviewedOn) && isIsoDate(review.nextReviewBy)) {
      if (review.nextReviewBy <= review.reviewedOn) error('review', 'nextReviewBy must be after reviewedOn.');
      if (review.nextReviewBy > addMonths(review.reviewedOn, 12)) {
        error('review', 'nextReviewBy can be at most 12 months after reviewedOn.');
      }
    }
  } else {
    warn('review', 'Lesson is still a draft.');
  }

  // Sources
  const sourceIds = new Set<string>();
  for (const source of lesson.sources ?? []) {
    const where = `source "${source.id}"`;
    if (sourceIds.has(source.id)) error(where, 'Duplicate source id.');
    sourceIds.add(source.id);
    if (!APPROVED_ORGANIZATIONS.includes(source.organization)) {
      error(where, `"${source.organization}" is not an approved organization.`);
    }
    if (typeof source.url !== 'string' || !source.url.startsWith('https://')) {
      error(where, 'Source url must start with https://.');
    }
    if (source.verifiedOn === null) {
      if (review?.status === 'reviewed') error(where, 'Reviewed lessons cannot have unverified sources.');
      else warn(where, 'Not verified yet (verifiedOn is empty).');
    } else if (!isIsoDate(source.verifiedOn)) {
      error(where, 'verifiedOn must be YYYY-MM-DD or null.');
    }
  }

  // Slides
  const usedSources = new Set<string>();
  const slideIds = new Set<string>();
  if (!Array.isArray(lesson.slides) || lesson.slides.length === 0) error('lesson', 'Lesson has no slides.');
  for (const slide of lesson.slides ?? []) {
    const where = `slide "${slide.id}"`;
    if (slideIds.has(slide.id)) error(where, 'Duplicate slide id.');
    slideIds.add(slide.id);
    if (!SLIDE_TYPES.includes(slide.type)) {
      error(where, `Unknown slide type "${slide.type}".`);
      continue;
    }
    if (!slide.heading?.trim()) error(where, 'Slide needs a heading.');
    if (!Array.isArray(slide.onScreen)) error(where, 'onScreen must be a list.');
    if (typeof slide.narration !== 'string' || !slide.narration.trim()) error(where, 'Slide needs narration.');
    if (!Array.isArray(slide.sourceIds)) {
      error(where, 'sourceIds must be a list.');
      continue;
    }
    if (slide.editorial !== undefined && slide.editorial !== true) {
      error(where, 'editorial must be true or left out.');
    }
    if (slide.editorial && slide.type === 'safety') {
      error(where, 'Safety slides cannot be editorial; they always need a source.');
    }
    if (slide.editorial && slide.sourceIds.length > 0) {
      warn(where, 'Editorial slide also cites sources; drop editorial if it makes a health claim.');
    }
    if (TEACHING_SLIDE_TYPES.includes(slide.type) && slide.sourceIds.length === 0 && !slide.editorial) {
      error(where, 'Teaching slides must cite at least one source. No source, no slide.');
    }
    for (const id of slide.sourceIds) {
      if (!sourceIds.has(id)) error(where, `Cites "${id}", which is not in this lesson's sources.`);
      usedSources.add(id);
    }
    if (slide.type === 'checkin') checkQuestion(slide.question, where, error);
    if (slide.type === 'comparison') {
      if (!Array.isArray(slide.columns) || slide.columns.length !== 2) error(where, 'Comparison needs two column names.');
      if (!Array.isArray(slide.rows) || slide.rows.some((r) => !Array.isArray(r) || r.length !== 2)) {
        error(where, 'Each comparison row needs exactly two cells.');
      }
    }
    if (slide.type === 'reflection') {
      if (slide.savesTo !== 'birthReadinessBrief') error(where, 'Reflection must save to birthReadinessBrief.');
      if (!slide.prompt?.trim()) error(where, 'Reflection needs a prompt.');
    }
    if (slide.type === 'video' && (!slide.video?.brief?.trim() || !(slide.video.maxSeconds > 0))) {
      error(where, 'Video needs a brief and a maxSeconds above zero.');
    }
  }
  for (const id of sourceIds) {
    if (!usedSources.has(id)) warn(`source "${id}"`, 'Listed but no slide cites it.');
  }

  // Review quiz
  if (!Array.isArray(lesson.reviewQuiz) || lesson.reviewQuiz.length === 0) {
    error('reviewQuiz', 'Lesson needs at least one review quiz question.');
  } else {
    lesson.reviewQuiz.forEach((q, k) => checkQuestion(q, `reviewQuiz ${k + 1}`, error));
  }

  return { errors, warnings };
}

/** Checks a whole course: each lesson, plus ordering and next-lesson links. */
export function checkCourse(lessons: Lesson[]): LessonCheckResult {
  const errors: LessonIssue[] = [];
  const warnings: LessonIssue[] = [];
  const ids = new Set(lessons.map((l) => l.lessonId));
  const orders = new Set<number>();

  for (const lesson of lessons) {
    const result = checkLesson(lesson);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (orders.has(lesson.order)) {
      errors.push({ lessonId: lesson.lessonId, where: 'lesson', message: `Another lesson already uses order ${lesson.order}.` });
    }
    orders.add(lesson.order);
    if (lesson.nextLessonId && !ids.has(lesson.nextLessonId)) {
      errors.push({
        lessonId: lesson.lessonId,
        where: 'lesson',
        message: `nextLessonId "${lesson.nextLessonId}" is not a lesson in this course.`,
      });
    }
  }
  return { errors, warnings };
}
