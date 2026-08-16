export const BIRTH_READINESS_BRIEF_ID = 'preparing-for-labor' as const;
export const BIRTH_READINESS_BRIEF_COURSE_ID = 'preparing-for-labor' as const;
export const BIRTH_READINESS_BRIEF_SCHEMA_VERSION = 1 as const;
export const BIRTH_READINESS_BRIEF_MAX_DISCUSSION_QUESTIONS = 10;
export const BIRTH_READINESS_BRIEF_MAX_QUESTION_LENGTH = 280;

export const birthReadinessItemKeys = [
  'careTeamContactConfirmed',
  'afterHoursPlanConfirmed',
  'arrivalLocationConfirmed',
  'transportationPlanDiscussed',
  'supportPersonPlanDiscussed',
  'questionsPrepared',
] as const;

export type BirthReadinessItemKey = (typeof birthReadinessItemKeys)[number];

export type BirthReadinessItems = Record<BirthReadinessItemKey, boolean>;

/**
 * The Preparing for Labor brief deliberately contains only bounded planning
 * selections and questions for the learner's own conversation. It does not
 * model clinical history, triage, provider messaging, sharing, or attachments.
 */
export type BirthReadinessBrief = {
  id: typeof BIRTH_READINESS_BRIEF_ID;
  courseId: typeof BIRTH_READINESS_BRIEF_COURSE_ID;
  schemaVersion: typeof BIRTH_READINESS_BRIEF_SCHEMA_VERSION;
  readinessItems: BirthReadinessItems;
  discussionQuestions: string[];
  createdAt: unknown;
  updatedAt: unknown;
};

export function emptyBirthReadinessItems(): BirthReadinessItems {
  return {
    careTeamContactConfirmed: false,
    afterHoursPlanConfirmed: false,
    arrivalLocationConfirmed: false,
    transportationPlanDiscussed: false,
    supportPersonPlanDiscussed: false,
    questionsPrepared: false,
  };
}
