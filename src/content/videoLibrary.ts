/**
 * Videos from ACOG, CDC, NICHD, AAP and other organizations, copied from the
 * Pregnancy AI Assistant's video vault, and the ones recommended after each lesson.
 *
 * Every link opens outside BabyReady, on YouTube unless `site` names another
 * website. Many are YouTube searches for the named video (kind "search"), so what
 * they show can change; kind "video" links point at one specific video, and kind
 * "page" at an organization's page that has the video or videos on it. The
 * recommendations need clinical review.
 *
 * This file has no imports so plain Node can run it in tests.
 */

export type VideoLinkKind = 'video' | 'search' | 'channel' | 'playlist' | 'page';

export type LibraryVideo = {
  key: string;
  topic: string;
  title: string;
  source: string;
  url: string;
  kind: VideoLinkKind;
  language?: string;
  /** The website the link opens, shown beside the source, when it isn't YouTube. */
  site?: string;
};

export const VIDEO_LIBRARY: LibraryVideo[] = [
  { key: "march-of-dimes-how-your-baby-grows-month-1", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 1", source: "March of Dimes", url: "https://www.youtube.com/watch?v=LNd5-mvhvUs", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-2", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 2", source: "March of Dimes", url: "https://www.youtube.com/watch?v=txYJDGKNauw", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-3", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 3", source: "March of Dimes", url: "https://www.youtube.com/watch?v=3yHptMXSJY0", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-4", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 4", source: "March of Dimes", url: "https://www.youtube.com/watch?v=UOkFP2hb_YU", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-5", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 5", source: "March of Dimes", url: "https://www.youtube.com/watch?v=YCsne3IrhJ8", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-6", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 6", source: "March of Dimes", url: "https://www.youtube.com/watch?v=1s3E0LL8pVo", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-7", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 7", source: "March of Dimes", url: "https://www.youtube.com/watch?v=l9Di7J8bIyc", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-8", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 8", source: "March of Dimes", url: "https://www.youtube.com/watch?v=mHZNDdhDcs8", kind: "video" },
  { key: "march-of-dimes-how-your-baby-grows-month-9", topic: "Fetal Development Month by Month", title: "How Your Baby Grows — Month 9", source: "March of Dimes", url: "https://www.youtube.com/watch?v=ynWnRBUDJeA", kind: "video" },
  { key: "march-of-dimes-como-crece-su-bebe-mes-1-spanish", topic: "Fetal Development Month by Month", title: "Cómo crece su bebé — Mes 1 (Spanish)", source: "March of Dimes", url: "https://www.youtube.com/watch?v=waAD9VomuA8", kind: "video", language: "Spanish" },
  { key: "march-of-dimes-como-crece-su-bebe-mes-2-8-spanish", topic: "Fetal Development Month by Month", title: "Cómo crece su bebé — Mes 2–8 (Spanish)", source: "March of Dimes", url: "https://www.youtube.com/@marchofdimes", kind: "channel", language: "Spanish" },
  { key: "march-of-dimes-ovulation-and-pregnancy", topic: "Preconception & Early Pregnancy", title: "Ovulation and Pregnancy", source: "March of Dimes", url: "https://www.youtube.com/results?search_query=March%20of%20Dimes%20Ovulation%20and%20Pregnancy", kind: "search" },
  { key: "march-of-dimes-la-ovulacion-spanish", topic: "Preconception & Early Pregnancy", title: "La Ovulación (Spanish)", source: "March of Dimes", url: "https://www.youtube.com/results?search_query=March%20of%20Dimes%20La%20Ovulaci%C3%B3n%20embarazo", kind: "search", language: "Spanish" },
  { key: "aap-your-first-trimester", topic: "Preconception & Early Pregnancy", title: "Your First Trimester", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Your%20First%20Trimester%20pregnancy", kind: "search" },
  { key: "nichd-the-road-to-babyville", topic: "Mental Health in Pregnancy", title: "The Road to Babyville", source: "NICHD", url: "https://www.youtube.com/results?search_query=NICHD%20Road%20to%20Babyville%20mental%20health", kind: "search" },
  { key: "acog-acog-explains-infertility-tests-and-treatment", topic: "Preconception & Early Pregnancy", title: "ACOG Explains: Infertility Tests and Treatment", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Explains%20Infertility%20Tests%20Treatment", kind: "search" },
  { key: "cdc-healthy-pregnancy-tips", topic: "Prenatal Care & Healthy Pregnancy", title: "Healthy Pregnancy Tips", source: "CDC", url: "https://www.youtube.com/results?search_query=CDC%20Healthy%20Pregnancy%20Tips", kind: "search" },
  { key: "cdc-folic-acid-and-you-your-healthy-pregnancy", topic: "Prenatal Care & Healthy Pregnancy", title: "Folic Acid and You — Your Healthy Pregnancy", source: "CDC", url: "https://www.youtube.com/results?search_query=CDC%20Folic%20Acid%20Your%20Healthy%20Pregnancy", kind: "search" },
  { key: "march-of-dimes-exercise-during-pregnancy", topic: "Prenatal Care & Healthy Pregnancy", title: "Exercise During Pregnancy", source: "March of Dimes", url: "https://www.youtube.com/results?search_query=March%20of%20Dimes%20Exercise%20During%20Pregnancy", kind: "search" },
  { key: "nichd-term-talk-the-new-definition-of-full-term-pregnancy", topic: "Prenatal Care & Healthy Pregnancy", title: "Term Talk — The New Definition of Full-Term Pregnancy", source: "NICHD", url: "https://www.youtube.com/results?search_query=NICHD%20Term%20Talk%20New%20Definition%20Full-Term%20Pregnancy", kind: "search" },
  { key: "acog-acog-explains-prenatal-genetic-testing", topic: "Prenatal Care & Healthy Pregnancy", title: "ACOG Explains: Prenatal Genetic Testing", source: "ACOG", url: "https://www.youtube.com/watch?v=MhWpmZIsZxw", kind: "video" },
  { key: "acog-acog-explica-pruebas-geneticas-prenatales-spanish", topic: "Prenatal Care & Healthy Pregnancy", title: "ACOG explica: Pruebas genéticas prenatales (Spanish)", source: "ACOG", url: "https://www.youtube.com/watch?v=tLhdxFDqEHI", kind: "video", language: "Spanish" },
  { key: "smfm-anatomy-ultrasound", topic: "Prenatal Care & Healthy Pregnancy", title: "Anatomy Ultrasound", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Anatomy%20Ultrasound%20pregnancy%20patient", kind: "search" },
  { key: "acog-acog-explains-vaccines-during-pregnancy", topic: "Vaccines in Pregnancy", title: "ACOG Explains: Vaccines During Pregnancy", source: "ACOG", url: "https://www.youtube.com/watch?v=JhiC8nJPXiU", kind: "video" },
  { key: "acog-acog-explica-vacunas-durante-el-embarazo-spanish", topic: "Vaccines in Pregnancy", title: "ACOG explica: Vacunas durante el embarazo (Spanish)", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20explica%20Vacunas%20durante%20el%20embarazo", kind: "search", language: "Spanish" },
  { key: "acog-get-your-recommended-vaccines-during-pregnancy", topic: "Vaccines in Pregnancy", title: "Get Your Recommended Vaccines During Pregnancy", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Get%20Your%20Recommended%20Vaccines%20During%20Pregnancy", kind: "search" },
  { key: "acog-recommended-flu-vaccine-during-pregnancy", topic: "Vaccines in Pregnancy", title: "Recommended Flu Vaccine During Pregnancy", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Recommended%20Flu%20Vaccine%20During%20Pregnancy", kind: "search" },
  { key: "acog-recommended-tdap-vaccine-during-pregnancy", topic: "Vaccines in Pregnancy", title: "Recommended Tdap Vaccine During Pregnancy", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Recommended%20Tdap%20Vaccine%20During%20Pregnancy", kind: "search" },
  { key: "acog-recommended-covid-19-vaccine-during-pregnancy", topic: "Vaccines in Pregnancy", title: "Recommended COVID-19 Vaccine During Pregnancy", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Recommended%20COVID-19%20Vaccine%20During%20Pregnancy", kind: "search" },
  { key: "acog-vacuna-covid-19-durante-el-embarazo-spanish", topic: "Vaccines in Pregnancy", title: "Vacuna COVID-19 durante el embarazo (Spanish)", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Vacuna%20COVID-19%20durante%20el%20embarazo", kind: "search", language: "Spanish" },
  { key: "smfm-vaccinations-during-pregnancy", topic: "Vaccines in Pregnancy", title: "Vaccinations During Pregnancy", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Vaccinations%20During%20Pregnancy%20patient", kind: "search" },
  { key: "cdc-vaccinating-pregnant-women-protects-moms-and-babies", topic: "Vaccines in Pregnancy", title: "Vaccinating Pregnant Women Protects Moms and Babies", source: "CDC", url: "https://www.youtube.com/results?search_query=CDC%20Vaccinating%20Pregnant%20Women%20Protects%20Moms%20Babies", kind: "search" },
  { key: "cdc-pregnant-help-protect-your-baby-from-whooping-cough", topic: "Vaccines in Pregnancy", title: "Pregnant? Help Protect Your Baby from Whooping Cough", source: "CDC", url: "https://www.youtube.com/results?search_query=CDC%20Pregnant%20Help%20Protect%20Baby%20Whooping%20Cough", kind: "search" },
  { key: "cdc-flu-vaccine-information-for-pregnant-women-and-children", topic: "Vaccines in Pregnancy", title: "Flu Vaccine Information for Pregnant Women and Children", source: "CDC", url: "https://www.youtube.com/results?search_query=CDC%20Flu%20Vaccine%20Information%20Pregnant%20Women%20Children", kind: "search" },
  { key: "smfm-maternal-rsv-vaccine-what-patients-need-to-know", topic: "Vaccines in Pregnancy", title: "Maternal RSV Vaccine: What Patients Need to Know", source: "SMFM", url: "https://www.youtube.com/watch?v=JDtpNu0-Ruw", kind: "video" },
  { key: "smfm-vacuna-materna-contra-el-rsv-spanish", topic: "Vaccines in Pregnancy", title: "Vacuna materna contra el RSV (Spanish)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Vacuna%20materna%20RSV%20pacientes", kind: "search", language: "Spanish" },
  { key: "smfm-maternal-rsv-vaccine-safety", topic: "Vaccines in Pregnancy", title: "Maternal RSV Vaccine Safety", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Maternal%20RSV%20Vaccine%20Safety", kind: "search" },
  { key: "smfm-rsv-vaccine-safety-spanish", topic: "Vaccines in Pregnancy", title: "RSV Vaccine Safety (Spanish)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Vacuna%20RSV%20seguridad%20Spanish", kind: "search", language: "Spanish" },
  { key: "smfm-maternal-rsv-vaccine-timing", topic: "Vaccines in Pregnancy", title: "Maternal RSV Vaccine Timing", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Maternal%20RSV%20Vaccine%20Timing", kind: "search" },
  { key: "smfm-rsv-vaccine-timing-spanish", topic: "Vaccines in Pregnancy", title: "RSV Vaccine Timing (Spanish)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Vacuna%20RSV%20momento%20Spanish", kind: "search", language: "Spanish" },
  { key: "smfm-maternal-rsv-vaccine-overview", topic: "Vaccines in Pregnancy", title: "Maternal RSV Vaccine (overview)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Maternal%20RSV%20Vaccine%20overview%20patient", kind: "search" },
  { key: "acog-acog-explains-preventing-infections-in-pregnancy", topic: "Infections in Pregnancy", title: "ACOG Explains: Preventing Infections in Pregnancy", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Explains%20Preventing%20Infections%20in%20Pregnancy", kind: "search" },
  { key: "smfm-taking-accurate-blood-pressure-readings-english", topic: "Hypertension & Preeclampsia", title: "Taking Accurate Blood Pressure Readings (English)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Taking%20Accurate%20Blood%20Pressure%20Readings%20pregnancy", kind: "search" },
  { key: "smfm-toma-precisa-de-la-presion-arterial-spanish", topic: "Hypertension & Preeclampsia", title: "Toma precisa de la presión arterial (Spanish)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20Toma%20precisa%20presi%C3%B3n%20arterial%20embarazo", kind: "search", language: "Spanish" },
  { key: "smfm-taking-bp-to-act-quickly-and-advocate-for-you-and-your-baby", topic: "Hypertension & Preeclampsia", title: "Taking BP to Act Quickly & Advocate for You and Your Baby", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20blood%20pressure%20act%20quickly%20advocate%20pregnancy", kind: "search" },
  { key: "smfm-actuar-rapido-y-abogar-por-usted-y-su-bebe-spanish", topic: "Hypertension & Preeclampsia", title: "Actuar rápido y abogar por usted y su bebé (Spanish)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20actuar%20r%C3%A1pido%20abogar%20presi%C3%B3n%20arterial%20embarazo", kind: "search", language: "Spanish" },
  { key: "smfm-high-bp-with-symptoms-and-seeking-help-spanish", topic: "Hypertension & Preeclampsia", title: "High BP with Symptoms & Seeking Help (Spanish)", source: "SMFM", url: "https://www.youtube.com/results?search_query=SMFM%20alta%20presi%C3%B3n%20s%C3%ADntomas%20ayuda%20m%C3%A9dica%20embarazo", kind: "search", language: "Spanish" },
  { key: "march-of-dimes-bleeding-and-spotting-during-pregnancy", topic: "Bleeding, Preterm Labor & Warning Signs", title: "Bleeding and Spotting During Pregnancy", source: "March of Dimes", url: "https://www.youtube.com/results?search_query=March%20of%20Dimes%20Bleeding%20Spotting%20During%20Pregnancy", kind: "search" },
  { key: "march-of-dimes-sangrado-y-manchado-primer-trimestre-spanish", topic: "Bleeding, Preterm Labor & Warning Signs", title: "Sangrado y manchado — primer trimestre (Spanish)", source: "March of Dimes", url: "https://www.youtube.com/results?search_query=March%20of%20Dimes%20Sangrado%20manchado%20primer%20trimestre", kind: "search", language: "Spanish" },
  { key: "march-of-dimes-senales-del-parto-prematuro-spanish", topic: "Bleeding, Preterm Labor & Warning Signs", title: "Señales del Parto Prematuro (Spanish)", source: "March of Dimes", url: "https://www.youtube.com/results?search_query=March%20of%20Dimes%20Se%C3%B1ales%20Parto%20Prematuro", kind: "search", language: "Spanish" },
  { key: "acog-acog-explains-mental-health-and-pregnancy", topic: "Mental Health in Pregnancy", title: "ACOG Explains: Mental Health and Pregnancy", source: "ACOG", url: "https://www.youtube.com/watch?v=0WCwC-3nTdg", kind: "video" },
  { key: "acog-acog-explica-salud-mental-y-embarazo-spanish", topic: "Mental Health in Pregnancy", title: "ACOG explica: Salud mental y embarazo (Spanish)", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20explica%20Salud%20mental%20embarazo", kind: "search", language: "Spanish" },
  { key: "mothertobaby-yeast-infection-treatments-during-pregnancy-ep-44", topic: "Medications & Exposures", title: "Yeast Infection Treatments During Pregnancy (Ep. 44)", source: "MotherToBaby", url: "https://www.youtube.com/watch?v=ZLrYnWXH8zI", kind: "video" },
  { key: "mothertobaby-glp-1-medications-in-pregnancy-and-breastfeeding-ep-84", topic: "Medications & Exposures", title: "GLP-1 Medications in Pregnancy and Breastfeeding (Ep. 84)", source: "MotherToBaby", url: "https://www.youtube.com/watch?v=S48rxTI-T84", kind: "video" },
  { key: "mothertobaby-alcohol-during-breastfeeding", topic: "Medications & Exposures", title: "Alcohol During Breastfeeding", source: "MotherToBaby", url: "https://www.youtube.com/results?search_query=MotherToBaby%20Alcohol%20During%20Breastfeeding", kind: "search" },
  { key: "mothertobaby-lead-and-pregnancy-breastfeeding", topic: "Medications & Exposures", title: "Lead and Pregnancy/Breastfeeding", source: "MotherToBaby", url: "https://www.youtube.com/results?search_query=MotherToBaby%20Lead%20Pregnancy%20Breastfeeding", kind: "search" },
  { key: "mothertobaby-covid-19-in-pregnancy-2023", topic: "Medications & Exposures", title: "COVID-19 in Pregnancy (2023)", source: "MotherToBaby", url: "https://www.youtube.com/results?search_query=MotherToBaby%20COVID-19%20Pregnancy%202023", kind: "search" },
  { key: "mothertobaby-mothertobaby-pregnancy-studies-overview", topic: "Medications & Exposures", title: "MotherToBaby Pregnancy Studies Overview", source: "MotherToBaby", url: "https://www.youtube.com/results?search_query=MotherToBaby%20Pregnancy%20Studies%20overview", kind: "search" },
  { key: "nichd-the-3-stages-of-labor", topic: "Labor & Delivery", title: "The 3 Stages of Labor", source: "NICHD", url: "https://www.youtube.com/results?search_query=NICHD%20The%203%20Stages%20of%20Labor", kind: "search" },
  { key: "nichd-las-3-etapas-del-trabajo-de-parto-spanish", topic: "Labor & Delivery", title: "Las 3 etapas del trabajo de parto (Spanish)", source: "NICHD", url: "https://www.youtube.com/results?search_query=NICHD%20Las%203%20etapas%20del%20trabajo%20de%20parto", kind: "search", language: "Spanish" },
  { key: "acog-acog-explains-inducing-labor", topic: "Labor & Delivery", title: "ACOG Explains: Inducing Labor", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20Explains%20Inducing%20Labor", kind: "search" },
  { key: "acog-acog-explains-postpartum-recovery", topic: "Postpartum Recovery", title: "ACOG Explains: Postpartum Recovery", source: "ACOG", url: "https://www.youtube.com/watch?v=YzRN4ygMQng", kind: "video" },
  { key: "acog-acog-explica-recuperacion-posparto-spanish", topic: "Postpartum Recovery", title: "ACOG explica: Recuperación posparto (Spanish)", source: "ACOG", url: "https://www.youtube.com/results?search_query=ACOG%20explica%20Recuperaci%C3%B3n%20posparto", kind: "search", language: "Spanish" },
  { key: "awhonn-what-are-post-birth-warning-signs-english", topic: "Postpartum Warning Signs", title: "What Are POST-BIRTH Warning Signs (English)", source: "AWHONN", url: "https://www.youtube.com/watch?v=ro55tjjZkyg", kind: "video" },
  { key: "awhonn-post-birth-warning-signs-arabic", topic: "Postpartum Warning Signs", title: "POST-BIRTH Warning Signs — Arabic", source: "AWHONN", url: "https://www.youtube.com/playlist?list=PLRvEM6DQj4YrCbgSZQfjcFF6wCx8g4O4_", kind: "playlist", language: "Arabic" },
  { key: "awhonn-post-birth-warning-signs-french", topic: "Postpartum Warning Signs", title: "POST-BIRTH Warning Signs — French", source: "AWHONN", url: "https://www.youtube.com/watch?v=JXngLGHPJxs", kind: "video", language: "French" },
  { key: "awhonn-post-birth-warning-signs-haitian-creole", topic: "Postpartum Warning Signs", title: "POST-BIRTH Warning Signs — Haitian Creole", source: "AWHONN", url: "https://www.youtube.com/results?search_query=AWHONN%20POST-BIRTH%20Warning%20Signs%20Haitian%20Creole", kind: "search", language: "Haitian Creole" },
  { key: "awhonn-sarah-s-story-post-birth-warning-signs", topic: "Postpartum Warning Signs", title: "Sarah's Story — POST-BIRTH Warning Signs", source: "AWHONN", url: "https://www.youtube.com/watch?v=SQW41jhNY1w", kind: "video" },
  { key: "awhonn-awhonn-postpartum-hemorrhage-project", topic: "Postpartum Warning Signs", title: "AWHONN Postpartum Hemorrhage Project", source: "AWHONN", url: "https://www.youtube.com/watch?v=jjy2Uevf7MM", kind: "video" },
  { key: "awhonn-quantification-of-blood-loss", topic: "Postpartum Warning Signs", title: "Quantification of Blood Loss", source: "AWHONN", url: "https://www.youtube.com/watch?v=F_ac-aCbEn0", kind: "video" },
  { key: "cdc-cdc-hear-her-dr-wanda-barfield-psa", topic: "Postpartum Warning Signs", title: "CDC Hear Her: Dr. Wanda Barfield PSA", source: "CDC", url: "https://www.youtube.com/watch?v=JeHyF4Xt6Ok", kind: "video" },
  { key: "cdc-hear-sanari-s-story", topic: "Postpartum Warning Signs", title: "Hear Sanari's Story", source: "CDC", url: "https://www.youtube.com/results?search_query=CDC%20Hear%20Her%20Sanari%20Story%20maternal%20warning%20signs", kind: "search" },
  { key: "cdc-hear-allyson-felix-s-story", topic: "Postpartum Warning Signs", title: "Hear Allyson Felix's Story", source: "CDC", url: "https://www.youtube.com/watch?v=zG_W5Q9NbCE", kind: "video" },
  { key: "aap-your-newborn", topic: "Newborn Care", title: "Your Newborn", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Your%20Newborn%20pediatrics", kind: "search" },
  { key: "aap-preparing-my-home-for-my-new-baby", topic: "Newborn Care", title: "Preparing My Home For My New Baby", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Preparing%20My%20Home%20For%20My%20New%20Baby", kind: "search" },
  { key: "aap-preparing-for-baby-and-choosing-safe-sleep-products", topic: "Newborn Care", title: "Preparing for Baby and Choosing Safe Sleep Products", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Preparing%20for%20Baby%20Choosing%20Safe%20Sleep%20Products", kind: "search" },
  { key: "aap-5-baby-massage-strokes-to-soothe-colic", topic: "Newborn Care", title: "5 Baby Massage Strokes to Soothe Colic", source: "AAP", url: "https://www.youtube.com/watch?v=zSTZ_2ECpSE", kind: "video" },
  { key: "aap-what-if-it-s-not-love-at-first-sight-with-your-baby", topic: "Newborn Bonding & Postpartum Adjustment", title: "What if It's Not Love at First Sight With Your Baby?", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20What%20if%20Its%20Not%20Love%20at%20First%20Sight%20Baby", kind: "search" },
  { key: "aap-the-first-year-is-hard-surviving-baby-s-early-months", topic: "Newborn Bonding & Postpartum Adjustment", title: "The First Year Is Hard — Surviving Baby's Early Months", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20The%20First%20Year%20Is%20Hard%20Surviving%20Baby%20Early%20Months", kind: "search" },
  { key: "aap-baby-bonding-basics-building-trust-love-and-connection", topic: "Newborn Bonding & Postpartum Adjustment", title: "Baby Bonding Basics — Building Trust, Love & Connection", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Baby%20Bonding%20Basics%20Building%20Trust%20Love%20Connection", kind: "search" },
  { key: "aap-how-babies-learn-to-communicate", topic: "Newborn Bonding & Postpartum Adjustment", title: "How Babies Learn to Communicate", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20How%20Babies%20Learn%20to%20Communicate", kind: "search" },
  { key: "aap-how-to-give-my-baby-the-best-start-in-life", topic: "Breastfeeding & Infant Feeding", title: "How to Give My Baby the Best Start in Life", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20How%20to%20Give%20My%20Baby%20the%20Best%20Start%20in%20Life", kind: "search" },
  { key: "aap-how-should-i-feed-my-baby", topic: "Breastfeeding & Infant Feeding", title: "How Should I Feed My Baby?", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20How%20Should%20I%20Feed%20My%20Baby", kind: "search" },
  { key: "aap-responsive-feeding", topic: "Breastfeeding & Infant Feeding", title: "Responsive Feeding", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Responsive%20Feeding", kind: "search" },
  { key: "aap-feeding-baby-the-best-way-responsive-feeding-tips", topic: "Breastfeeding & Infant Feeding", title: "Feeding Baby the Best Way — Responsive Feeding Tips", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Feeding%20Baby%20Best%20Way%20Responsive%20Feeding%20Tips", kind: "search" },
  { key: "aap-breastfeeding-going-back-to-work", topic: "Breastfeeding & Infant Feeding", title: "Breastfeeding + Going Back to Work", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Breastfeeding%20Going%20Back%20to%20Work", kind: "search" },
  { key: "aap-should-you-stash-breast-milk", topic: "Breastfeeding & Infant Feeding", title: "Should You Stash Breast Milk?", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Should%20You%20Stash%20Breast%20Milk", kind: "search" },
  { key: "aap-breastfeeding-problems-tongue-tie-might-not-be-the-reason", topic: "Breastfeeding & Infant Feeding", title: "Breastfeeding Problems? Tongue Tie Might Not Be the Reason", source: "AAP", url: "https://www.youtube.com/watch?v=sYn4ItEWucQ", kind: "video" },
  { key: "aap-is-tongue-tie-surgery-right-for-your-baby", topic: "Breastfeeding & Infant Feeding", title: "Is Tongue-Tie Surgery Right for Your Baby?", source: "AAP", url: "https://www.youtube.com/watch?v=dHwsOMmXjGQ", kind: "video" },
  { key: "aap-tongue-tie-release-making-an-informed-decision", topic: "Breastfeeding & Infant Feeding", title: "Tongue Tie Release — Making an Informed Decision", source: "AAP", url: "https://www.youtube.com/watch?v=uAXGb3Z6Ofo", kind: "video" },
  { key: "nichd-safe-sleep-for-your-baby-full-length", topic: "Safe Sleep / SIDS Prevention", title: "Safe Sleep for Your Baby (full length)", source: "NICHD", url: "https://www.youtube.com/watch?v=29sLucYtvpA", kind: "video" },
  { key: "nichd-safe-sleep-for-your-baby-60-seconds", topic: "Safe Sleep / SIDS Prevention", title: "Safe Sleep for Your Baby — 60 seconds", source: "NICHD", url: "https://www.youtube.com/watch?v=Rs9Jw3uIoaU", kind: "video" },
  { key: "nichd-sueno-seguro-para-su-bebe-spanish", topic: "Safe Sleep / SIDS Prevention", title: "Sueño seguro para su bebé (Spanish)", source: "NICHD", url: "https://www.youtube.com/watch?v=RCbgFgUW0QU", kind: "video", language: "Spanish" },
  { key: "nichd-breastfeed-your-baby-to-reduce-risk-of-sids", topic: "Safe Sleep / SIDS Prevention", title: "Breastfeed Your Baby to Reduce Risk of SIDS", source: "NICHD", url: "https://www.youtube.com/watch?v=k17j9aJs90w", kind: "video" },
  { key: "nichd-safe-sleep-for-grandparents-and-caregivers", topic: "Safe Sleep / SIDS Prevention", title: "Safe Sleep for Grandparents & Caregivers", source: "NICHD", url: "https://www.youtube.com/watch?v=7cXwlpSJL08", kind: "video" },
  { key: "nichd-sueno-seguro-para-los-abuelos-spanish", topic: "Safe Sleep / SIDS Prevention", title: "Sueño seguro para los abuelos (Spanish)", source: "NICHD", url: "https://www.youtube.com/results?search_query=NICHD%20Sue%C3%B1o%20seguro%20abuelos%20beb%C3%A9", kind: "search", language: "Spanish" },
  { key: "nichd-safely-keeping-baby-warm", topic: "Safe Sleep / SIDS Prevention", title: "Safely Keeping Baby Warm", source: "NICHD", url: "https://www.youtube.com/results?search_query=NICHD%20Safely%20Keeping%20Baby%20Warm%20safe%20sleep", kind: "search" },
  { key: "aap-5-safe-sleep-essentials-for-your-baby", topic: "Safe Sleep / SIDS Prevention", title: "5 Safe Sleep Essentials for Your Baby", source: "AAP", url: "https://www.youtube.com/watch?v=NXmjGbBLP60", kind: "video" },
  { key: "aap-safe-sleep-for-babies", topic: "Safe Sleep / SIDS Prevention", title: "Safe Sleep for Babies", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Safe%20Sleep%20for%20Babies%20SIDS%20prevention", kind: "search" },
  { key: "aap-help-your-baby-sleep-safely-so-you-can-sleep-soundly", topic: "Safe Sleep / SIDS Prevention", title: "Help Your Baby Sleep Safely so You Can Sleep Soundly", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Help%20Your%20Baby%20Sleep%20Safely%20Sleep%20Soundly", kind: "search" },
  { key: "aap-maintaining-safe-sleep-when-baby-is-congested", topic: "Safe Sleep / SIDS Prevention", title: "Maintaining Safe Sleep When Baby is Congested", source: "AAP", url: "https://www.youtube.com/watch?v=44PYQ6iFoGg", kind: "video" },
  { key: "aap-nursing-pillows-why-they-re-unsafe-for-sleeping-babies", topic: "Safe Sleep / SIDS Prevention", title: "Nursing Pillows — Why They're Unsafe for Sleeping Babies", source: "AAP", url: "https://www.youtube.com/watch?v=V17Vm1YRrbw", kind: "video" },
  { key: "aap-talking-with-families-about-bed-sharing", topic: "Safe Sleep / SIDS Prevention", title: "Talking With Families About Bed Sharing", source: "AAP", url: "https://www.youtube.com/results?search_query=AAP%20Talking%20With%20Families%20About%20Bed%20Sharing", kind: "search" },
  { key: "dona-the-essential-ingredient-doula", topic: "Labor Support, Comfort & Pain Relief", title: "The Essential Ingredient: Doula", source: "Documentary shared by DONA International", url: "https://www.youtube.com/results?search_query=The%20Essential%20Ingredient%20Doula%20documentary", kind: "search" },
  { key: "eastern-health-comfort-techniques", topic: "Labor Support, Comfort & Pain Relief", title: "Comfort Techniques for Labour", source: "Eastern Health", url: "https://hi.easternhealth.ca/healthy-living/pregnancy-birth-and-early-parenting/labour-and-birth/comfort-techniques/", kind: "page", site: "easternhealth.ca" },
  { key: "altru-the-epidural-block", topic: "Labor Support, Comfort & Pain Relief", title: "The Epidural Block", source: "Altru Health System", url: "https://www.altru.org/health-library/videos/video-the-epidural-block", kind: "video", site: "altru.org" },
  { key: "nhtsa-install-rear-facing-car-seats", topic: "Car Seats & Infant CPR", title: "How to Install Rear-Facing Car Seats", source: "NHTSA", url: "https://www.nhtsa.gov/car-seats-and-booster-seats/how-install-rear-facing-car-seats", kind: "page", site: "nhtsa.gov" },
  { key: "kidshealth-using-car-seats-safely", topic: "Car Seats & Infant CPR", title: "Using Car Seats Safely", source: "Nemours KidsHealth", url: "https://kidshealth.org/CookChildrens/en/parents/carseat-video.html", kind: "video", site: "kidshealth.org" },
  { key: "nicklaus-how-to-provide-infant-cpr", topic: "Car Seats & Infant CPR", title: "How to Provide Infant CPR", source: "Nicklaus Children's Hospital", url: "https://nicklauschildrens.org/news-events/video-center/how-to-provide-infant-cpr", kind: "video", site: "nicklauschildrens.org" },
];

/** Up to three videos to suggest when a learner finishes each lesson, by lesson ID. */
export const RECOMMENDED_VIDEOS: Record<string, string[]> = {
  "early-pregnancy-first-steps": ["cdc-folic-acid-and-you-your-healthy-pregnancy", "cdc-healthy-pregnancy-tips", "aap-your-first-trimester", "march-of-dimes-how-your-baby-grows-month-1"],
  "baby-months-1-to-3": ["march-of-dimes-how-your-baby-grows-month-1", "march-of-dimes-how-your-baby-grows-month-2", "march-of-dimes-how-your-baby-grows-month-3"],
  "baby-months-4-to-6": ["march-of-dimes-how-your-baby-grows-month-4", "march-of-dimes-how-your-baby-grows-month-5", "march-of-dimes-how-your-baby-grows-month-6"],
  "baby-months-7-to-9": ["march-of-dimes-how-your-baby-grows-month-7", "march-of-dimes-how-your-baby-grows-month-8", "march-of-dimes-how-your-baby-grows-month-9"],
  "eating-well-during-pregnancy": ["cdc-healthy-pregnancy-tips"],
  "first-trimester-common-changes": ["march-of-dimes-bleeding-and-spotting-during-pregnancy", "acog-acog-explains-preventing-infections-in-pregnancy", "march-of-dimes-how-your-baby-grows-month-2"],
  "first-prenatal-visit": ["acog-acog-explains-prenatal-genetic-testing", "acog-acog-explains-vaccines-during-pregnancy", "smfm-maternal-rsv-vaccine-what-patients-need-to-know", "march-of-dimes-how-your-baby-grows-month-3", "smfm-anatomy-ultrasound", "acog-get-your-recommended-vaccines-during-pregnancy", "acog-recommended-flu-vaccine-during-pregnancy", "acog-recommended-covid-19-vaccine-during-pregnancy", "smfm-vaccinations-during-pregnancy", "cdc-vaccinating-pregnant-women-protects-moms-and-babies", "cdc-flu-vaccine-information-for-pregnant-women-and-children"],
  "third-trimester-body": ["nichd-term-talk-the-new-definition-of-full-term-pregnancy", "march-of-dimes-exercise-during-pregnancy", "march-of-dimes-how-your-baby-grows-month-7", "march-of-dimes-how-your-baby-grows-month-8", "march-of-dimes-how-your-baby-grows-month-9", "acog-recommended-tdap-vaccine-during-pregnancy", "cdc-pregnant-help-protect-your-baby-from-whooping-cough", "smfm-maternal-rsv-vaccine-safety", "smfm-maternal-rsv-vaccine-timing", "smfm-maternal-rsv-vaccine-overview"],
  "birth-preferences": ["nichd-the-3-stages-of-labor"],
  "getting-ready-bags-routes-car-seat": ["aap-preparing-my-home-for-my-new-baby", "aap-preparing-for-baby-and-choosing-safe-sleep-products", "nichd-safe-sleep-for-your-baby-60-seconds"],
  "how-labor-begins": ["nichd-the-3-stages-of-labor", "nichd-term-talk-the-new-definition-of-full-term-pregnancy"],
  "when-to-contact-your-care-team": ["smfm-taking-bp-to-act-quickly-and-advocate-for-you-and-your-baby"],
  "stages-of-labor": ["nichd-the-3-stages-of-labor"],
  "early-labor-at-home": ["nichd-the-3-stages-of-labor"],
  "placenta-and-first-hour": ["aap-how-to-give-my-baby-the-best-start-in-life"],
  "induction-of-labor": ["acog-acog-explains-inducing-labor"],
  "your-newborns-first-days": ["aap-your-newborn", "aap-baby-bonding-basics-building-trust-love-and-connection", "aap-how-babies-learn-to-communicate"],
  "newborn-care-in-the-hospital": ["aap-your-newborn"],
  "breastfeeding-basics": ["aap-how-should-i-feed-my-baby", "aap-responsive-feeding", "mothertobaby-alcohol-during-breastfeeding", "nichd-breastfeed-your-baby-to-reduce-risk-of-sids", "aap-is-tongue-tie-surgery-right-for-your-baby", "aap-tongue-tie-release-making-an-informed-decision"],
  "formula-and-combination-feeding": ["aap-how-should-i-feed-my-baby", "aap-feeding-baby-the-best-way-responsive-feeding-tips", "aap-breastfeeding-going-back-to-work", "aap-should-you-stash-breast-milk"],
  "safe-sleep": ["nichd-safe-sleep-for-your-baby-full-length", "aap-5-safe-sleep-essentials-for-your-baby", "aap-nursing-pillows-why-they-re-unsafe-for-sleeping-babies", "nichd-safely-keeping-baby-warm", "aap-safe-sleep-for-babies"],
  "diapers-baths-crying-and-soothing": ["aap-5-baby-massage-strokes-to-soothe-colic"],
  "physical-recovery-after-birth": ["acog-acog-explains-postpartum-recovery"],
  "postpartum-warning-signs": ["awhonn-what-are-post-birth-warning-signs-english", "cdc-cdc-hear-her-dr-wanda-barfield-psa", "cdc-hear-allyson-felix-s-story", "smfm-taking-accurate-blood-pressure-readings-english", "awhonn-sarah-s-story-post-birth-warning-signs", "cdc-hear-sanari-s-story"],
  "emotional-health-after-birth": ["acog-acog-explains-mental-health-and-pregnancy", "nichd-the-road-to-babyville", "aap-what-if-it-s-not-love-at-first-sight-with-your-baby", "aap-the-first-year-is-hard-surviving-baby-s-early-months"],
  "rest-food-and-help-at-home": ["nichd-safe-sleep-for-grandparents-and-caregivers", "aap-help-your-baby-sleep-safely-so-you-can-sleep-soundly"],
  "your-postpartum-checkups": ["acog-acog-explains-postpartum-recovery"],
  "when-to-call-about-your-baby": ["aap-maintaining-safe-sleep-when-baby-is-congested"],
  "building-your-support-team": ["dona-the-essential-ingredient-doula"],
  "breathing-and-relaxation": ["eastern-health-comfort-techniques"],
  "positions-and-movement": ["eastern-health-comfort-techniques"],
  "touch-water-and-comfort-tools": ["eastern-health-comfort-techniques"],
  "medical-pain-relief": ["altru-the-epidural-block"],
  "car-seat-safety": ["nhtsa-install-rear-facing-car-seats", "kidshealth-using-car-seats-safely"],
  "infant-cpr-and-choking": ["nicklaus-how-to-provide-infant-cpr"],
};

/** Where a video link opens, as shown under its title: a site, "YouTube" or "YouTube search". */
export function videoLinkWhere(video: LibraryVideo): string {
  if (video.site) return video.site;
  return video.kind === 'search' ? 'YouTube search' : 'YouTube';
}

/** The screen-reader hint for a video link. */
export function videoLinkHint(video: LibraryVideo): string {
  if (video.site) return video.kind === 'page' ? `Opens a page with videos on ${video.site}.` : `Opens the video on ${video.site}.`;
  return video.kind === 'search' ? 'Opens a YouTube search for this video.' : 'Opens the video on YouTube.';
}

const byKey = new Map(VIDEO_LIBRARY.map((v) => [v.key, v]));

export function recommendedVideosFor(lessonId: string): LibraryVideo[] {
  return (RECOMMENDED_VIDEOS[lessonId] ?? []).map((key) => byKey.get(key)).filter((v): v is LibraryVideo => Boolean(v));
}
