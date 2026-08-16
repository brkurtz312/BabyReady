# BabyReady Preparing for Labor: Build-Ready PRD

**Status:** Proposed for the next BabyReady milestone
**Product area:** Learner education, clinical content governance, private learner planning
**Target delivery:** First complete virtual childbirth education vertical slice
**Primary user:** Authenticated pregnant learner
**Clinical owner:** Designated BabyReady clinical reviewer

## Summary

BabyReady will ship **Preparing for Labor**, a clinician-governed, four-lesson course that makes the existing learner plan feel like a cohesive virtual childbirth education experience. The milestone uses the current published-course catalog, content-block reader, clinical review workflow, learner progress records, and approved figures or externally hosted videos.

The course teaches preparation and communication, not individualized medical decision-making. Learners can complete lessons in the player, see progress reflected in their learning plan, and privately maintain a short Birth Readiness Brief. All learner-visible instructional blocks, figures, videos, and clinical claims must pass the existing review and publication pathway before release.

## Problem statement

BabyReady already contains the structural elements of a learning experience: a timeline-oriented learner plan, published course catalog, lesson reader, content-block system, approved-media delivery, and per-lesson progress. Those foundations do not yet constitute a complete, focused childbirth education experience that a learner can begin, finish, and use to prepare for a conversation with their own care team.

Without a complete vertical slice, learners encounter a platform rather than a clear educational path. Clinicians also cannot evaluate whether the current governed-content workflow produces a useful, understandable course experience before more modules are commissioned.

## Goals

- **Deliver a complete first course:** A learner can find, open, read, complete, and revisit four published Preparing for Labor lessons from the learning plan.
- **Make progress meaningful:** Course-player completion updates the existing per-lesson progress record and immediately changes the learner-plan completion state.
- **Support preparation without practicing medicine:** A learner can save a private Birth Readiness Brief containing discussion prompts and logistics preferences, clearly framed for review with their own care team.
- **Validate governed delivery:** Every learner-visible instructional block and attached figure or external video is published only after the existing clinical review requirements are satisfied.
- **Establish a reusable pattern:** The course outline, content-block conventions, asset requirements, readiness-brief model, and tests can be reused for future childbirth and postpartum modules.

## Non-goals

- **Personalized triage or clinical decision support:** The course will not determine whether an individual is in labor, diagnose symptoms, calculate risk, or advise a learner to stay home, present for care, or change treatment.
- **AI-generated medical guidance:** This milestone will not invoke a model, Cloud Run service, Vertex AI endpoint, or the archived Media Intake path.
- **Patient-provider messaging:** The Birth Readiness Brief is private to the learner. It will not be routed to a clinician, copied into a chart, or shared automatically.
- **Native video hosting or streaming:** The milestone can attach approved figures and approved links to external publisher-hosted video. New storage, upload, transcoding, or CDN work is excluded.
- **A full childbirth curriculum:** Delivery, induction, cesarean birth, newborn care, feeding, postpartum recovery, and mental health remain later course modules.
- **Completion certificates, billing changes, and engagement automation:** The first course measures course completion through existing progress records only.

## Product decisions

| Decision | Choice for this milestone | Why |
| --- | --- | --- |
| First course | `preparing-for-labor` | It matches the learner plan's existing preparation phase and lets BabyReady test a practical, non-diagnostic education flow. |
| Course shape | One module with four lessons | It creates a shippable vertical slice while preserving room for future modules within the same course. |
| Lesson completion | Explicit **Mark lesson complete** action inside the course player | Completion becomes a deliberate learner action and updates the existing progress model instead of relying on a checklist state that is currently local to the reader. |
| Personal planning | Private Birth Readiness Brief, saved only under the authenticated learner | Preparation notes are useful to learners but should not silently become clinician-facing health data. |
| Instructional media | Approved figures first; approved external video optional | It uses the present media and review architecture without reopening the archived deployment effort. |
| Publication gate | Existing clinical source, review, approval, and publication controls | The learner catalog must remain restricted to clinically reviewed material. |

## Experience scope

### Course identity

