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
  courseId: string;
  moduleId: string;
  lessonId: string;
  state: LessonState;
  lastPosition?: number;
  startedAt?: string;
  completedAt?: string | null;
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

export type MediaIntakeInputType = 'web_url' | 'video_url' | 'pdf';

export type MediaIntakeStatus =
  | 'queued'
  | 'extracting'
  | 'evaluated'
  | 'needs_attention'
  | 'held'
  | 'rejected'
  | 'archived'
  | 'failed';

export type MediaIntakeDisposition =
  | 'held'
  | 'rejected'
  | 'archived'
  | 'source_draft'
  | 'media_draft'
  | 'content_draft';

export type MediaIntake = {
  id: string;
  inputType: MediaIntakeInputType;
  originalUrl?: string;
  transcriptUrl?: string;
  submitterNote?: string;
  suggestedTopic?: string;
  attestedNoPatientInformation: true;
  status: MediaIntakeStatus;
  submittedBy: string;
  submittedAt: unknown;
  updatedAt: unknown;
  evaluationRequestedAt?: unknown;
  evaluationCompletedAt?: unknown;
  activeAnalysisId?: string;
  finalDisposition?: MediaIntakeDisposition;
  decisionNote?: string;
  decidedBy?: string;
  decidedAt?: unknown;
  linkedSourceId?: string;
  linkedMediaId?: string;
  linkedContentBlock?: {
    courseId: string;
    moduleId: string;
    lessonId: string;
    contentBlockId: string;
  };
  failure?: {
    stage: 'validation' | 'fetch' | 'extract' | 'analysis';
    safeMessage: string;
  };
};

export type MediaIntakeAnalysisEvidence = {
  quote: string;
  locator: string;
};

export type MediaIntakeAnalysis = {
  id: string;
  intakeId: string;
  schemaVersion: 1;
  status: 'complete' | 'partial' | 'failed';
  createdAt: unknown;
  workerVersion: string;
  sourceFingerprint: {
    canonicalUrl?: string;
    title?: string;
    publisher?: string;
    publicationDate?: string;
    updatedDate?: string;
    language?: string;
    contentKind:
      | 'guideline'
      | 'handout'
      | 'figure'
      | 'slide_deck'
      | 'video'
      | 'web_page'
      | 'unknown';
    durationSeconds?: number;
    video?: {
      originalVideoUrl?: string;
      host?: string;
      channelOrAccount?: string;
      captionsAvailable?: boolean | 'unknown';
      transcriptUrl?: string;
      videoLanguage?: string;
    };
  };
  extraction: {
    textAvailable: boolean;
    transcriptAvailable: boolean | 'unknown';
    extractionWarnings: string[];
  };
  suitability: {
    recommendation:
      | 'review_favorably'
      | 'review_with_cautions'
      | 'adapt_only'
      | 'source_only'
      | 'not_recommended';
    summary: string;
    reasons: Array<{
      category:
        | 'authority'
        | 'currency'
        | 'clinical_fit'
        | 'claims'
        | 'bias'
        | 'accessibility'
        | 'rights'
        | 'scope';
      finding: string;
      evidence: MediaIntakeAnalysisEvidence[];
    }>;
    flags: Array<{
      severity: 'info' | 'caution' | 'blocker';
      code: string;
      message: string;
      evidence?: MediaIntakeAnalysisEvidence[];
    }>;
  };
  placement: Array<{
    educationPhase:
      | 'early_pregnancy'
      | 'second_trimester'
      | 'preparing_for_labor'
      | 'labor_and_birth'
      | 'newborn_care_and_feeding'
      | 'recovery_and_postpartum';
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
    contentFormat:
      | 'source_only'
      | 'external_video'
      | 'figure_backed_card'
      | 'slide_style_lesson'
      | 'learner_content_draft';
    confidence: 'high' | 'medium' | 'low';
    rationale: string;
  }>;
  relatedContent: Array<{
    courseId: string;
    moduleId?: string;
    lessonId?: string;
    contentBlockId?: string;
    relationship: 'overlaps' | 'extends' | 'fills_gap';
    rationale: string;
  }>;
  proposedDraft: {
    source: {
      organization?: string;
      title?: string;
      url?: string;
    };
    externalVideo?: {
      title?: string;
      originalVideoUrl?: string;
      transcriptUrl?: string;
      publisher?: string;
      durationSeconds?: number;
      language?: string;
      learnerCaption?: string;
      altText?: string;
      eligibleForExternalVideoDraft: boolean;
      ineligibilityReasons?: string[];
    };
  };
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
