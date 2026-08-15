# BabyReady Media Intake — Implementation Plan

## Decision

Build **Media Intake** as a clinician-administrator workspace for evaluating candidate URLs, PDFs, and externally hosted videos before they become BabyReady source, media, or content-card drafts.

It is not a second publication system. It is an upstream intake and decision layer that feeds the existing governed lifecycle:

```text
Candidate submitted
  → extracted and analyzed by a server-side worker
  → clinician triage decision
  → governed draft created
  → existing submit / approve / publish workflow
  → learner-visible content only after publication
```

AI may extract, classify, summarize, flag risks, and recommend placement. It must never publish learner content, alter an approved item, or make a patient-specific recommendation.

## Problem

Useful patient-education material appears continuously as guidelines, PDFs, figures, slide decks, and externally hosted videos. Today, adding a promising item requires manually determining whether it is current, credible, accessible, relevant to BabyReady, non-duplicative, and appropriate for a particular lesson. For video, this also requires checking the original publisher, duration, captions or transcript, learner suitability, and whether the item should be linked, contextualized, or adapted. That slows content development and makes the review decision difficult to audit later.

The intended experience is a virtual childbirth-education program built around clinician-governed visual learning. A source intake process needs to help identify where a candidate belongs while preserving the existing source, media, content-block, clinical-review, and publication controls.

## Goals

- Give a clinician administrator one place to submit a candidate web, video, or PDF URL, or a PDF upload, with a short note.
- Return a structured, evidence-grounded AI assessment that supports review rather than replacing it.
- Recommend one or more placements in the pregnancy-to-postpartum learning path and identify existing related content.
- Treat video evaluation and eligible external-video draft creation as first-release capabilities, including accessibility and host checks.
- Convert an accepted candidate into a governed BabyReady draft with one deliberate clinician action.
- Preserve the candidate, extraction, AI assessment, human decision, and resulting draft links as an audit trail.
- Keep all unreviewed candidates and AI analysis unavailable to learners.

## Non-goals for the First Release

- Automatic publication of a source, video, PDF, media item, or learner card.
- Personalized patient advice, triage, diagnosis, or treatment recommendations.
- Uploading or processing patient records, screenshots, portal exports, or any material containing patient information.
- Re-hosting or reproducing third-party content without a documented right to do so.
- General web crawling, social-media ingestion, or arbitrary file types.
- Downloading, re-encoding, editing, or storing copies of third-party video. The first release evaluates original hosted video and, if approved, creates an external link record only.
- Native learner delivery of PDFs, slide decks, or uploaded figures. The first release evaluates those materials and can create a source or a clinician-authored content draft; a governed learner document/slide format is a later capability.

## Users and Permissions

| User | Capabilities |
| --- | --- |
| **Clinician administrator** | Submit URL/PDF candidates, trigger evaluation, inspect original and analysis, record a decision, create downstream drafts, reject or archive a candidate. |
| **Clinical reviewer** | Use the same administrator workspace, review the AI evidence and resulting governed drafts, then follow the existing approval and publication process. |
| **Learner** | No access to the intake queue, original candidate files, AI analyses, rejected material, or drafts. |
| **Server-side intake worker** | Fetches approved external URLs, extracts PDF/web content, performs AI analysis, and writes only structured intake results. It does not publish learner content. |

Every clinician-facing action requires the existing Firebase administrator custom claim. The server-side worker uses a service identity with only the minimum required access.

## First-Release Workflow

### Submit a candidate

The clinician opens **Media Intake** from the clinician workspace and chooses one input type:

- **Web or video URL** — guideline, patient handout page, original video page, or publication page. The clinician labels a known video as “Video” to enable video-specific checks; the worker also detects video candidates from metadata.
- **PDF upload** — guideline, handout, slide deck, or figure-rich document.

Required fields:

- Candidate type: web URL, video URL, or PDF.
- Original URL or PDF file.
- Optional clinician note.
- Optional suspected topic or preferred placement.
- Attestation: “This material contains no patient information and may be evaluated for internal content review.”