```text
Course ID: preparing-for-labor
Title: Preparing for Labor
Summary: A practical, clinician-reviewed guide to labor readiness, care-team communication,
comfort and support preferences, and arrival preparation.
Locale: en-US
Publication state at launch: published

Module ID: labor-readiness
Module title: Labor readiness
Suggested timing label: Weeks 28–36
```

### Learner journey

1. An authenticated learner opens **Learning Plan**.
2. The learner sees **Preparing for Labor** in the preparation phase and a next incomplete lesson when the course is published.
3. The learner opens a lesson in the existing course player, consumes approved blocks and optional approved media, and can open source links.
4. The learner selects **Mark lesson complete**. BabyReady writes the existing deterministic lesson-progress document.
5. The learner returns to the plan and sees the progress count, next lesson, and completed state update.
6. In the final lesson, the learner can open the Birth Readiness Brief, select preparation items, add discussion questions, and save privately.
7. The learner can return later to update the brief or revisit completed lessons.

### Information architecture

| Surface | Change |
| --- | --- |
| `LearnerLearningPlanScreen` | Display the published course through the current learner outline. No new top-level navigation is required. |
| `LearnerCoursePlayerScreen` | Add explicit lesson-completion state and action. Add an entry point to the Birth Readiness Brief in the final lesson, plus an optional course-level entry point. |
| New `BirthReadinessBriefScreen` | Provide private, editable preparation items and questions. It is learner-only and intentionally separate from clinician review screens. |
| `ClinicianReviewScreen` | No navigation redesign. It continues to approve and publish the content blocks and media attached to the new course. |
| Course data and content subcollections | Add one controlled course outline, four lessons, and the reviewed lesson-block records required for the course. |

## Lesson outlines

The outlines below define learning intent and the allowed instructional structure. They do not supply final medical claims. A clinician author must write the final learner copy and attach appropriate approved sources before it can enter review.

### Understanding Labor

**Lesson ID:** `understanding-labor`
**Estimated time:** 8 minutes
**Learner outcome:** The learner understands that labor experiences vary and can identify preparation topics to discuss with their care team without using the course as a triage tool.

| Ordered block | Required type | Purpose |
| --- | --- | --- |
| 1 | `text` | Introduce the lesson purpose and set the expectation that individual patterns and instructions differ. |
| 2 | `figure` or `callout` | Explain the concept of change over time with a simple, clinically reviewed visual or plain-language card. |
| 3 | `text` | Distinguish education from individualized advice and direct the learner to their own care team's instructions. |
| 4 | `question` | Prompt: “What changes or questions would you like to discuss before labor begins?” |
| 5 | `citation` | Surface the sources supporting any clinical claim in the lesson. |
| 6 | `emergency_card` | Use the approved platform safety language and direct learners with severe symptoms or immediate danger to emergency services. |

**Explicit exclusions:** Contraction timing thresholds, diagnosis, prediction of labor, and individualized instructions.

### When to Contact Your Care Team

**Lesson ID:** `when-to-contact-your-care-team`
**Estimated time:** 8 minutes
**Learner outcome:** The learner prepares contact information and understands the value of confirming their practice's instructions before an urgent moment.

| Ordered block | Required type | Purpose |
| --- | --- | --- |
| 1 | `text` | Explain that the learner's obstetric practice, hospital, and pregnancy context determine the right instructions. |
| 2 | `checklist` | Present a preparation checklist: confirm the labor-and-delivery or triage contact, after-hours process, destination, and support plan. |
| 3 | `artifact_prompt` | Invite the learner to record their own care-team contact details and questions in the Birth Readiness Brief. |
| 4 | `callout` | Reinforce that the course cannot replace individual instructions. |
| 5 | `citation` | Surface source links used for any clinical claims. |
| 6 | `emergency_card` | Provide the standard safety escalation card. |

**Explicit exclusions:** A universal “go to the hospital when” algorithm or any conditional self-triage calculator.

### Comfort and Support

**Lesson ID:** `comfort-and-support`
**Estimated time:** 10 minutes
**Learner outcome:** The learner identifies support preferences and questions they may want to discuss with their care team and support person.

