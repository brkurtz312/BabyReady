export type CourseModule = {
  id: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  recommendedWeeks: string;
};

export type LessonState = 'not_started' | 'in_progress' | 'completed' | 'not_relevant';

export type ContentPublicationState =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'frozen';

export type CourseRecord = {
  id: string;
  title: string;
  summary: string;
  locale: string;
  publicationState: ContentPublicationState;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ClinicalReview = {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  contentBlockId: string;
  reviewerId: string;
  reviewNotes: string;
  approvedAt: string;
};

export type CourseProgress = {
  userId: string;
  moduleId: string;
  lessonId: string;
  state: LessonState;
  lastPosition?: number;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

export type CareTeamContacts = {
  prenatalTeam?: string;
  laborAndDeliveryTriage?: string;
  pediatricTeam?: string;
  lactationSupport?: string;
  emergencyNumber?: string;
  supportPerson?: string;
  updatedAt: string;
};

export type ContentSource = {
  id: string;
  organization: string;
  title: string;
  url: string;
  lastReviewedAt: unknown;
  nextReviewAt: unknown;
  publicationState: ContentPublicationState;
  updatedAt?: unknown;
};

export type ClinicalContentBlock = {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  type:
    | 'text'
    | 'callout'
    | 'checklist'
    | 'question'
    | 'audio'
    | 'video'
    | 'citation'
    | 'emergency_card'
    | 'artifact_prompt';
  body: string;
  sourceIds: string[];
  isClinicalClaim: boolean;
  clinicalReviewerId?: string;
  lastReviewedAt?: unknown;
  nextReviewAt?: unknown;
  publicationState: ContentPublicationState;
};