The client performs only light validation. It creates a clinician-only candidate record and starts a server-side evaluation job.

### Extract and evaluate

The worker records extraction outcomes separately from AI analysis:

1. **Fetch and validate** the URL or PDF.
2. **Extract metadata** such as title, organization, author when available, publication date, update date, language, media type, page count, and file hash.
3. **Extract usable text or transcript evidence.** For video, collect platform metadata, duration when available, caption or transcript availability, language, and a transcript or caption source when accessible.
4. **Run the structured AI assessment** against the extracted text and metadata.
5. **Save a versioned analysis** with exact quoted excerpts or PDF page references supporting each material finding.

The analysis result should never say that a source is medically correct. It should instead use decision-support language such as:

- “Appears suitable for clinician review because…”
- “Needs verification because…”
- “Not recommended for learner use without substantial revision because…”

### Clinician triage

The clinician sees the original candidate and the AI assessment side by side, then chooses one disposition:

- **Create source draft**
- **Create external-video draft** for eligible video candidates
- **Create learner-content draft**
- **Hold for later**
- **Reject**
- **Archive**

Each conversion action is explicit and creates a link to the newly created governed record. The clinician may edit all proposed metadata and learner-facing language before saving the downstream draft.

### Existing review and publication

After conversion, the candidate does not bypass the current lifecycle:

```text
Draft → Submitted → Approved → Published
```

Existing review notes, reviewer identity, source requirements, next-review date, immutable version history, and freeze controls remain authoritative. Media Intake records only the origin and evaluation history.

## Data Model

### `mediaIntakes/{intakeId}`

This is the clinician-only parent record for one submitted candidate.

```ts
type MediaIntakeStatus =
  | 'draft'
  | 'queued'
  | 'extracting'
  | 'evaluated'
  | 'needs_attention'
  | 'converted'
  | 'held'
  | 'rejected'
  | 'archived'
  | 'failed';

type MediaIntake = {
  id: string;
  inputType: 'web_url' | 'video_url' | 'pdf';
  originalUrl?: string;
  upload?: {
    storagePath: string;
    originalFilename: string;
    contentType: 'application/pdf';
    byteSize: number;
    sha256: string;
  };
  submitterNote?: string;
  suggestedTopic?: string;
  declaredVideoHost?: 'youtube' | 'vimeo' | 'other' | 'unknown';
  attestedNoPatientInformation: true;
  status: MediaIntakeStatus;
  submittedBy: string;
  submittedAt: Timestamp;
  updatedAt: Timestamp;
  evaluationRequestedAt?: Timestamp;
  evaluationCompletedAt?: Timestamp;
  activeAnalysisId?: string;
  linkedSourceId?: string;
  linkedMediaId?: string;
  linkedContentBlock?: {
    courseId: string;
    moduleId: string;
    lessonId: string;
    contentBlockId: string;
  };
  finalDisposition?: 'source_draft' | 'media_draft' | 'content_draft' | 'held' | 'rejected' | 'archived';
  decisionNote?: string;
  decidedBy?: string;
  decidedAt?: Timestamp;
  failure?: {
    stage: 'validation' | 'fetch' | 'extract' | 'analysis';
    safeMessage: string;
  };
};
```

### `mediaIntakes/{intakeId}/analyses/{analysisId}`

Every AI evaluation is immutable. A re-run creates a new analysis document rather than overwriting the prior result.

