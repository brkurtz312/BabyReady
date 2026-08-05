export type CourseModule = {
  id: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  recommendedWeeks: string;
};

export type LessonState = 'not_started' | 'in_progress' | 'completed' | 'not_relevant';

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
  lastReviewedAt: string;
  nextReviewAt: string;
};

export type ClinicalContentBlock = {
  id: string;
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
  clinicalReviewerId?: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  publicationState: 'draft' | 'submitted' | 'approved' | 'published' | 'frozen';
};
