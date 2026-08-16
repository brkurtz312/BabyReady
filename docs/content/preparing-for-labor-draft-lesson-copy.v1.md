# Preparing for Labor draft lesson copy

**Status:** Draft for designated clinical review.
**Scope:** `preparing-for-labor` / `labor-readiness` / `en-US`.
**Not for publication or Firestore import:** This package contains proposed learner copy and candidate sources only. It contains no clinical approval, source-publication, content-publication, reviewer, or next-review-date metadata.

## Required release boundary

Each block must be created through the existing Clinician Content Authoring workspace as a **draft**. A clinical claim cannot be submitted until an authorized source owner has created and published the linked source record. A designated clinical reviewer must then approve the block, document review notes, and set a future next-review date before a separate publication action.

This course teaches preparation and communication. It must not tell a learner whether they are in labor, diagnose a symptom, predict what will happen, give universal timing thresholds, or replace their own care team's instructions. The safety-card copy below is a proposed placeholder that requires explicit clinical-lead approval before use.

## Candidate evidence records

These are proposed source-library records, not currently published BabyReady source IDs. The source librarian must verify the live page, title, currency, licensing, and review dates before creating any source record.

| Candidate ID | Organization | Candidate title | URL | Intended support |
| --- | --- | --- | --- | --- |
| `acog-how-to-tell-when-labor-begins` | American College of Obstetricians and Gynecologists | How to Tell When Labor Begins | [ACOG FAQ004](https://www.acog.org/womens-health/faqs/how-to-tell-when-labor-begins) | Labor education, contact planning, arrival preparation |
| `nichd-stages-of-labor` | Eunice Kennedy Shriver National Institute of Child Health and Human Development | Stages of Labor | [NICHD](https://www.nichd.nih.gov/health/topics/labor-delivery/topicinfo/stages) | Plain-language labor education |
| `acog-pain-relief-labor-delivery` | American College of Obstetricians and Gynecologists | Medications for Pain Relief During Labor and Delivery | [ACOG FAQ086](https://www.acog.org/womens-health/faqs/medications-for-pain-relief-during-labor-and-delivery) | Pain-relief discussion and shared decision-making |
| `acog-limit-intervention-labor-birth` | American College of Obstetricians and Gynecologists | Approaches to Limit Intervention During Labor and Birth | [ACOG Committee Opinion 766](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/approaches-to-limit-intervention-during-labor-and-birth) | Individualized support, mobility, and shared decision-making |
| `acog-urgent-maternal-warning-signs` | American College of Obstetricians and Gynecologists | Urgent Maternal Warning Signs | [ACOG patient-safety resources](https://www.acog.org/giving/programs/quality-and-safety/resources) | Safety-card review |
| `acog-car-safety` | American College of Obstetricians and Gynecologists | Car Safety for Pregnant Women, Babies, and Children | [ACOG FAQ018](https://www.acog.org/womens-health/faqs/car-safety-for-pregnant-women-babies-and-children) | Newborn car-seat preparation |

## Reusable safety card

### Proposed draft copy

> This lesson is for education and preparation. It cannot assess symptoms or replace instructions from your own care team. If you think you have an emergency, are in immediate danger, or have severe symptoms, call 911 or your local emergency number. For other concerns, follow your care team's instructions or contact them directly.

### Review requirements

- Clinical lead must approve the final wording and its placement in every lesson.
- The final block must link to a published safety source record.
- Do not add a symptom list, contraction-counting rule, self-triage calculation, or directive to present for care.

## Understanding Labor

**Lesson ID:** `understanding-labor`
**Learning aim:** Help learners prepare for conversations about labor without asking the course to determine whether labor has begun.
**Candidate sources:** `acog-how-to-tell-when-labor-begins`, `nichd-stages-of-labor`.

| Order | Block ID | Type | Proposed learner copy | Claim/source review note |
| ---: | --- | --- | --- | --- |
| 1 | `understanding-labor-purpose` | `text` | Labor can look and feel different from one person to another, and the same person may have a different experience in a future pregnancy. This lesson can help you prepare questions and a communication plan, but it cannot determine whether labor has begun for you. | Clinical claim. Review against the ACOG and NICHD sources above. |
| 2 | `understanding-labor-changes-over-time` | `callout` | **Notice change, then use your plan.** If you notice changes that concern you, use the instructions your own obstetric practice or birth setting has given you. Individual guidance can differ based on your pregnancy and planned place of birth. | Clinical claim. Do not add a timing/counting rule. |
| 3 | `understanding-labor-personal-instructions` | `text` | Before labor begins, ask your care team what information they want you to have ready if you need to call. Consider writing down the best daytime and after-hours contact numbers and the place they want you to contact first. | Clinical claim. Confirm wording with practice-policy review. |
| 4 | `understanding-labor-care-team-question` | `question` | What changes or questions would you like to discuss with your care team before labor begins? | Reflection only. |
| 5 | `understanding-labor-sources` | `citation` | This lesson will display clinician-reviewed sources when it is published. | Citation shell only; attach final published source records. |
| 6 | `understanding-labor-emergency-help` | `emergency_card` | Use the reusable safety-card copy above after clinical approval. | Clinical claim. Attach the final published safety source. |

## When to Contact Your Care Team

**Lesson ID:** `when-to-contact-your-care-team`
**Learning aim:** Help learners confirm a contact plan before an urgent moment without creating a universal arrival algorithm.
**Candidate sources:** `acog-how-to-tell-when-labor-begins`, `acog-urgent-maternal-warning-signs`.

| Order | Block ID | Type | Proposed learner copy | Claim/source review note |
| ---: | --- | --- | --- | --- |
| 1 | `contact-care-team-instructions-vary` | `text` | Your obstetric practice, birth setting, health history, and pregnancy plan help determine the instructions that are right for you. Confirm your own plan before you need it rather than relying on a general rule from an app or class. | Clinical claim. No universal contact or arrival criteria. |
| 2 | `contact-care-team-confirm-plan` | `checklist` | Confirm the number or portal your practice wants you to use during office hours.<br>Confirm the after-hours, labor-and-delivery, or triage contact process.<br>Confirm the destination or location your team wants you to use if they ask you to come in.<br>Discuss how your support person can help you make a call or arrange transportation. | Clinical claim. The player renders checklist entries as separate lines; author as newline-separated items, not HTML. |
| 3 | `contact-care-team-save-details` | `artifact_prompt` | Keep your contact details and questions where you can find them. You can add questions to your private Birth Readiness Brief in the final lesson. | Reflection only. This prompt does not open the brief in this lesson. |
| 4 | `contact-care-team-education-boundary` | `callout` | **Your plan is personal.** This course cannot decide when you should call or where you should go. Follow the instructions from your own care team when you have a concern. | Clinical claim. |
| 5 | `contact-care-team-sources` | `citation` | This lesson will display clinician-reviewed sources when it is published. | Citation shell only; attach final published source records. |
| 6 | `contact-care-team-emergency-help` | `emergency_card` | Use the reusable safety-card copy above after clinical approval. | Clinical claim. Attach the final published safety source. |

## Comfort and Support

**Lesson ID:** `comfort-and-support`
**Learning aim:** Help learners identify support and comfort discussion topics without promising a particular outcome or recommending a technique for an individual.
**Candidate sources:** `acog-pain-relief-labor-delivery`, `acog-limit-intervention-labor-birth`.

| Order | Block ID | Type | Proposed learner copy | Claim/source review note |
| ---: | --- | --- | --- | --- |
| 1 | `comfort-support-preferences-context` | `text` | Comfort and support preferences are personal. You may want to discuss what helps you feel informed, respected, and supported, while staying open to changes that your care team recommends for your situation. | Clinical claim. Use inclusive language; do not rank birth approaches. |
| 2 | `comfort-support-categories` | `callout` | **Topics to discuss, not a prescription.** You may want to ask about communication preferences, movement or position choices, rest, hydration or food policies, your environment, support people, and available pain-relief options. What is appropriate can vary by setting and clinical circumstances. | Clinical claim. Do not state that any approach prevents pain, cesarean birth, tearing, or intervention. |
| 3 | `comfort-support-discussion-topics` | `checklist` | How I prefer information and consent conversations to happen<br>Who I want with me for support, if available and allowed<br>Comfort items or environmental preferences I may want to ask about<br>Questions about movement, rest, hydration, food, or pain-relief options<br>What my support person can do to help me communicate | Clinical claim. Author as newline-separated items. |
| 4 | `comfort-support-reflection-question` | `question` | What helps you feel supported, informed, and able to participate in decisions? | Reflection only. |
| 5 | `comfort-support-save-preferences` | `artifact_prompt` | You may want to bring these questions or preferences to a future conversation with your care team or support person. | Reflection only. This prompt does not open the brief in this lesson. |
| 6 | `comfort-support-sources` | `citation` | This lesson will display clinician-reviewed sources when it is published. | Citation shell only; attach final published source records. |
| 7 | `comfort-support-emergency-help` | `emergency_card` | Use the reusable safety-card copy above after clinical approval. | Clinical claim. Attach the final published safety source. |

## Arriving Prepared

**Lesson ID:** `arriving-prepared`
**Learning aim:** Help learners organize questions and logistics without creating a packing mandate or implying that notes are sent to a clinician.
**Candidate sources:** `acog-how-to-tell-when-labor-begins`, `acog-car-safety`, `acog-limit-intervention-labor-birth`.

| Order | Block ID | Type | Proposed learner copy | Claim/source review note |
| ---: | --- | --- | --- | --- |
| 1 | `arriving-prepared-course-summary` | `text` | Preparing for labor can include practical logistics as well as questions about communication and support. A written list can help you remember what you want to discuss, but your care team remains the best source for instructions that apply to you. | Clinical claim. |
| 2 | `arriving-prepared-readiness-topics` | `checklist` | Care-team and after-hours contact details<br>Transportation and support-person plan<br>Questions about the admitting location, identification, paperwork, visitor policies, and available services<br>Questions about what to bring or prepare for your birth setting<br>Plan for an appropriate car seat before bringing a baby home | Clinical claim. Author as newline-separated items; do not present as a mandatory packing list. |
| 3 | `arriving-prepared-open-brief` | `artifact_prompt` | Open your private Birth Readiness Brief to save discussion questions and mark the preparation topics you have already considered. This brief is for you; it is not automatically shared with your care team. | Reflection only. This is the existing player-supported brief entry point. |
| 4 | `arriving-prepared-brief-privacy` | `callout` | **Your brief stays private.** BabyReady does not automatically send, route, or place your Birth Readiness Brief into your clinical record. Bring it to a conversation only if you choose to do so. | Clinical/privacy claim. Verify product behavior before approval. |
| 5 | `arriving-prepared-sources` | `citation` | This lesson will display clinician-reviewed sources when it is published. | Citation shell only; attach final published source records. |
| 6 | `arriving-prepared-emergency-help` | `emergency_card` | Use the reusable safety-card copy above after clinical approval. | Clinical claim. Attach the final published safety source. |

## Clinician review worksheet

For each block with `isClinicalClaim: true`, record the following inside the existing review workflow before publication:

- Verified final source record IDs, with organization, title, URL, review date, and future next-review date.
- The exact claims supported by each source.
- Whether a local practice-policy review is needed.
- Whether copy needs a readability, accessibility, translation, or privacy revision.
- Clinical-review notes and an explicit approval decision.

## Manual release checks

1. Run `npm run seed:preparing-for-labor-outline` without `--write` to confirm the controlled outline target and draft state.
2. Create all blocks as drafts through `ClinicianContentAuthoringScreen`; confirm learner accounts cannot see them.
3. Verify that a clinical block without a published source cannot be submitted.
4. Verify that only `arriving-prepared-open-brief` opens the Birth Readiness Brief and that the brief remains private.
5. Obtain clinical-lead approval for the reusable safety card, all clinical claims, source links, and the next-review date for each clinical block before publishing anything.