```ts
type MediaIntakeAnalysis = {
  id: string;
  intakeId: string;
  schemaVersion: 1;
  status: 'complete' | 'partial' | 'failed';
  createdAt: Timestamp;
  workerVersion: string;
  sourceFingerprint: {
    canonicalUrl?: string;
    sha256?: string;
    title?: string;
    publisher?: string;
    publicationDate?: string;
    updatedDate?: string;
    language?: string;
    contentKind: 'guideline' | 'handout' | 'figure' | 'slide_deck' | 'video' | 'web_page' | 'unknown';
    pageCount?: number;
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
    textStoragePath?: string;
    pageMapStoragePath?: string;
    extractionWarnings: string[];
  };
  suitability: {
    recommendation: 'review_favorably' | 'review_with_cautions' | 'adapt_only' | 'source_only' | 'not_recommended';
    summary: string;
    reasons: Array<{
      category: 'authority' | 'currency' | 'clinical_fit' | 'claims' | 'bias' | 'accessibility' | 'rights' | 'scope';
      finding: string;
      evidence: Array<{ quote: string; locator: string }>;
    }>;
    flags: Array<{
      severity: 'info' | 'caution' | 'blocker';
      code: string;
      message: string;
      evidence?: Array<{ quote: string; locator: string }>;
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
    learnerCard?: {
      title?: string;
      summary?: string;
      suggestedType?: 'text' | 'callout' | 'checklist' | 'figure' | 'video' | 'citation';
      requiresClinicianRewrite: boolean;
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
```

### Storage objects

Store raw PDF files, extracted text, page maps, and thumbnails outside Firestore. Firestore documents retain only paths, hashes, sizes, and structured findings.

Proposed paths:

```text
media-intakes/{intakeId}/original/{sanitizedFilename}.pdf
media-intakes/{intakeId}/extraction/text.txt
media-intakes/{intakeId}/extraction/page-map.json
media-intakes/{intakeId}/preview/first-page.png
```

Raw files and extraction artifacts are clinician-only. The learner application never reads this storage namespace.

## AI Assessment Contract

The worker sends the model a bounded, extracted representation of the candidate and requires structured JSON matching the `MediaIntakeAnalysis` schema. The prompt must explicitly require:

- No patient-specific guidance.
- No diagnosis, treatment plan, urgency determination, or publication decision.
- No assertion that the material is clinically correct.
- Evidence locators for every material finding.
- “Unknown” instead of a fabricated date, author, transcript, licensing status, or factual claim.
- Separation between source text and proposed BabyReady learner language.
- Clear detection of content that should be clinician-rewritten rather than reused.

The analysis should score and explain:

| Area | AI question |
| --- | --- |
| **Authority** | Who authored or published this, and what signals support credibility? |
| **Currency** | Is a publication or update date present? Is the material potentially stale? |
| **Clinical fit** | Is this general education for a pregnancy, birth, newborn, or postpartum topic rather than individualized advice? |
| **Claims** | Are absolute, unsupported, or potentially misleading statements present? |
| **Bias** | Is commercial sponsorship, product promotion, or a narrow institutional workflow apparent? |
| **Accessibility** | Is text extractable? For video, are captions or a transcript available, is the spoken language known, and is a readable text alternative available? Does a figure need alt text and a text equivalent? |
| **Rights** | Does the material signal permissions, public-domain status, or reuse restrictions? If unclear, flag it for manual verification. |
| **Video delivery** | Is this an original, stable video URL on an allowed provider? Is it short enough and suitable for a learner lesson, and does it need a BabyReady framing caption? |
| **Placement** | Which learning phase, course, module, lesson, and learner format best fit this material? |
| **Overlap** | Does it duplicate, extend, or fill a gap in published BabyReady content? |

## Placement Taxonomy

Use a fixed placement vocabulary rather than title matching:

| Education phase | Intended content area |
| --- | --- |
| **Early pregnancy** | First steps, prenatal care, early symptoms, nutrition, supplements, safety, first prenatal visit. |
| **Second trimester** | Ongoing prenatal preparation, changes in pregnancy, planning questions, support systems. |
| **Preparing for labor** | Birth preparation, care-setting planning, preferences, support-person readiness, logistics. |
| **Labor and birth** | Labor basics, when to use the individual care team’s instructions, comfort, support, interventions, flexible decisions. |
| **Newborn care and feeding** | Infant feeding, newborn care, early parenting preparation, safe-sleep education. |
| **Recovery and postpartum** | Recovery, mental health, red flags, support, transition home, follow-up. |

