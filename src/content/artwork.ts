import type { ImageSourcePropType } from 'react-native';

/**
 * Commissioned lesson artwork, keyed by "lessonId/slideId".
 *
 * To add a picture: save it as assets/lessons/<lessonId>/<slideId>.png
 * (or .jpg or .webp), then add a line here, for example:
 *   'how-labor-begins/welcome': require('../../assets/lessons/how-labor-begins/welcome.png'),
 * Slides with a picture drawn in code (src/components/LessonVisuals.tsx) show that
 * instead. Slides with neither show an "Artwork to come" box with the brief from
 * the lesson file. docs/media/production-list.csv lists every picture still needed.
 */
const ARTWORK: Record<string, ImageSourcePropType> = {
  // Trial set made with Gemini (Nano Banana) from the briefs; see docs/media/style-guide.md.
  'early-pregnancy-first-steps/welcome': require('../../assets/lessons/early-pregnancy-first-steps/welcome.jpg'),
  'early-pregnancy-first-steps/who-gives-care': require('../../assets/lessons/early-pregnancy-first-steps/who-gives-care.jpg'),
  'third-trimester-body/sleep-bathroom-breathing': require('../../assets/lessons/third-trimester-body/sleep-bathroom-breathing.jpg'),
  'getting-ready-bags-routes-car-seat/your-labor-bag': require('../../assets/lessons/getting-ready-bags-routes-car-seat/your-labor-bag.jpg'),
  'stages-of-labor/early-labor': require('../../assets/lessons/stages-of-labor/early-labor.jpg'),
  // Early Pregnancy Basics, made with scripts/make-artwork.mjs and approved in review.
  'early-pregnancy-first-steps/folic-acid': require('../../assets/lessons/early-pregnancy-first-steps/folic-acid.jpg'),
  'early-pregnancy-first-steps/nausea-basics': require('../../assets/lessons/early-pregnancy-first-steps/nausea-basics.jpg'),
  'early-pregnancy-first-steps/your-next-steps': require('../../assets/lessons/early-pregnancy-first-steps/your-next-steps.jpg'),
  'first-trimester-common-changes/welcome': require('../../assets/lessons/first-trimester-common-changes/welcome.jpg'),
  'first-trimester-common-changes/nausea-support': require('../../assets/lessons/first-trimester-common-changes/nausea-support.jpg'),
  'first-trimester-common-changes/nausea-more-help': require('../../assets/lessons/first-trimester-common-changes/nausea-more-help.jpg'),
  'first-trimester-common-changes/early-bleeding': require('../../assets/lessons/first-trimester-common-changes/early-bleeding.jpg'),
  'first-prenatal-visit/welcome': require('../../assets/lessons/first-prenatal-visit/welcome.jpg'),
  'first-prenatal-visit/first-visit-talk': require('../../assets/lessons/first-prenatal-visit/first-visit-talk.jpg'),
  // Batch 2: Prepare, Ask Questions, and Make a Plan; How This Class Works; third-trimester welcome.
  'first-prenatal-visit/in-person-checks': require('../../assets/lessons/first-prenatal-visit/in-person-checks.jpg'),
  'first-prenatal-visit/what-to-bring': require('../../assets/lessons/first-prenatal-visit/what-to-bring.jpg'),
  'first-prenatal-visit/honest-answers': require('../../assets/lessons/first-prenatal-visit/honest-answers.jpg'),
  'first-prenatal-visit/make-a-plan': require('../../assets/lessons/first-prenatal-visit/make-a-plan.jpg'),
  'welcome-how-this-class-works/welcome': require('../../assets/lessons/welcome-how-this-class-works/welcome.jpg'),
  'welcome-how-this-class-works/learning-tools': require('../../assets/lessons/welcome-how-this-class-works/learning-tools.jpg'),
  'welcome-how-this-class-works/safety-and-care-team': require('../../assets/lessons/welcome-how-this-class-works/safety-and-care-team.jpg'),
  'welcome-how-this-class-works/ask-your-instructor': require('../../assets/lessons/welcome-how-this-class-works/ask-your-instructor.jpg'),
  'welcome-how-this-class-works/why-prepare': require('../../assets/lessons/welcome-how-this-class-works/why-prepare.jpg'),
  'third-trimester-body/welcome': require('../../assets/lessons/third-trimester-body/welcome.jpg'),
  // Batch 3: third trimester, care team and birth setting, building your support team.
  'third-trimester-body/braxton-hicks': require('../../assets/lessons/third-trimester-body/braxton-hicks.jpg'),
  'third-trimester-body/swelling': require('../../assets/lessons/third-trimester-body/swelling.jpg'),
  'third-trimester-body/baby-movements': require('../../assets/lessons/third-trimester-body/baby-movements.jpg'),
  'third-trimester-body/prenatal-visits': require('../../assets/lessons/third-trimester-body/prenatal-visits.jpg'),
  'care-team-and-birth-setting/welcome': require('../../assets/lessons/care-team-and-birth-setting/welcome.jpg'),
  'care-team-and-birth-setting/doctors': require('../../assets/lessons/care-team-and-birth-setting/doctors.jpg'),
  'care-team-and-birth-setting/midwives': require('../../assets/lessons/care-team-and-birth-setting/midwives.jpg'),
  'care-team-and-birth-setting/in-the-room': require('../../assets/lessons/care-team-and-birth-setting/in-the-room.jpg'),
  'building-your-support-team/welcome': require('../../assets/lessons/building-your-support-team/welcome.jpg'),
  'building-your-support-team/choosing-support-people': require('../../assets/lessons/building-your-support-team/choosing-support-people.jpg'),
  // Batch 4: building your support team, birth preferences.
  'building-your-support-team/what-support-people-do': require('../../assets/lessons/building-your-support-team/what-support-people-do.jpg'),
  'building-your-support-team/what-a-doula-does': require('../../assets/lessons/building-your-support-team/what-a-doula-does.jpg'),
  'building-your-support-team/finding-a-doula': require('../../assets/lessons/building-your-support-team/finding-a-doula.jpg'),
  'building-your-support-team/birth-place-policies': require('../../assets/lessons/building-your-support-team/birth-place-policies.jpg'),
  'building-your-support-team/support-after-birth': require('../../assets/lessons/building-your-support-team/support-after-birth.jpg'),
  'birth-preferences/welcome': require('../../assets/lessons/birth-preferences/welcome.jpg'),
  'birth-preferences/what-are-preferences': require('../../assets/lessons/birth-preferences/what-are-preferences.jpg'),
  'birth-preferences/why-preferences': require('../../assets/lessons/birth-preferences/why-preferences.jpg'),
  'birth-preferences/room-and-people': require('../../assets/lessons/birth-preferences/room-and-people.jpg'),
  'birth-preferences/pain-relief-preview': require('../../assets/lessons/birth-preferences/pain-relief-preview.jpg'),
  // Batch 5: birth preferences, getting ready, how labor begins, when to contact your care team.
  'birth-preferences/pushing-and-after-birth': require('../../assets/lessons/birth-preferences/pushing-and-after-birth.jpg'),
  'birth-preferences/when-things-change': require('../../assets/lessons/birth-preferences/when-things-change.jpg'),
  'getting-ready-bags-routes-car-seat/welcome': require('../../assets/lessons/getting-ready-bags-routes-car-seat/welcome.jpg'),
  'getting-ready-bags-routes-car-seat/support-person-bag': require('../../assets/lessons/getting-ready-bags-routes-car-seat/support-person-bag.jpg'),
  'getting-ready-bags-routes-car-seat/baby-going-home': require('../../assets/lessons/getting-ready-bags-routes-car-seat/baby-going-home.jpg'),
  'getting-ready-bags-routes-car-seat/papers-and-questions': require('../../assets/lessons/getting-ready-bags-routes-car-seat/papers-and-questions.jpg'),
  'how-labor-begins/welcome': require('../../assets/lessons/how-labor-begins/welcome.jpg'),
  'how-labor-begins/every-labor-different': require('../../assets/lessons/how-labor-begins/every-labor-different.jpg'),
  'how-labor-begins/what-is-a-contraction': require('../../assets/lessons/how-labor-begins/what-is-a-contraction.jpg'),
  'when-to-contact-your-care-team/welcome': require('../../assets/lessons/when-to-contact-your-care-team/welcome.jpg'),
  // Batch 6: when to contact your care team, stages of labor, early labor at home.
  'when-to-contact-your-care-team/always-ok-to-call': require('../../assets/lessons/when-to-contact-your-care-team/always-ok-to-call.jpg'),
  'when-to-contact-your-care-team/baby-movement': require('../../assets/lessons/when-to-contact-your-care-team/baby-movement.jpg'),
  'when-to-contact-your-care-team/what-to-say': require('../../assets/lessons/when-to-contact-your-care-team/what-to-say.jpg'),
  'stages-of-labor/welcome': require('../../assets/lessons/stages-of-labor/welcome.jpg'),
  'stages-of-labor/active-labor': require('../../assets/lessons/stages-of-labor/active-labor.jpg'),
  'stages-of-labor/transition': require('../../assets/lessons/stages-of-labor/transition.jpg'),
  'stages-of-labor/pushing': require('../../assets/lessons/stages-of-labor/pushing.jpg'),
  'stages-of-labor/placenta': require('../../assets/lessons/stages-of-labor/placenta.jpg'),
  'early-labor-at-home/welcome': require('../../assets/lessons/early-labor-at-home/welcome.jpg'),
  'early-labor-at-home/why-home': require('../../assets/lessons/early-labor-at-home/why-home.jpg'),
  // Batch 7: early labor at home, pushing and birth, the placenta and the first hour.
  'early-labor-at-home/eat-drink': require('../../assets/lessons/early-labor-at-home/eat-drink.jpg'),
  'early-labor-at-home/comfort-tools': require('../../assets/lessons/early-labor-at-home/comfort-tools.jpg'),
  'early-labor-at-home/tracking': require('../../assets/lessons/early-labor-at-home/tracking.jpg'),
  'early-labor-at-home/when-to-leave': require('../../assets/lessons/early-labor-at-home/when-to-leave.jpg'),
  'pushing-and-birth/welcome': require('../../assets/lessons/pushing-and-birth/welcome.jpg'),
  'pushing-and-birth/how-to-push': require('../../assets/lessons/pushing-and-birth/how-to-push.jpg'),
  'pushing-and-birth/positions': require('../../assets/lessons/pushing-and-birth/positions.jpg'),
  'pushing-and-birth/crowning': require('../../assets/lessons/pushing-and-birth/crowning.jpg'),
  'pushing-and-birth/baby-is-born': require('../../assets/lessons/pushing-and-birth/baby-is-born.jpg'),
  'placenta-and-first-hour/welcome': require('../../assets/lessons/placenta-and-first-hour/welcome.jpg'),
};

export function artworkFor(lessonId: string, slideId: string): ImageSourcePropType | null {
  return ARTWORK[`${lessonId}/${slideId}`] ?? null;
}
