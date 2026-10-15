/**
 * BabyReady lesson format (v2): a class-style slide sequence.
 *
 * Each lesson plays like a presenter-led class: a slide appears, narration
 * plays, captions show, and the player auto-advances. Check-in slides pause
 * for a question. Safety slides always render in full and cannot be skipped.
 *
 * Quality model (replaces the multi-stage governance workflow):
 *  1. Every teaching slide lists at least one sourceId. No source, no slide.
 *  2. Sources come only from the approved organization list below.
 *  3. A lesson is either "draft" or "reviewed". Reviewed lessons record who
 *     reviewed them, when, and when they must be re-checked (max 12 months).
 *  4. Lessons live as JSON files in the repo; Git history is the audit trail.
 */

export type ApprovedOrganization =
  | 'ACOG' // American College of Obstetricians and Gynecologists
  | 'AAP' // American Academy of Pediatrics
  | 'CDC'
  | 'NICHD' // NIH child health and human development
  | 'AAFP' // American Academy of Family Physicians
  | 'ACNM' // American College of Nurse-Midwives
  | 'WHO'
  | 'Lamaze'
  | 'ICEA'; // International Childbirth Education Association

export interface Source {
  id: string;
  organization: ApprovedOrganization;
  title: string;
  url: string;
  /** Date someone last opened the live page and confirmed it supports the slide. */
  verifiedOn: string | null;
}

export interface LessonReview {
  status: 'draft' | 'reviewed';
  reviewedBy: string | null; // name and credential, e.g. "Jane Doe, RN, IBCLC"
  reviewedOn: string | null; // ISO date
  nextReviewBy: string | null; // ISO date, at most 12 months after reviewedOn
  notes?: string;
}

export interface Visual {
  kind: 'illustration' | 'diagram' | 'photo' | 'comparison-table' | 'icon-list';
  /** What the designer or illustrator should create. Doubles as alt text. */
  description: string;
  assetId?: string; // filled in once the artwork exists
}

export interface CheckInQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Shown after answering, whether right or wrong. Teaches, never scolds. */
  explanation: string;
}

interface SlideBase {
  id: string;
  heading: string;
  /** Short on-screen text. Narration carries the detail. */
  onScreen: string[];
  /** Spoken script. Written for the ear: short sentences, warm, plain. */
  narration: string;
  sourceIds: string[];
  visual?: Visual;
}

export type Slide =
  | (SlideBase & { type: 'title' | 'content' | 'summary' })
  | (SlideBase & { type: 'comparison'; columns: [string, string]; rows: [string, string][] })
  | (SlideBase & { type: 'video'; video: { assetId?: string; brief: string; maxSeconds: number } })
  | (SlideBase & { type: 'checkin'; question: CheckInQuestion })
  | (SlideBase & { type: 'reflection'; savesTo: 'birthReadinessBrief'; prompt: string })
  | (SlideBase & { type: 'safety' }); // never skippable, never AI-generated

export interface Lesson {
  courseId: string;
  lessonId: string;
  order: number;
  title: string;
  learningGoals: string[];
  estimatedMinutes: number;
  review: LessonReview;
  sources: Source[];
  slides: Slide[];
  /** End-of-lesson quiz. Not graded for pass/fail; used to reinforce learning. */
  reviewQuiz: CheckInQuestion[];
  nextLessonId?: string;
}
