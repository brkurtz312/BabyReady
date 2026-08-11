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

export type LearnerCourseLesson = {
  id: string;
  title: string;
  summary?: string;
  estimatedMinutes?: number;
};

export type LearnerCourseModule = {
  id: string;
  order: number;
  title: string;
  summary?: string;
  lessons: LearnerCourseLesson[];
};

export type CourseRecord = {
  id: string;
  title: string;
  summary: string;
  locale: string;
  publicationState: ContentPublicationState;
  createdBy: string;
  learnerOutline?: LearnerCourseModule[];
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
  publishedAt?: unknown;
  frozenAt?: unknown;
  frozenBy?: string;
  freezeReason?: string;
  updatedAt?: unknown;
};

export type ClinicalContentBlock = {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  /**
   * Short learner-facing card label. Legacy published records may omit this
   * field, but newly authored blocks must provide one before review.
   */
  title?: string;
  /**
   * Clinician-controlled sequence within a learner lesson. Lower numbers
   * appear first; legacy blocks without this field use a stable ID fallback.
   */
  displayOrder?: number;
  type:
    | 'text'
    | 'callout'
    | 'checklist'
    | 'question'
    | 'audio'
    | 'video'
    | 'figure'
    | 'citation'
    | 'emergency_card'
    | 'artifact_prompt';
  body: string;
  sourceIds: string[];
  mediaIds: string[];
  isClinicalClaim: boolean;
  clinicalReviewerId?: string | null;
  lastReviewedAt?: unknown;
  nextReviewAt?: unknown;
  publicationState: ContentPublicationState;
  versionCount?: number;
};

export type ClinicalContentVersionAction =
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'frozen'
  | 'order_updated';

export type ClinicalContentVersion = {
  id: string;
  versionNumber: number;
  action: ClinicalContentVersionAction;
  actorId: string;
  createdAt: unknown;
  note?: string;
  snapshot: {
    contentBlockId: string;
    title?: string;
    type: ClinicalContentBlock['type'];
    body: string;
    sourceIds: string[];
    mediaIds: string[];
    isClinicalClaim: boolean;
    publicationState: ContentPublicationState;
    displayOrder?: number;
  };
};

export type ClinicalMediaType = 'figure' | 'external_video';

export type ClinicalMedia = {
  id: string;
  title: string;
  type: ClinicalMediaType;
  assetKey: string;
  altText: string;
  caption?: string;
  externalUrl?: string | null;
  transcriptUrl?: string | null;
  publisher?: string | null;
  language?: string | null;
  durationSeconds?: number | null;
  sourceIds: string[];
  isClinicalClaim: boolean;
  clinicalReviewerId?: string | null;
  lastReviewedAt?: unknown;
  nextReviewAt?: unknown;
  publicationState: ContentPublicationState;
  versionCount?: number;
  createdBy?: string;
  submittedBy?: string;
  submittedAt?: unknown;
  publishedAt?: unknown;
  frozenAt?: unknown;
  frozenBy?: string;
  freezeReason?: string;
  updatedAt?: unknown;
};

export type ClinicalMediaVersionAction =
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'frozen';

export type ClinicalMediaVersion = {
  id: string;
  versionNumber: number;
  action: ClinicalMediaVersionAction;
  actorId: string;
  createdAt: unknown;
  note?: string;
  snapshot: {
    mediaId: string;
    title: string;
    type: ClinicalMediaType;
    assetKey: string;
    altText: string;
    caption?: string;
    externalUrl?: string;
    transcriptUrl?: string;
    publisher?: string;
    language?: string;
    durationSeconds?: number;
    sourceIds: string[];
    isClinicalClaim: boolean;
    publicationState: ContentPublicationState;
  };
};

export type ClinicalMediaReview = {
  id: string;
  mediaId: string;
  reviewerId: string;
  reviewNotes: string;
  versionNumber: number;
  approvedAt: unknown;
};

export type ComparisonAuditExportRoute =
  | 'web_print'
  | 'native_share'
  | 'file_created';

export type ComparisonAuditExportLog = {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  contentBlockId: string;
  baselineVersionId: string;
  baselineVersionNumber: number;
  comparisonVersionId: string;
  comparisonVersionNumber: number;
  exportFormat: 'pdf';
  exportRoute: ComparisonAuditExportRoute;
  exportedBy: string;
  exportedAt: unknown;
};

export type ComparisonAuditExportDashboardEntry =
  ComparisonAuditExportLog & {
    documentPath: string;
  };

export type AuditReportFilterSnapshot = {
  scope: string;
  clinicianId: string;
  exportRoute: 'all' | ComparisonAuditExportRoute;
  startDate: string;
  endDate: string;
  versionNumber: string;
};

export type AuditReportManifest = {
  id: string;
  reportId: string;
  exportFormat: 'pdf';
  exportRoute: ComparisonAuditExportRoute;
  exportedBy: string;
  exportedAt: unknown;
  filterSnapshot: AuditReportFilterSnapshot;
  recordCount: number;
  pageCount: number;
  auditRecordIds: string[];
  auditRecordPaths: string[];
};