The AI may recommend a placement, but a clinician selects the actual course, module, and lesson. If the target lesson does not exist, the result must read “Curriculum gap” rather than fabricate a location.

## User Experience

### Entry points

- Add **Media Intake** to the clinician review workspace alongside Source Library, Media Library, Content Authoring, and Audit Log.
- Add a contextual shortcut from Source Library and Media Library: “Evaluate new candidate.”

### Candidate queue

The queue lists:

- Title or filename.
- Input type.
- Submitted date and submitter.
- Status.
- AI recommendation badge after evaluation.
- Proposed education phase.
- Linked downstream draft, if created.

Default filters:

- Needs clinician triage.
- Evaluating or failed.
- Converted.
- Held.
- Rejected or archived.

### Detail workspace

On iPad at workspace width:

- **Left pane, about one-third width** — candidate queue and filters.
- **Right pane, at least two-thirds width** — candidate details, original preview, extraction status, AI assessment, placement recommendations, and action controls.

On phone:

- Candidate queue first.
- Detail screen second.
- Original preview and analysis in stacked sections.

The detail workspace uses tabs or segmented controls:

1. **Original** — source URL metadata or PDF preview, file facts, and clinician note. For video: provider, original URL, publisher/channel, duration, video language, and caption/transcript link or a clear “not found” state.
2. **Assessment** — AI summary, evidence-backed flags, accessibility, rights, and suitability.
3. **Placement** — ranked course/module/lesson recommendations, overlap analysis, and proposed learner format.
4. **Decision** — editable source/media/content draft proposal and conversion actions.
5. **History** — submission, analysis versions, decisions, linked drafts, reviewer actions, and failures.

### Conversion action rules

| Action | Preconditions | Result |
| --- | --- | --- |
| **Create source draft** | Evaluation complete; clinician confirms metadata. | Creates `sources/{sourceId}` as `draft`; stores `linkedSourceId`. |
| **Create external-video draft** | Candidate is classified as video; the original video URL uses a supported external-video host; a transcript or captions URL is available; the AI analysis does not contain an unresolved video-accessibility, rights, or host blocker; and the clinician completes missing fields. | Creates `clinicalMedia/{mediaId}` as `draft`; stores `linkedMediaId`; preserves original-video provenance and linked intake analysis. |
| **Create learner-content draft** | Clinician chooses an existing course/module/lesson and edits proposed copy. | Creates a clinical content block in `draft`; stores linked scope. |
| **Hold** | Any evaluated candidate. | Preserves the item and analysis without creating a learner-facing draft. |
| **Reject** | Clinician supplies a reason. | Preserves decision and audit trail; disables conversion until the item is re-opened. |

The application should not offer “Create external-video draft” for a generic web page or PDF, a video from an unsupported host, or a video without a transcript or captions link. It should not offer “Create figure draft” until BabyReady has a governed asset-upload and learner-rendering format for figures.

## Backend Architecture

### Client responsibilities

The Expo app:

- Authenticates the administrator.
- Creates intake metadata records.
- Uploads PDFs using a constrained, authenticated storage path.
- Shows job status and results.
- Allows clinician decisions and calls existing draft-creation services.

The Expo app does not fetch arbitrary external URLs for analysis, parse untrusted PDFs, retain model credentials, or call the model directly.

### Server-side responsibilities

Use a small server-side intake service, preferably Cloud Run or a Firebase Functions v2 service, backed by a dedicated service account.

Responsibilities:

1. Validate a queued request.
2. Safely fetch the URL or read a supplied PDF.
3. Enforce content type, size, timeout, redirect, and hostname controls.
4. For video URLs, resolve only safe public metadata and caption/transcript resources; do not download the video file.
5. Extract text and structured metadata.
6. Persist raw extraction artifacts in the protected storage namespace.
7. Call the AI provider with server-side credentials.
8. Validate returned JSON against the versioned analysis schema.
9. Write the immutable analysis and update intake status.

### Safe URL-fetching requirements

The server-side worker must:

- Accept only HTTPS URLs in the first release.
- Block private, loopback, link-local, and cloud-metadata IP ranges after DNS resolution.
- Limit redirects and revalidate each redirect target.
- Set tight connection, read, and total-job timeouts.
- Cap downloaded bytes and reject unsupported content types.
- Preserve the final canonical URL and response metadata.
- Never return raw server errors, internal IPs, secrets, or provider diagnostics to the clinician UI.

### Video evaluation limits and eligibility

The first release accepts video URLs for evaluation as a P0 capability. It evaluates the original publisher-hosted page and available transcript/caption sources without downloading or reproducing audiovisual content.

- Accept only HTTPS video URLs in the first release.
- Detect provider, canonical original video URL, channel or publisher, duration, language, and caption/transcript availability when the platform exposes those facts.
- Support conversion to a learner-facing external-video draft only for the current controlled provider allowlist: YouTube and Vimeo.
- Require a stable original URL and transcript/caption URL before video-draft conversion. If captions are shown by a platform but no durable caption/transcript reference can be retained, surface “Needs clinician attention” rather than silently treating the video as accessible.
- Flag commercial promotion, affiliate links, sponsor influence, age-restricted content, missing captions/transcript, inaccessible private videos, unavailable duration, and content requiring an institutional-context disclaimer.
- Allow the clinician to keep a video as a source-only candidate even if it is not eligible to become a learner-facing external-video draft.

### PDF limits

Set configuration-driven limits for:

- PDF-only MIME type.
- Maximum file size.
- Maximum page count.
- Maximum extracted characters sent to the model.
- Maximum processing duration.

If a document exceeds a limit, retain the safe file metadata and report a clinician-visible “Needs manual review” result rather than attempting a partial, misleading assessment.

## Security, Privacy, and Rights Controls

- Require the Firebase admin claim for all intake reads and writes.
- Add Firestore rules that allow no learner access to `mediaIntakes` or analyses.
- Add Storage rules restricting original and extracted intake artifacts to administrators and the server-side service identity.
- Require a no-PHI attestation at submission; add prominent UI text prohibiting patient records and screenshots.
- Do not store model API keys in the Expo app, `.env` files committed to the repository, Firestore, or client-accessible EAS variables.
- Encrypt data through the platform’s normal transport and storage controls; retain only information needed for clinical-content provenance.
- Include a configurable retention rule for rejected, failed, and raw extraction artifacts.
- Do not treat an AI rights assessment as legal clearance. “Rights unclear” blocks reuse as learner media until a human confirms permitted use.
- Keep learner-facing material independently authored or used with documented permission. Store the candidate as a source and create BabyReady-specific summary/caption/copy when reuse is uncertain.

## Firestore and Storage Rules Plan

Add a top-level administrator-only collection:

```text
mediaIntakes/{intakeId}
mediaIntakes/{intakeId}/analyses/{analysisId}
```

Rule intent:

- Administrator: read intake records and analyses.
- Administrator: create a minimal, validated candidate request and update only permitted decision fields.
- Administrator: cannot directly forge worker-owned extraction or analysis fields.
- Server-side service: writes extraction and analysis results using privileged server credentials.
- Learner/non-administrator: no read or write access.
- Analyses: append-only from the client perspective.

Because Firestore rules do not reliably distinguish every client workflow from a trusted server worker, the first release should use Cloud Run or Firebase Admin SDK for all worker-created analysis and immutable audit records. The client should only submit and decide; the worker should own analysis fields.

## Existing System Integration

| Existing BabyReady capability | Media Intake integration |
| --- | --- |
| **Source Library** | “Create source draft” uses the current source record shape and source publication controls. |
| **Media Library** | Video intake is first-release: eligible YouTube or Vimeo candidates can become `external_video` drafts, retaining the existing controlled-provider, caption/transcript, source, review, and publication requirements. |
| **Content Authoring** | Proposed learner copy becomes a normal clinical content-block draft, with a clinician-selected scope. |
| **Clinical Review** | Approved downstream content uses the existing reviewer, review notes, next-review date, and publication controls. |
| **Version history** | Intake analyses are immutable; downstream drafts retain their own existing immutable versions. |
| **Audit Log** | Add intake event visibility and links from an intake decision to its source/media/content draft. |
| **Learning Plan** | Placement taxonomy maps to the learner-facing education phases, but no intake candidate is exposed to learners until published. |