| Ordered block | Required type | Purpose |
| --- | --- | --- |
| 1 | `text` | Frame comfort and support as individual preferences to review in the context of the learner's care plan. |
| 2 | `figure` | Present a clinician-reviewed, accessible visual explaining categories of comfort and support choices. |
| 3 | `checklist` | Let learners explore communication, environment, mobility, hydration, rest, and support-person topics without presenting them as directives. |
| 4 | `question` | Prompt: “What helps you feel supported, informed, and able to participate in decisions?” |
| 5 | `artifact_prompt` | Send the learner to the brief to save questions or preferences for a future conversation. |
| 6 | `citation` | Surface source links used for any clinical claims. |

**Explicit exclusions:** Instructions that conflict with clinician direction, claims of pain control effectiveness, or recommendations tailored to a specific medical condition.

### Arriving Prepared

**Lesson ID:** `arriving-prepared`
**Estimated time:** 8 minutes
**Learner outcome:** The learner leaves with a private, reviewable readiness list for communication, logistics, and questions.

| Ordered block | Required type | Purpose |
| --- | --- | --- |
| 1 | `text` | Summarize the course and reinforce shared decision-making with the care team. |
| 2 | `checklist` | Cover practical readiness topics: contacts, transportation plan, support-person plan, identification or paperwork questions, and questions for the admitting location. |
| 3 | `artifact_prompt` | Open the Birth Readiness Brief for completion or revision. |
| 4 | `callout` | State that the brief is private, educational, and not automatically delivered to a clinical team. |
| 5 | `citation` | Surface source links used for any clinical claims. |
| 6 | `emergency_card` | Provide the standard safety escalation card. |

**Explicit exclusions:** A packing-list mandate, a promise that completing the brief will change clinical care, or any automated sharing of learner notes.

## Personas and user stories

### Learner

- As an authenticated pregnant learner, I want to see a clearly named labor-preparation course in my learning plan so that I can tell what to do next.
- As a learner, I want to complete a lesson inside the reader so that my progress is accurate without returning to a separate screen.
- As a learner, I want to save questions and logistics items privately so that I can use them in a conversation with my care team or support person.
- As a learner with limited time, I want short lessons with visible estimated minutes so that I can complete one topic at a time.
- As a learner who is not signed in, I want an honest explanation of what cannot be saved so that I do not assume my progress or brief is private and persistent.

### Clinical reviewer

- As a clinical reviewer, I want all learner-visible claims, figures, and external videos to remain in the existing review and publication path so that the new course meets BabyReady governance expectations.
- As a clinical reviewer, I want private learner readiness notes to remain inaccessible from the review workspace so that education review does not imply a clinician-patient communication channel.

### Product owner

- As a product owner, I want the first course to exercise course publication, content-block review, media attachment, learner progress, and private planning so that later modules can reuse a proven delivery pattern.

## Functional requirements

### P0: Required for release

| ID | Requirement | Dependencies |
| --- | --- | --- |
| P0-1 | Add a controlled `preparing-for-labor` course record with the one-module, four-lesson learner outline defined in this PRD. It must be discoverable only after `publicationState: "published"`. | Course model validation, authoring or seed path |
| P0-2 | Add approved content blocks for all four lessons. Every clinical claim must meet the existing source and review requirements before publication. | Content governance |
| P0-3 | Add **Mark lesson complete** and **Mark lesson incomplete** actions in `LearnerCoursePlayerScreen`. The action writes through `upsertCourseLessonProgress`. | Auth state, learner progress service |
| P0-4 | Load the learner's existing progress in the player so that completion state is correct when returning to a lesson or opening it from the plan. | Learner progress subscription |
| P0-5 | Add a learner-only Birth Readiness Brief for course-linked preparation items and free-text discussion questions. | New service, Firestore rules, authenticated user |
| P0-6 | Present the standard safety framing in every lesson that includes clinical education: the course does not replace the learner's care team, and severe symptoms or immediate danger require emergency help. | Clinician-approved copy |
| P0-7 | Ensure figures and external videos attached to new blocks are published clinical media and use a valid delivered asset key or URL. | Clinical media library, asset registry |
| P0-8 | Add Firestore emulator coverage for learner progress and Birth Readiness Brief ownership restrictions. | Firebase emulator test suite |
| P0-9 | Validate the course on phone and tablet learner layouts, including loading, empty, unavailable, and error states. | Manual QA checklist |

