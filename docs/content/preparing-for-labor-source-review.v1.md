# Preparing for Labor source-library review dossier

**Status:** Draft source-review dossier.  
**Reviewed on:** 2026-08-15.  
**Scope:** `preparing-for-labor` / `labor-readiness`.  
**Not a Firestore import or publication instruction:** This document is a manual-entry worksheet for the existing Source Library. It does not create, update, publish, or attach a BabyReady source record.

## Workflow status

- Candidate ACOG and NICHD pages were checked for live availability and learner-education fit.
- The Firebase Admin connector could not list the `sources` collection because of a connector runtime error. On 2026-08-15, an authenticated operator ran the repository-owned read-only fallback and found six existing source records but no match for any Preparing for Labor candidate ID or canonical URL.
- The duplicate-check gate is complete for the six candidates in this dossier. Re-run the read-only check immediately before staging if the source library may have changed.
- Recommended action: use `npm run stage:preparing-for-labor-sources` in dry-run mode, then create the six approved records as **drafts only** with an explicit confirmation and reviewer-selected dates. Publishing is a separate, clinician-governed action.

## Source-record conventions

- **BabyReady review date:** Use the date the source librarian completes the live-page review, not the article's own publication date.
- **Next review date:** Set a future date. The proposed one-year interval below is a planning default, not a substitute for clinical judgment.
- **Publication state:** Keep every new record at `draft` until the librarian confirms the page, title, organization, current clinical suitability, and source-library duplication status.
- **Clinical use:** A published source may support a clinical-content submission, but does not itself approve a claim, safety card, or learner-visible block.

## ACOG and NICHD review outcomes

| Candidate | Live-page review | Source-library decision | Learner-content boundary |
| --- | --- | --- | --- |
| `acog-how-to-tell-when-labor-begins` | **Reviewed 2026-08-15.** The live ACOG FAQ title, canonical URL, May 2020 publication date, and November 2025 page-review date were confirmed. | **Draft-eligible after duplicate check.** Do not publish or attach it to a learner-visible block until source-librarian and clinical-lead confirmation. | Use for preparation and care-team contact planning. Do not copy timing examples, symptom-to-action directions, or hospital-arrival guidance as a universal rule. |
| `nichd-stages-of-labor` | **Reviewed 2026-08-15.** The live NICHD title and canonical URL were confirmed. The page does not state a page-specific publication or review date, and its listed references include older materials. | **Conditionally draft-eligible after duplicate check and clinical-currency confirmation.** Keep unpublished if the clinical lead cannot affirm that it remains suitable for the limited educational use below. | Use only for a concise, high-level explanation that labor has stages. Exclude duration ranges, contraction intervals, cervical measurements, pushing instructions, medication references, and provider-management details. |

These outcomes are an editorial source assessment, not an approval of individual learner-facing claims. Every clinical block still needs its own review, source attachment, next-review date, and publication workflow.

## Candidate records

### Labor education

| Draft source ID | Proposed manual-entry values | Source-review disposition |
| --- | --- | --- |
| `acog-how-to-tell-when-labor-begins` | **Organization:** American College of Obstetricians and Gynecologists<br>**Title:** How to Tell When Labor Begins<br>**URL:** https://www.acog.org/womens-health/faqs/how-to-tell-when-labor-begins<br>**BabyReady last reviewed:** 2026-08-15<br>**Proposed next review:** 2027-08-15 | **Create as draft after duplicate check.** Supports general preparation, possible changes around labor, and care-team contact planning. The page was last reviewed by ACOG in November 2025. Do not transfer any timing example into BabyReady as a universal action rule. |
| `nichd-stages-of-labor` | **Organization:** Eunice Kennedy Shriver National Institute of Child Health and Human Development<br>**Title:** What are the stages of labor?<br>**URL:** https://www.nichd.nih.gov/health/topics/labor-delivery/topicinfo/stages<br>**BabyReady last reviewed:** 2026-08-15<br>**Proposed next review:** 2027-08-15 | **Create as draft after duplicate check.** Supports a high-level explanation of labor stages. The page did not display a current page-specific review date in the source check; verify continued currency before source publication. Do not carry over stage timing, contraction frequency, or provider-directed actions into learner copy. |

### Comfort, support, and shared decision-making

