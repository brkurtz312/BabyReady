# Preparing for Labor governance register

**Status:** Draft authoring register.  
**Issue:** [#39 — BR-S9-005](https://github.com/brkurtz312/BabyReady/issues/39).  
**Scope:** `preparing-for-labor` / `labor-readiness` / `en-US`.  
**Not a Firestore import or publication instruction:** This register maps the existing draft copy and authoring manifest into the established content-governance workflow. It does not create, submit, approve, publish, or freeze a content block or a source record.

## Governing materials

- Draft block IDs, order, types, and source slots: `docs/content/preparing-for-labor-authoring-manifest.v1.json`
- Exact proposed learner copy: `docs/content/preparing-for-labor-draft-lesson-copy.v1.md`
- Candidate source records and source-review outcomes: `docs/content/preparing-for-labor-source-review.v1.md`

## Current gate status

| Gate | Current status | Required before advancing |
| --- | --- | --- |
| Learner-copy package | Ready for draft entry | Preserve the approved block IDs, types, order, and safety boundaries. |
| Candidate sources | Reviewed; not yet source-library verified | Check for duplicate canonical records and confirm source currency in the authenticated Source Library. |
| Source records | Awaiting operator read | Run `npm run inspect:source-library` from an authenticated BabyReady operator environment to check candidate IDs and canonical URLs without writing Firestore. |
| Draft block entry | Not started | Enter every block through the existing clinician authoring workspace as `draft`. |
| Submission for clinical review | Blocked by source records | Attach published source records to each clinical claim before submission. |
| Approval | Not started | A designated clinical reviewer must record notes and a future next-review date. |
| Publication | Not started | A separate authorized action may publish only approved blocks with valid published sources, reviewer identity, and review dates. |

## Non-negotiable content boundaries

- This is educational preparation, not diagnosis, prediction, triage, treatment, or individualized arrival guidance.
- Do not add contraction counts, timing thresholds, symptom algorithms, or directions to present for care.
- Keep the reusable emergency-card wording in draft until the clinical lead explicitly approves its final text and placement.
- Preserve the Birth Readiness Brief boundary: it is learner-private and is not automatically routed to a care team or clinical record.
- Do not publish a source record merely to unblock authoring. Source publication and block publication are separate review decisions.

## Block register

Enter blocks in display order. `Clinical claim` blocks require at least one published source record before submission, then reviewer notes and a future next-review date before publication. Reflection, citation, and artifact-prompt blocks are still draft-only until their lesson completes release review.

| Lesson | Order | Block ID | Type | Clinical claim | Required source slot | Draft entry | Submit | Review | Publish |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| Understanding Labor | 1 | `understanding-labor-purpose` | `text` | Yes | `preparing-labor-education-source` | Pending | Blocked | Blocked | Blocked |
| Understanding Labor | 2 | `understanding-labor-changes-over-time` | `callout` | Yes | `preparing-labor-education-source` | Pending | Blocked | Blocked | Blocked |
| Understanding Labor | 3 | `understanding-labor-personal-instructions` | `text` | Yes | `preparing-labor-education-source` | Pending | Blocked | Blocked | Blocked |
| Understanding Labor | 4 | `understanding-labor-care-team-question` | `question` | No | — | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| Understanding Labor | 5 | `understanding-labor-sources` | `citation` | No | `preparing-labor-education-source` | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| Understanding Labor | 6 | `understanding-labor-emergency-help` | `emergency_card` | Yes | `preparing-labor-safety-escalation-source` | Pending | Blocked | Blocked | Blocked |
| When to Contact Your Care Team | 1 | `contact-care-team-instructions-vary` | `text` | Yes | `preparing-labor-contact-plan-source` | Pending | Blocked | Blocked | Blocked |
| When to Contact Your Care Team | 2 | `contact-care-team-confirm-plan` | `checklist` | Yes | `preparing-labor-contact-plan-source` | Pending | Blocked | Blocked | Blocked |
| When to Contact Your Care Team | 3 | `contact-care-team-save-details` | `artifact_prompt` | No | — | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| When to Contact Your Care Team | 4 | `contact-care-team-education-boundary` | `callout` | Yes | `preparing-labor-contact-plan-source` | Pending | Blocked | Blocked | Blocked |
| When to Contact Your Care Team | 5 | `contact-care-team-sources` | `citation` | No | `preparing-labor-contact-plan-source` | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| When to Contact Your Care Team | 6 | `contact-care-team-emergency-help` | `emergency_card` | Yes | `preparing-labor-safety-escalation-source` | Pending | Blocked | Blocked | Blocked |
| Comfort and Support | 1 | `comfort-support-preferences-context` | `text` | Yes | `preparing-labor-comfort-support-source` | Pending | Blocked | Blocked | Blocked |
| Comfort and Support | 2 | `comfort-support-categories` | `callout` | Yes | `preparing-labor-comfort-support-source` | Pending | Blocked | Blocked | Blocked |
| Comfort and Support | 3 | `comfort-support-discussion-topics` | `checklist` | Yes | `preparing-labor-comfort-support-source` | Pending | Blocked | Blocked | Blocked |
| Comfort and Support | 4 | `comfort-support-reflection-question` | `question` | No | — | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| Comfort and Support | 5 | `comfort-support-save-preferences` | `artifact_prompt` | No | — | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| Comfort and Support | 6 | `comfort-support-sources` | `citation` | No | `preparing-labor-comfort-support-source` | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| Comfort and Support | 7 | `comfort-support-emergency-help` | `emergency_card` | Yes | `preparing-labor-safety-escalation-source` | Pending | Blocked | Blocked | Blocked |
| Arriving Prepared | 1 | `arriving-prepared-course-summary` | `text` | Yes | `preparing-labor-arrival-preparation-source` | Pending | Blocked | Blocked | Blocked |
| Arriving Prepared | 2 | `arriving-prepared-readiness-topics` | `checklist` | Yes | `preparing-labor-arrival-preparation-source` | Pending | Blocked | Blocked | Blocked |
| Arriving Prepared | 3 | `arriving-prepared-open-brief` | `artifact_prompt` | No | — | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| Arriving Prepared | 4 | `arriving-prepared-brief-privacy` | `callout` | Yes | `preparing-labor-arrival-preparation-source` | Pending | Blocked | Blocked | Blocked |
| Arriving Prepared | 5 | `arriving-prepared-sources` | `citation` | No | `preparing-labor-arrival-preparation-source` | Pending | Hold with lesson | Hold with lesson | Hold with lesson |
| Arriving Prepared | 6 | `arriving-prepared-emergency-help` | `emergency_card` | Yes | `preparing-labor-safety-escalation-source` | Pending | Blocked | Blocked | Blocked |

## Entry and review sequence

1. Resolve the Source Library duplicate check. Merge with an existing canonical source record where one exists; otherwise create only a draft source record.
2. Obtain source-librarian and clinical-lead confirmation for each source record, then publish only sources that are current and appropriately scoped.
3. Create the 25 blocks as drafts in the clinician authoring workspace, using the exact IDs, types, display order, and learner copy in the authoring package.
4. Attach only published canonical source IDs to the clinical-claim blocks listed above. Do not attach the source-slot labels themselves as IDs.
5. Submit clinical claims for review. The workflow must reject a clinical claim that has no published source attachment.
6. Have the designated clinical reviewer verify the scope of each claim, approve or return the block with notes, and set a future next-review date.
7. Verify the emergency-card copy and its source with the clinical lead as its own explicit review decision.
8. Publish only the blocks that are approved and satisfy the existing source, reviewer, and review-date gates. Then perform a learner-role smoke test to ensure only published blocks render.

## Required evidence to attach to the issue before closure

- Screenshot or export showing each source record's canonical ID and `published` state.
- Review disposition and notes for every clinical claim block.
- Future next-review date for every clinical claim block.
- Clinical-lead approval of the final emergency-card language and placement.
- Learner-role verification that all four released lessons render only published blocks and that the Birth Readiness Brief remains private.

## Current blocker

The Firebase Admin connector fails on a read-only `sources` collection request with `TypeError: admin.app is not a function`. The repository now provides `npm run inspect:source-library` as a production-only, read-only fallback for duplicate verification. The issue can proceed through document-level draft preparation, but it must not move to submission, approval, or publication until an authenticated operator completes that source-library check.