### P1: Immediate follow-up

| ID | Requirement | Rationale |
| --- | --- | --- |
| P1-1 | Add a course-level “My Birth Readiness Brief” entry point on the learning plan. | Makes the private artifact revisitable without reopening the final lesson. |
| P1-2 | Persist per-item checklist completion within the Birth Readiness Brief instead of keeping lesson checklist controls local to the reader. | Converts reflection into a durable, learner-owned preparation tool. |
| P1-3 | Add an optional printable or shareable learner-controlled export of the brief. | Useful for a personal appointment conversation, but requires careful privacy and formatting review. |
| P1-4 | Add privacy-reviewed, aggregate product events for lesson start, completion, and brief save. | Supports product learning without creating a clinical surveillance feature. |
| P1-5 | Add accessibility transcripts or expanded text alternatives for any published external video. | Strengthens access while preserving the current external-link model. |

### P2: Later

| ID | Requirement | Rationale |
| --- | --- | --- |
| P2-1 | Add optional partner or support-person companion prompts. | Valuable, but not required to prove the learner vertical slice. |
| P2-2 | Add localization and culturally adaptable course variants. | Requires an editorial and clinical localization process beyond the initial course. |
| P2-3 | Add additional preparation modules, including birth preferences, induction, cesarean birth, and immediate postpartum. | These should follow a validated first-course pattern. |

## Acceptance criteria

### Course publication and discovery

- Given the `preparing-for-labor` course is in a non-published state, when a learner opens Learning Plan, then the course and its lessons do not appear in the learner catalog.
- Given the course is published with a valid learner outline, when an authenticated learner opens Learning Plan, then the course appears in the preparation phase with four ordered lessons and their estimated minutes.
- Given a course record is missing a valid module or lesson identifier, when a controlled authoring or seed path attempts to publish it, then the operation fails before the invalid outline is learner-visible.

### Course player and progress

- Given an authenticated learner opens an incomplete lesson, when the lesson content has loaded, then the course player shows **Mark lesson complete**.
- Given an authenticated learner selects **Mark lesson complete**, when the write succeeds, then the player shows the completed state and writes the existing deterministic `CourseProgress` document with `state: "completed"` and a completion timestamp.
- Given a learner completed a lesson previously, when the learner returns to the player or Learning Plan, then the lesson is shown as completed without a duplicate progress document.
- Given an authenticated learner selects **Mark lesson incomplete**, when the write succeeds, then the progress document reflects `state: "not_started"` and the learner-plan count updates.
- Given a learner is unauthenticated or Firebase is unconfigured, when the learner attempts to mark completion, then the UI explains that persistent progress is unavailable and does not imply that a save occurred.
- Given a lesson has no published blocks or attachments, when the learner opens it, then the player shows a recoverable content-unavailable state rather than a blank or crashing screen.

### Birth Readiness Brief

- Given an authenticated learner opens the Birth Readiness Brief, when no record exists, then the learner sees the standard readiness sections with all selections unset and a save action.
- Given a learner selects readiness items or enters discussion questions, when the learner saves, then only that learner can read the saved brief after reopening the screen.
- Given a learner enters more than the allowed question length or count, when the learner attempts to save, then the UI prevents the write and explains the limit.
- Given a different authenticated user attempts to read or write a learner's brief through Firestore, when security rules are evaluated, then access is denied.
- Given a clinical reviewer opens the clinical review workspace, when the reviewer looks for learner records, then Birth Readiness Briefs are not listed, searchable, or otherwise surfaced.
- Given a learner is not authenticated, when the learner opens the brief, then the screen presents an authentication or save-unavailable state and does not persist data locally as if it were saved.

### Clinical governance and safety

- Given a content block has a clinical claim but lacks the required published source or review information, when a reviewer attempts approval or publication, then the existing governance controls prevent publication.
- Given a content block references a figure or external video, when a reviewer attempts approval, then every referenced media item exists and is published before the block can be approved.
- Given a learner opens each released lesson, when the safety card is rendered, then the learner sees the approved education-only and emergency escalation language.
- Given a media asset is not registered for learner delivery, when a learner opens the lesson, then the UI shows the established media fallback instead of a broken image.

