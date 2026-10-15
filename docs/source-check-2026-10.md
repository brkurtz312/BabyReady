# Labor Basics: Source Check (October 2026)

**Date of check:** 14 October 2026
**Scope:** Lessons 01–06 in `content/lessons/labor-basics/`. There are 15 different sources. 13 have no `verifiedOn` date, and 2 already have one (NICHD and ACNM). We checked both groups.
**What was checked:** For each source, we opened the web page, confirmed it loads and is the right page from the right organization, and compared it with every slide that cites it. Each lesson has its own table, so a source used in several lessons is rated separately in each one.

> This is an automated first pass. No lesson files were changed and no `verifiedOn` dates were set.

---

## Summary

**Verdicts (27 source-and-lesson pairs across 6 lessons):**

| Verdict | Count |
|---|---|
| SUPPORTS | 5 |
| PARTLY SUPPORTS | 20 |
| DOES NOT SUPPORT | 0 |
| PAGE UNAVAILABLE | 2 (both are the AAP breastfeeding policy) |

Why so many "partly" ratings:
- **ACOG clinical documents** (CPG No. 8, Committee Opinions 766, 814 and 644, and Practice Bulletin 198) show only a summary (abstract) on acog.org. The full text is on the *Obstetrics & Gynecology* journal site, which blocked our automated reader. PB 198 is also marked "Full Member Benefit". So for these documents we could check only claims that appear in the summary. **A reviewer has to open the full text.**
- **"Call 911"** appears on many safety slides that cite the CDC Hear Her page. That page says "Seek medical care immediately" but does not mention 911.

### Items that most need a human look (safety items first)