| Draft source ID | Proposed manual-entry values | Source-review disposition |
| --- | --- | --- |
| `acog-pain-relief-labor-delivery` | **Organization:** American College of Obstetricians and Gynecologists<br>**Title:** Medications for Pain Relief During Labor and Delivery<br>**URL:** https://www.acog.org/womens-health/faqs/medications-for-pain-relief-during-labor-and-delivery<br>**BabyReady last reviewed:** 2026-08-15<br>**Proposed next review:** 2027-08-15 | **Create as draft after duplicate check.** Supports a learner's discussion of pain-relief preferences and options. ACOG lists the page as last updated in December 2022 and last reviewed in October 2024. Do not select, compare, dose, or recommend an option for an individual. |
| `acog-limit-intervention-labor-birth` | **Organization:** American College of Obstetricians and Gynecologists<br>**Title:** Approaches to Limit Intervention During Labor and Birth<br>**URL:** https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/approaches-to-limit-intervention-during-labor-and-birth<br>**BabyReady last reviewed:** 2026-08-15<br>**Proposed next review:** 2027-08-15 | **Create as draft after clinical-currency confirmation.** Supports high-level shared-decision and support framing only. It is clinical guidance for a bounded population, so do not bring intervention-specific recommendations, comparative statistics, eligibility language, or outcome claims into this course. |

### Safety and arrival preparation

| Draft source ID | Proposed manual-entry values | Source-review disposition |
| --- | --- | --- |
| `acog-urgent-maternal-warning-signs` | **Organization:** American College of Obstetricians and Gynecologists<br>**Title:** Patient Safety Resources<br>**URL:** https://www.acog.org/giving/programs/quality-and-safety/resources<br>**BabyReady last reviewed:** 2026-08-15<br>**Proposed next review:** 2027-08-15 | **Create as draft after duplicate check.** Candidate support for review of the reusable emergency-card wording. This is a broad maternal-safety resource, not a labor triage protocol. The clinical lead must approve the final card and its use in each lesson; do not reproduce a symptom list or a self-triage algorithm. |
| `acog-car-safety` | **Organization:** American College of Obstetricians and Gynecologists<br>**Title:** Car Safety for Pregnant Women, Babies, and Children<br>**URL:** https://www.acog.org/womens-health/faqs/car-safety-for-pregnant-women-babies-and-children<br>**BabyReady last reviewed:** 2026-08-15<br>**Proposed next review:** 2027-08-15 | **Create as draft after duplicate check.** Supports a general reminder to ask about preparing an appropriate car seat before bringing a baby home. ACOG lists the page as last reviewed in February 2026. Avoid presenting a packing or installation checklist as individualized medical guidance. |

## Attachment map

| Preparing for Labor source slot | Candidate records to evaluate |
| --- | --- |
| `preparing-labor-education-source` | `acog-how-to-tell-when-labor-begins`, `nichd-stages-of-labor` |
| `preparing-labor-contact-plan-source` | `acog-how-to-tell-when-labor-begins`, `acog-urgent-maternal-warning-signs` |
| `preparing-labor-comfort-support-source` | `acog-pain-relief-labor-delivery`, `acog-limit-intervention-labor-birth` |
| `preparing-labor-arrival-preparation-source` | `acog-how-to-tell-when-labor-begins`, `acog-car-safety` |
| `preparing-labor-safety-escalation-source` | `acog-urgent-maternal-warning-signs` |

## Required live workflow before any source publication

1. Rerun `npm run inspect:source-library` immediately before staging if the source library may have changed. Stop and reconcile any matching ID or canonical URL.
2. Reopen the live URL and confirm the title, organization, availability, and suitability on the day of entry.
3. Run `npm run stage:preparing-for-labor-sources` first in dry-run mode. If it reports no conflicts, use its explicit `--write`, confirmation, and review-date arguments to create only draft source records.
4. Obtain source-librarian and clinical-lead confirmation that the source is current and appropriately scoped.
5. Publish only the records that pass that check. Do not use a published record as evidence for a learner-visible clinical block until that block separately completes its own review and publication workflow.

## Blocking issue

On 2026-08-15, the Firebase Admin connector failed on a read-only request to list `sources` with `TypeError: admin.app is not a function`. The production-only fallback `npm run inspect:source-library` completed the candidate duplicate check from an authenticated operator environment. The connector remains unavailable, but it no longer blocks safe draft staging; source publication and content publication remain blocked on their separate clinical-review gates.