## Data model and service changes

### Course outline

Use the existing `CourseRecord`, `LearnerCourseModule`, and `LearnerCourseLesson` types. Add or extend validation in the controlled authoring path so that a new learner outline must contain:

```ts
const preparingForLaborOutline = [
  {
    id: 'labor-readiness',
    order: 1,
    title: 'Labor readiness',
    summary: 'Prepare for conversations, support, and arrival logistics.',
    lessons: [
      {
        id: 'understanding-labor',
        order: 1,
        title: 'Understanding Labor',
        summary: 'Learn what to prepare and what to discuss with your care team.',
        estimatedMinutes: 8,
      },
      {
        id: 'when-to-contact-your-care-team',
        order: 2,
        title: 'When to Contact Your Care Team',
        summary: 'Confirm your own practice and hospital contact plan before you need it.',
        estimatedMinutes: 8,
      },
      {
        id: 'comfort-and-support',
        order: 3,
        title: 'Comfort and Support',
        summary: 'Identify communication and support preferences to discuss with your team.',
        estimatedMinutes: 10,
      },
      {
        id: 'arriving-prepared',
        order: 4,
        title: 'Arriving Prepared',
        summary: 'Bring your questions, contacts, and readiness plan together.',
        estimatedMinutes: 8,
      },
    ],
  },
];
```

**Implementation choice:** Create an idempotent controlled seed script, modeled on the existing learner-outline seeding approach, to create or update this course outline in the intended Firebase project. It must refuse to run against an unapproved project identifier and must not set the course to published until the required lesson content has passed review.

### Lesson content

Continue using the existing lesson content path and `ClinicalContentBlock` model:

```text
courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/{blockId}
```

New content should use only the existing supported types:

```text
text, callout, checklist, question, figure, citation, emergency_card, artifact_prompt
```

Each new block must have a stable ID, title, `displayOrder`, learner-facing body, source IDs as appropriate, media IDs as appropriate, and the existing review and publication metadata. The course player should not need a new block renderer for P0.

### Birth Readiness Brief

Add a minimal learner-owned record. The proposed path is:

```text
users/{userId}/birthReadinessBriefs/preparing-for-labor
```

```ts
type BirthReadinessBrief = {
  id: 'preparing-for-labor';
  courseId: 'preparing-for-labor';
  schemaVersion: 1;
  readinessItems: Record<
    | 'careTeamContactConfirmed'
    | 'afterHoursPlanConfirmed'
    | 'arrivalLocationConfirmed'
    | 'transportationPlanDiscussed'
    | 'supportPersonPlanDiscussed'
    | 'questionsPrepared',
    boolean
  >;
  discussionQuestions: string[];
  createdAt: unknown;
  updatedAt: unknown;
};
```

P0 constraints:

- At most 10 discussion questions.
- Each question is trimmed and limited to 280 characters.
- No clinician-facing fields, provider identifiers, diagnosis fields, risk scores, attachments, sharing flags, or free-form medical history.
- The service accepts the document ID `preparing-for-labor` only for this milestone.
- A new `birthReadinessBriefService.ts` owns subscriptions and save operations. It follows the same Firebase configuration and authenticated-user behavior as `learnerProgressService.ts`.
- Firestore rules permit the authenticated owner to create, read, update, and delete this record only. Rules validate the fixed document ID, permitted keys, booleans, question-array count, and string lengths.

### Player progress integration

Extend `LearnerCoursePlayerScreen` with `userId` and a small progress state adapter:

- Subscribe to the current learner's course progress when `userId` is available.
- Identify the selected lesson with the existing stable course, module, and lesson key.
- Render completed, saving, save-error, and unavailable states.
- Call `upsertCourseLessonProgress` rather than creating a second progress abstraction.
- Do not treat interaction with a local course-reader checklist as lesson completion.

### Firestore rules and tests

Update `firestore.rules` and `tests/firestore.rules.test.mjs` to cover:

- Owner-only Birth Readiness Brief access.
- Rejection of another user's read or write.
- Rejection of an invalid document ID.
- Rejection of unknown fields.
- Rejection of non-boolean readiness items.
- Rejection of excess or over-length questions.
- Continued owner-only behavior for course progress.
- Existing learner access restrictions for drafts, non-published content, and non-published media.

## Engineering work plan

### Foundation and data

1. **Define Birth Readiness Brief model and service**
   - Add the type in `src/models/course.ts` or a focused learner-planning model file.
   - Add `subscribeToBirthReadinessBrief` and `saveBirthReadinessBrief`.
   - Add focused unit coverage for normalization and client-side limits.

2. **Add Firestore ownership and shape validation**
   - Update rules for `users/{userId}/birthReadinessBriefs/{briefId}`.
   - Add emulator tests before wiring the UI.
   - Verify the new rule does not widen any clinician, learner-progress, content, or media access paths.

3. **Create the course outline seed path**
   - Add `scripts/seed-preparing-for-labor-outline.mjs`.
   - Include a dry-run mode and a protected target-project check.
   - Create the course in draft state with the exact outline IDs and estimated minutes.

### Learner experience

4. **Add player-owned lesson completion**
   - Pass the authenticated `userId` from the app route into `LearnerCoursePlayerScreen`.
   - Subscribe to existing progress records.
   - Add accessible complete, incomplete, saving, and error controls.
   - Confirm Learning Plan updates live after completion.

5. **Build Birth Readiness Brief screen**
   - Use a plain, calm form with fixed readiness categories and a constrained question list.
   - Clearly label the brief as private and educational.
   - State that it is not sent automatically to a care team.
   - Add a final-lesson entry point through the existing `artifact_prompt` pattern.

6. **Add a course-level return path**
   - If P1 is pulled forward, add the brief as a visible learner-plan action.
   - Otherwise, support re-entry through the final lesson only for the P0 release.

### Clinical content and release

7. **Author and govern lesson blocks**
   - Create all four lessons with the required block structures.
   - Assign source records for every clinical claim.
   - Submit, approve, and publish each block using the existing clinician workflow.

8. **Create or attach approved learner visuals**
   - Prioritize one accessible, reusable figure for the Comfort and Support lesson.
   - Add any new asset keys to the approved learner-delivery registry and its rules tests before attaching them to a published block.
   - Use external video only if the exact publisher link, source record, transcript availability, clinical review, and learner purpose are all approved.

9. **Quality assurance and release validation**
   - Run `npm run typecheck`.
   - Run `npm run test:emulators`.
   - Verify learner plan and player at phone and iPad sizes.
   - Verify signed-in, signed-out, Firebase-unconfigured, loading, empty, attachment-fallback, progress-save-error, and brief-save-error states.
   - Complete a clinical release checklist before flipping the course publication state to `published`.

## Implementation sequencing

| Sequence | Work | Why it precedes the next step |
| --- | --- | --- |
| 1 | Birth Readiness Brief model, service, rules, and emulator tests | The private record must be correct before a learner can write anything through a new UI. |
| 2 | Course outline seed and draft course record | Gives content authoring stable course, module, and lesson IDs. |
| 3 | Player completion integration | Validates the core existing progress path independent of final clinical copy. |
| 4 | Birth Readiness Brief screen and final-lesson entry point | Connects preparation content to an owned, persistent learner artifact. |
| 5 | Author, review, and publish lesson blocks and media | Content can be safely created against stable IDs and tested in draft before release. |
| 6 | End-to-end QA and controlled publication | The course becomes discoverable only after all learner paths and governance gates pass. |

## Release checklist

### Product and learner experience

- [ ] The course is visible only after publication and appears in the preparation phase.
- [ ] Four lessons appear in the intended order with correct titles and estimated minutes.
- [ ] Each lesson can open from Learning Plan and from the course outline.
- [ ] Marking a lesson complete changes the player, Learning Plan, count, percentage, and next lesson.
- [ ] The Birth Readiness Brief is clearly private, persists for the authenticated learner, and can be revisited.
- [ ] No screen suggests that a clinician receives, reviews, or acts on the learner's brief.

### Clinical governance