## Implementation Slices

### Slice A — Data model, security, and queue shell

Deliver:

- TypeScript models for intake, analysis, decision, and placement.
- Firestore rules and tests for administrator-only intake access.
- Storage rules for PDF originals and extraction artifacts.
- `mediaIntakeService` with candidate creation, subscription, decision updates, and linked-draft references.
- Clinician navigation entry and an empty queue/detail screen.

Acceptance criteria:

- Given a non-administrator, when they attempt to read or write an intake record, then Firestore denies access.
- Given an administrator, when they submit a valid URL candidate, then a clinician-only `queued` record is created.
- Given an administrator, when they open the queue, then learner-visible records are not included and candidate data is rendered only in the clinician workspace.

### Slice B — URL and video evaluation worker

Deliver:

- Cloud Run or Functions worker with secure URL fetching.
- Metadata/text extraction for HTML and supported video pages, including original video URL, publisher/channel, duration, language, and transcript/caption availability.
- Video eligibility assessment for the existing controlled-host external-video model. The worker never downloads or rehosts third-party video.
- Structured AI analysis with schema validation.
- Worker-state updates, failure handling, and immutable analysis history.
- Original/assessment/placement/history detail tabs.

Acceptance criteria:

- Given a valid HTTPS public URL, when the clinician requests evaluation, then the system records extraction metadata and one immutable analysis with evidence locators.
- Given a supported video URL with accessible transcript or captions, when the clinician requests evaluation, then the system records video metadata, accessibility findings, and placement recommendations without downloading the video.
- Given a video without a supported host, a stable original URL, or a transcript/captions reference, when evaluation completes, then the system clearly identifies the blocker and does not permit external-video draft conversion.
- Given a blocked hostname, unsupported type, oversized response, timeout, or malformed model response, when evaluation runs, then the candidate enters `failed` or `needs_attention` with a safe message and no learner records change.
- Given an analysis rerun, when the second analysis completes, then the original analysis remains available and the intake points to the newer active analysis.

### Slice C — PDF intake and preview

Deliver:

- Authenticated PDF upload flow.
- Protected storage layout.
- PDF text extraction, page mapping, and first-page thumbnail.
- PDF preview and page-linked analysis evidence.

Acceptance criteria:

- Given a valid PDF within configured limits, when uploaded and evaluated, then the clinician can preview it and see page-referenced analysis findings.
- Given an unsupported or oversized file, when upload is attempted, then the client prevents submission or the worker returns a safe manual-review message.

### Slice D — Draft conversion and audit links

Deliver:

- Editable “Create source draft” proposal.
- Eligible external-video conversion.
- Editable “Create learner-content draft” proposal with course/module/lesson selection.
- Decision capture, linked-record navigation, and intake history.

Acceptance criteria:

- Given a completed analysis, when a clinician creates a source draft, then the source has `publicationState: draft`, the intake links to it, and no learner can read it.
- Given an eligible video candidate, when a clinician creates an external-video draft, then the resulting `clinicalMedia` record is a clinician-only draft with preserved intake provenance and no learner-visible publication.
- Given a video candidate lacks an approved host, stable original URL, transcript/caption URL, or cleared blocker, when a clinician attempts conversion, then the app blocks media-draft creation and explains the specific missing requirement.
- Given a clinician creates a content draft, when they inspect the resulting record, then it enters the current clinical review lifecycle and retains linked intake provenance.
- Given a clinician rejects a candidate, when they reopen it, then the reason and decision actor are visible but no downstream record was created.

### Slice E — Advanced media formats

Deliver after the core intake workflow proves useful:

- Governed PDF/slide-deck learner media type.
- Asset upload, visual preview, text equivalent, captions/transcript fields where applicable, and learner mobile rendering.
- Optional slide-style conversion workflow with clinician-authored, source-linked narration.

This is deliberately separate because current BabyReady media types support bundled figures and controlled external videos, not arbitrary uploaded learner documents.

## Validation Plan

### Automated tests

- Firestore rule tests for intake/analysis access and immutable analysis behavior.
- Storage rule tests for clinician-only raw artifacts.
- Service unit tests for state transitions and downstream-draft links.
- Worker tests using safe HTML/PDF fixtures, redirect chains, bad MIME types, large files, malformed content, and model-schema failures.
- JSON schema tests ensuring every material AI finding contains evidence or an explicit `unknown`.
- Regression tests confirming no Media Intake action writes learner-visible content directly.

### Manual clinical and usability validation

- Evaluate one guideline URL, one hospital-specific video, one public-health video from an allowed host, one video missing captions/transcript, one patient handout PDF, one slide deck, and one clearly promotional item.
- Confirm that the original material and AI recommendation are clearly distinguishable.
- Confirm that no AI-proposed learner copy is published or attached without clinician action.
- Test the iPad workspace in portrait and landscape. The analysis/original reading pane must be at least as wide as the candidate navigation pane.
- Confirm usable keyboard behavior for clinician notes and decision fields.
- Confirm VoiceOver labels for queue rows, status, flags, source links, and conversion buttons.

## Success Measures

Establish a baseline before setting targets. Track:

- Number of candidates submitted, evaluated, held, rejected, and converted to drafts.
- Median time from candidate submission to clinician decision.
- Percentage of converted drafts that reach publication.
- Percentage of candidates with a reusable placement recommendation.
- Rate of AI findings overridden by clinician review, categorized by authority, currency, placement, accessibility, rights, and clinical fit.
- Number of draft records created without an associated published learner item, to identify bottlenecks in review.
- Clinician-reported usefulness of placement and duplication recommendations.

Do not use an AI “appropriateness score” as a quality metric or as an automatic release threshold.

## Deployment Sequence

1. Create and test intake Firestore/Storage rules in the emulator.
2. Deploy rules and the server-side worker to a non-production environment.
3. Configure server-side secrets and least-privilege service identity.
4. Run fixture evaluations and clinical review of outputs.
5. Enable the clinician queue behind a feature flag.
6. Pilot with a small set of trusted public-health, professional-society, and hospital educational resources.
7. Review output quality, rights flags, and placement accuracy before enabling PDF intake broadly.

## Open Decisions

| Decision | Recommended default | Owner | Blocking |
| --- | --- | --- | --- |
| AI provider and server runtime | Dedicated server-side worker with schema-constrained output and server-held credentials. | Product/engineering | Yes |
| PDF retention duration | Retain source and analysis until decision; retain converted-source provenance, then apply a configured archival policy. | Clinical/product | Yes |
| External-video eligibility | First release evaluates all safe public video URLs but allows learner external-video drafts only for the existing YouTube/Vimeo controlled-host allowlist with an original URL and transcript/captions reference. | Clinical/product | Yes |
| Rights policy | Source-only and clinician-authored summary unless reuse rights are explicit. | Clinical/legal review | Yes |
| Re-analysis | Permit manual re-analysis; always append a new analysis version. | Product | No |
| Learner PDF/slide delivery | Defer to the advanced-media slice. | Product | No |

## Recommended First Build

Start with **Slice A plus URL/video Slice B**. Video intake is a first-release requirement, not a later extension. This provides the highest-value workflow with the fewest rights, rendering, and file-processing complications:

- Submit a public web or video URL.
- Receive clinician-only AI assessment and placement recommendations.
- For an eligible controlled-host video with transcript/captions, create a governed external-video draft; otherwise create a source or learner-content draft.
- Use the existing clinical review and publication workflow.

Add PDF upload only after the secure worker, audit model, and clinician decision flow have been tested with real URL candidates.