1. **Pushing with an epidural (Lesson 5, slide 2).** The narration says the care team "may suggest resting for a while to let your baby move down" before pushing (delayed pushing). Since 2018, ACOG has said it is "reasonable to choose immediate over delayed pushing" for first-time parents with an epidural, and CPG 8 may say the same. Check CPG 8's full text and consider softening or rewording.
2. **Unplanned birth before reaching care (Lesson 5, slide 12).** This is an emergency-instructions slide (call 911, pull over, don't pull the cord). Its only source is the AAP breastfeeding policy, which doesn't cover this topic and could not be opened anyway. It needs a proper source. One partial option from an approved organization is Lamaze, "How to Safely Deliver a Baby When Medical Assistance is Still Minutes Away" (2014). It supports "don't pull the cord" and "skin-to-skin for warmth", but not "call 911" or "pull over".
3. **"Call 911" on the CDC-cited warning-sign slides** (L1 s13, L2 s9 and s8, L3 s12, L4 s11, L6 s11). The CDC page doesn't say "911". The advice is reasonable, but no cited page backs it. Decide whether to keep it as editorial guidance or find a source.
4. **Preterm labor signs (Lesson 1, slide 12).** "Contractions every 10 minutes or more often" and "spotting or bleeding" are **not** on the cited NICHD "start of labor" page, even though that source is already marked verified. Both appear on NICHD's *"What are the symptoms of preterm labor?"* page (https://www.nichd.nih.gov/health/topics/preterm/conditioninfo/symptoms), which says "every 10 minutes or more often". Add it as a source.
5. **"Severe pain that doesn't ease between contractions"** (L3 s12, L4 s11) is cited only to CDC and ACNM, and neither says it. ACOG's "How to Tell When Labor Begins" does: "constant, severe pain with no relief between contractions". Add `acog-labor-begins` to these slides.
6. **Heavy bleeding after birth (Lesson 6, slide 11).** This is well supported by CDC ("soaking through one or more pads in an hour", clots, dizziness or fainting), apart from the 911 point above.
7. **Group B strep (Lesson 2, slide 6).** The cited CDC "About" page does not say when testing happens or that antibiotics in labor protect the baby. CDC's "Screening for Group B Strep Bacteria" page says both (https://www.cdc.gov/group-b-strep/testing/index.html).
8. **Eating and drinking (Lesson 4, slide 4).** The Lamaze source is a 2015 advocacy blog post. It doesn't mention nausea or clear-liquid-only hospital policies. WHO 2018 (already a source in Lesson 6) has a direct recommendation: "oral fluid and food intake during labour is recommended" for low-risk women.
9. **AAP Breastfeeding policy (2022)** is blocked to automated readers (HTTP 403, a bot check). A person must open it. If it can't be checked, WHO 2018 recommendation 48 covers skin-to-skin in the first hour.
10. **ACOG links have moved.** Every ACOG clinical URL now redirects from `/clinical/clinical-guidance/.../articles/...` to `/clinical/guidance/...`. The pages still load, but the stored URLs should be updated.

---

## Lesson 01: How Labor Begins

| Source id | Org | Verdict | Slides checked | Notes / claims needing attention | Suggested replacement |
|---|---|---|---|---|---|
| acog-labor-begins | ACOG | PARTLY SUPPORTS | 3, 4, 6, 7, 8, 9, 10, 11, 14 | Page loads (FAQ004, last reviewed Nov 2025). It supports: every labor differs ("may even be different with each child"), lightening, discharge "clear, pink, or slightly bloody", the belly "becomes hard", Braxton Hicks "can be very painful", the full true-vs-false comparison including "starts in the back", a cervical exam is sometimes the only way to tell, water "trickles or gushes", and asking the team when to call and their after-hours number. **Not on the page:** how to time contractions (slide 8: start-to-start and start-to-end), and "note the time and what the fluid looks like" (slide 10). Note that the page says most births happen "between 38 and 41 weeks", while slide 2 uses NICHD's 37–42. These don't conflict, but they differ. Our automated reader was blocked (HTTP 402), so the page was read by direct download. | Keep. For the timing method, find an ACOG or ACNM page that explains it. ACNM gives the 5-1-1 rule but not the timing method. |
| nichd-start-of-labor *(already verified 2026-10-12)* | NICHD | PARTLY SUPPORTS | 2, 3, 4, 5, 12, 14 | It supports: "between week 37 and week 42", before 37 weeks is preterm, waiting until "at least 39 weeks", labor varies "from pregnancy to pregnancy", lightening "several weeks or only a few hours" before labor, "not all fetuses drop", and bloody show. **Not on the page:** "37–38 weeks = early term" (only a cited article title hints at it), "due date set at 40 weeks", and, on **slide 12**, "every 10 minutes or more often" and "spotting or bleeding". The page lists only "change in vaginal discharge". The page was last reviewed in 2017. | Add NICHD "What are the symptoms of preterm labor?" for slide 12. For "early term", consider an ACOG source. |
| aafp-know-in-labor | AAFP | SUPPORTS | 6, 7, 11 | Page loads (familydoctor.org, AAFP). It supports: Braxton Hicks / false labor, regular contractions that get closer and "steadily increase in strength", pain that moves from the back to the belly, a cervical check may be needed, and asking your doctor when to go in. | — |
| cdc-hear-her-warning-signs | CDC | PARTLY SUPPORTS | 13 | Every symptom listed on slide 13 is on the page: bleeding or fluid leaking, baby's movement "stopping or slowing", a headache that won't go away, vision changes, severe belly pain, trouble breathing, "chest pain or fast-beating heart", fever of 100.4°F, and "extreme swelling of your hands or face". **Not on the page:** "call 911" (the page says "Seek medical care immediately"). | — |

## Lesson 02: When to Contact Your Care Team

| Source id | Org | Verdict | Slides checked | Notes / claims needing attention | Suggested replacement |
|---|---|---|---|---|---|
| acnm-am-i-in-labor *(already verified 2026-10-14)* | ACNM | PARTLY SUPPORTS | 2–8, 10–14 | It supports: the 5-1-1 rule ("5 minutes apart, lasting at least 1 minute for at least 1 hour"), can't walk or talk through contractions, call for any bleeding "even if it is just spotting", heavy bleeding is a warning sign, fluid "usually clear or pink-tinged" or green, a "big rush" or "trickle", you should still feel movement in labor, it's "our job" to take calls, and better to call than "stay up worrying". **Not on the page:** "brown" fluid (slide 6), "babies don't run out of room" (slide 7), the list of what to have ready when you call (slide 10: weeks pregnant, GBS result), the call card (slide 12), and 911 (slide 8). The page looks like it hasn't been updated since about 2021. | For the slide 10 checklist, consider an ACOG or ACNM page. Otherwise mark it as editorial. |
| acog-labor-begins | ACOG | SUPPORTS | 4 | It supports that your team's own instructions come first ("the right time to call"). The 5-1-1 numbers come from ACNM, not ACOG, and the slide cites ACNM too, which is fine. | — |
| cdc-hear-her-warning-signs | CDC | PARTLY SUPPORTS | 7, 8, 9, 14 | It supports the slide 9 list in full, including "thoughts about harming yourself or your baby", and supports slide 7 (baby moving less). **Not on the page:** 911. **Slide 8 nuance:** CDC's wording for pregnancy is bleeding "more than spotting", while the slide says call even for spotting. That stricter advice is backed by ACNM, which is cited too. | — |
| cdc-group-b-strep | CDC | PARTLY SUPPORTS | 6 | It supports GBS being common ("commonly live in" the gut and genital tract) and "get antibiotics during labor, if needed". **Not on the page:** "checked near the end of pregnancy", and that antibiotics protect the baby. | CDC "Screening for Group B Strep Bacteria": https://www.cdc.gov/group-b-strep/testing/index.html ("during the 36th or 37th week"; antibiotics during labor to protect newborns). |

## Lesson 03: The Stages of Labor

| Source id | Org | Verdict | Slides checked | Notes / claims needing attention | Suggested replacement |
|---|---|---|---|---|---|
| acog-cpg8-labor | ACOG | PARTLY SUPPORTS (summary only) | 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 15 | The page loads after a redirect to `/clinical/guidance/clinical-practice-guideline/2024/01/...`. Only the purpose statement is visible on acog.org. The full text is on the journal site and is marked "Free Access", but our automated reader was blocked. Secondary summaries say CPG 8 puts active labor at **6 cm** (slides 4, 6, 15), but a reviewer should confirm this in the full text. The guideline is clinical and **probably won't** mention transition, shaking or nausea, "I can't do this" (slide 7), or effacement terms (slide 3). These may need a patient-education source. | Keep for the 6 cm and stage definitions. For the plain-language stage descriptions, consider adding an ACOG patient FAQ or a WHO 2018 section. |
| nichd-start-of-labor *(already verified 2026-10-12)* | NICHD | SUPPORTS | 4 | It supports contractions becoming "stronger, last longer, and are more frequent", and that labor length varies. "A day or more" isn't stated, but it isn't contradicted either. | — |
| acnm-am-i-in-labor *(already verified 2026-10-14)* | ACNM | PARTLY SUPPORTS | 6, 11, 12 | It supports slide 6 (can't talk during contractions) and slide 12 (heavy bleeding, baby movement). **Not on the page:** the support tips for each stage (slide 11), and "severe pain that doesn't ease between contractions" (slide 12). | For the slide 12 pain item, add `acog-labor-begins`. |
| cdc-hear-her-warning-signs | CDC | PARTLY SUPPORTS | 12 | It supports fever, severe headache and vision changes. **Not on the page:** pain between contractions, and 911. | Add `acog-labor-begins` to slide 12. |

## Lesson 04: Early Labor at Home

| Source id | Org | Verdict | Slides checked | Notes / claims needing attention | Suggested replacement |
|---|---|---|---|---|---|
| acog-co766 | ACOG | PARTLY SUPPORTS (summary only) | 2, 3, 4, 5, 6, 8, 9, 10, 14 | The page loads after a redirect. Committee Opinion 766 was **reaffirmed in 2025** and is endorsed by ACNM. The summary supports a self-care plan for people in latent labor who aren't admitted, that admission "may be necessary" for pain or tiredness, "multiple nonpharmacologic" coping techniques, and continuous support. **Can't confirm from the summary:** slide 2 says "ACOG notes that hospital admission can usually wait" (the summary only implies this), eating and drinking (slide 4), and showers or baths with broken waters (slide 6). The full text is on the journal site. | Keep, and have a reviewer check the full text. |
| acnm-am-i-in-labor *(already verified 2026-10-14)* | ACNM | PARTLY SUPPORTS | 7, 10, 11, 13, 14 | It supports calling when the pattern is reached, water breaking with its color, bleeding, and baby movement. **Not on the page:** "time a few contractions in a row, not every one" (slide 7), travel time and car seat (slide 10; ACOG FAQ004 covers both), and pain between contractions (slide 11). | Add `acog-labor-begins` for slides 10 and 11. |
| lamaze-eating-drinking | Lamaze | PARTLY SUPPORTS | 4 | The page loads. It is a **2015 advocacy blog post** ("Time for ACOG and ASA to Change Their Guidelines!"). It argues against restricting food and drink and says practices follow "guidelines established by the practice setting". **Not on the page:** light snacks specifically in early labor, clear-liquid-only hospital policies, and nausea later in labor. | WHO 2018 Intrapartum Care, recommendation 24: "oral fluid and food intake during labour is recommended" for low-risk women. It is already a source in Lesson 6. |
| cdc-hear-her-warning-signs | CDC | PARTLY SUPPORTS | 11 | It supports fever, headache, vision changes, bleeding and baby movement. **Not on the page:** pain between contractions, and 911. | Add `acog-labor-begins`. |

## Lesson 05: Pushing and Birth

| Source id | Org | Verdict | Slides checked | Notes / claims needing attention | Suggested replacement |
|---|---|---|---|---|---|
| acog-cpg8-labor | ACOG | PARTLY SUPPORTS (summary only) | 2, 3, 4, 6, 14 | Full text could not be read. **Safety and accuracy flag, slide 2:** "rest for a while… before you start pushing" (delayed pushing with an epidural). Since 2018, ACOG has favored *immediate* pushing for first-time parents with an epidural. Confirm what CPG 8 says. Slide 6 (pushing often takes longer with a first baby or an epidural) agrees with secondary summaries but needs checking in the full text. | Keep, but check slide 2 against the full text. |
| acog-co766 | ACOG | PARTLY SUPPORTS (summary only) | 2, 4, 5, 9, 11 | The summary supports "no one position needs to be mandated" (slide 5) and continuous support (slide 11). **Can't confirm from the summary:** "both approaches work" for urge-guided and coached pushing (slide 4). | Keep, and have a reviewer check the full text. |
| acog-pb198 | ACOG | PARTLY SUPPORTS (summary only, members-only) | 7, 8, 14 | The page loads after a redirect. Practice Bulletin 198 was reaffirmed in 2025, and the full text is a **"Full Member Benefit"**. The summary supports "Lacerations are common", that most don't cause lasting problems, and that severe tears are "less frequent". Warm compresses, massage and episiotomy details can't be confirmed without the full text. | The AAFP article below covers the same claims and is free to read. |
| aafp-lacerations | AAFP | SUPPORTS | 7, 8 | The page loads (*American Family Physician*, 2021). It supports lacerations in up to "79% of vaginal deliveries", that most are first or second degree, third-degree tears in about 3% and fourth-degree in under 0.5%, warm compresses and perineal massage reducing sphincter injury, that routine episiotomy "is not recommended", perineal massage in pregnancy "starting at 35 weeks", slowing delivery of the head, and local anesthetic for repair. Minor wording point: it says warm compresses reduce *anal sphincter* injury, and the slide says "more serious tears". These mean roughly the same thing. | — |
| aap-breastfeeding-2022 | AAP | PAGE UNAVAILABLE | 10, 12 | HTTP 403. The publisher blocks automated readers with a bot check. A person needs to open it in a browser. **Even if it opens, it is unlikely to support slide 12** (unplanned birth: call 911, pull over, don't pull the cord) or slide 10 (bluish color, white coating). | Slide 12 needs its own source. A partial option is Lamaze, "How to Safely Deliver a Baby When Medical Assistance is Still Minutes Away" (2014), which supports not pulling the cord and skin-to-skin for warmth. For slide 10's skin-to-skin point, use WHO 2018 recommendation 48. |

## Lesson 06: The Placenta and the First Hour

| Source id | Org | Verdict | Slides checked | Notes / claims needing attention | Suggested replacement |
|---|---|---|---|---|---|
| acog-co814 | ACOG | SUPPORTS | 4, 5, 14 | The page loads after a redirect. Committee Opinion 814 was **reaffirmed in 2026**. The summary supports delayed clamping "for at least 30–60 seconds" in "vigorous term and preterm infants", improved "iron stores in the first several months", larger benefits for preterm babies, and no increased risk of maternal bleeding. Minor points: "some midwives wait even longer" is not on the page, and the page also mentions a "small increase" in jaundice, which the slide doesn't cover. A reviewer can decide whether to mention it. | — |
| who-intrapartum-2018 | WHO | PARTLY SUPPORTS | 2, 3, 6, 7, 9, 11, 14 | The landing page loads, and the full PDF downloads (3 MB). It supports uterotonics "recommended for all births" and oxytocin 10 IU (slide 3), checking uterine tone for all women (slide 3), skin-to-skin "during the first hour after birth to prevent hypothermia and promote breastfeeding" (slide 6), putting the baby to the breast "as soon as possible" (slide 7), and regular checks of bleeding (slide 9). **Not found:** "placenta usually within about half an hour" (slides 2 and 14), skin-to-skin steadying "breathing, heart rate, and blood sugar" (slide 6 mentions only warmth and feeding), and shaking or chills after birth (slide 9). | For the 30-minute placenta timing, look for an ACOG source. |
| aap-breastfeeding-2022 | AAP | PAGE UNAVAILABLE | 6, 7, 8, 10, 14 | HTTP 403 (bot check). A person needs to check it. The policy is widely known to recommend immediate skin-to-skin and feeding in the first hour, but we could not confirm the specific claims: breathing, heart rate and blood sugar (slide 6), and feeding cues such as rooting and licking (slide 7). | WHO 2018 recommendations 48–50 cover skin-to-skin, early breastfeeding, and giving vitamin K "after the first hour" (relevant to slide 8). AAP HealthyChildren "The First Feeding" also loads, but it is dated 2009 and covers less. |
| acog-apgar | ACOG | PARTLY SUPPORTS (summary only) | 8 | The page loads after a redirect. Committee Opinion 644 (with AAP) was reaffirmed in 2025. The summary confirms the Apgar score reports the newborn's status "immediately after birth". **Not in the summary:** the 1- and 5-minute timing, the five things it checks, and that it is "often done on your chest". "Weighing and medications can wait" doesn't come from this document. | WHO 2018 recommendation 50 (vitamin K after the first hour) covers the "can wait" point. |
| acog-pb198 | ACOG | PARTLY SUPPORTS (summary only, members-only) | 9 | Repairing tears with numbing medicine can't be confirmed from the summary. | AAFP "Obstetric Lacerations" supports "Local anesthetic should be used". Consider adding `aafp-lacerations` here. |
| cdc-hear-her-warning-signs | CDC | PARTLY SUPPORTS | 11, 12 | **Strong support** for the heavy-bleeding slide: "soaking through one or more pads in an hour", clots "bigger than an egg", and dizziness or fainting. **Not on the page:** "at home: call 911" and "press your call button". | — |

---

## Pages that blocked our automated reader

- **acog.org** returned "402 Payment Required" to our automated web reader, but loaded normally in a regular download. The pages are fine. This is ACOG's bot protection.
- **The *Obstetrics & Gynecology* journal (journals.lww.com)**, where ACOG's full clinical texts are published, also blocked our reader. That is why the ACOG clinical documents were checked against their summaries only.
- **publications.aap.org (AAP)** returned "403 Forbidden" with a "Just a moment..." bot check.
- **cdc.gov** blocked direct download but loaded through the web reader.

## Closing note

This is an **automated first pass**, meant to point a human reviewer to the right places. It is not a sign-off. Quotes are short excerpts used as pointers. Pages change, automated readers can misread pages, and several documents could only be checked from their summaries. **Before setting any `verifiedOn` date, a reviewer must open each page in a browser, read the relevant section, and confirm each claim on the slides that cite it.** That includes the two sources already marked verified (NICHD and ACNM), which this pass found only partly support some of their slides. No lesson files were changed.