- [ ] Every clinical claim has the required published source record.
- [ ] Every instructional block has passed clinical review and is published.
- [ ] Every attached figure or external video is published clinical media.
- [ ] Every lesson includes approved education-only and emergency escalation language where clinically relevant.
- [ ] All new learner-facing content has a designated next review date.

### Engineering and privacy

- [ ] Firestore emulator tests pass, including cross-user denial tests for the brief.
- [ ] Type checking passes.
- [ ] No archived Media Intake route, workflow, script, worker, Cloud Run deployment, or Vertex dependency is invoked.
- [ ] No readiness-brief data is exposed in clinician review, audit exports, course content, logs, or analytics.
- [ ] Phone and iPad layouts have been manually verified with accessibility labels and screen-reader order reviewed.

## Success measures

### Baseline before release

Record the number of published learner lessons, authenticated learners with progress records, completed lesson records, and any available qualitative feedback before publication. These establish the starting point; no target should be treated as meaningful until baseline traffic exists.

### Leading indicators

| Measure | Definition | Initial evaluation |
| --- | --- | --- |
| Course activation | Authenticated learners who open Preparing for Labor divided by authenticated learners who view Learning Plan while the course is available | First 30 days after release |
| Lesson completion | Completed lesson records divided by lesson starts, evaluated per lesson and for all four lessons | First 30 days after release |
| Course completion | Learners with all four lesson records completed divided by learners who started lesson one | First 30 days after release |
| Brief adoption | Learners who save a Birth Readiness Brief divided by learners who complete or open the final lesson | First 30 days after release |
| Release reliability | Course-player, progress-save, and brief-save errors divided by attempted actions | Each release and first 30 days |

### Qualitative signals

- Learner feedback indicates whether the course feels clear, calm, practical, and appropriately bounded.
- Clinical reviewers can complete source, media, and review tasks without bypassing governance controls.
- Support or clinical feedback identifies any copy that could be mistaken for individualized advice.

## Risks and mitigations

| Risk | Status | Mitigation |
| --- | --- | --- |
| Learners may interpret education as personal triage | Owned | Keep lesson scope preparatory, preserve strong safety language, prohibit universal thresholds and diagnostic logic, and require clinical review. |
| Private learner questions may be mistaken for messages to a clinician | Mitigated | Name the feature a private brief, state non-sharing in the UI, avoid clinician-facing fields, and do not surface it in clinical workspaces. |
| New course creation could bypass the intended learner-outline structure | Owned | Use a controlled, idempotent seed path with validation and a protected target-project check. |
| New figures may fail delivery because their asset keys are not allowed | Owned | Add asset registration and rules tests before a media record is published or attached. |
| Scope expands into video hosting, AI, or patient communication | Accepted as out of scope | Enforce the non-goals and keep the milestone tied to existing content and progress foundations. |

## Open decisions

| Decision | Owner | Blocking status | Recommended resolution |
| --- | --- | --- | --- |
| Final approved learner copy and source set for each lesson | Clinical owner | Blocking for publication | Author and review against the lesson structures in this PRD. |
| Whether the Birth Readiness Brief gets a Learning Plan entry point in P0 or P1 | Product owner | Non-blocking for P0 | Keep P0 entry through the final lesson; promote only if usability testing shows poor re-entry. |
| Whether to include one approved external video in the first release | Clinical owner | Non-blocking | Start figure-first; add video only when it meets source, accessibility, and review requirements. |
| Whether the brief supports learner-controlled printing in the immediate follow-up | Product owner and privacy reviewer | Non-blocking | Defer to P1 after privacy and format review. |
| The rollout cohort for the first published course | Product owner and clinical owner | Blocking for production publication | Use a controlled cohort or internal test accounts first if available; otherwise publish only after the full release checklist passes. |

## Definition of done

Preparing for Labor is done when an authenticated learner can discover the clinically published course, complete all four lessons in the reader, observe durable progress in Learning Plan, save and revisit a private Birth Readiness Brief, and encounter only clinically reviewed course blocks and media. The full path passes type checking, Firestore emulator tests, phone and tablet QA, and the clinical release checklist without reactivating the archived Media Intake infrastructure.
