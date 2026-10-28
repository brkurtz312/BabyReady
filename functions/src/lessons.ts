import type { Lesson } from '../../src/models/lesson';

import welcomeHowThisClassWorks from '../../content/lessons/start-here/01-welcome-how-this-class-works.json';

import earlyPregnancyFirstSteps from '../../content/lessons/early-pregnancy-basics/01-early-pregnancy-first-steps.json';
import firstTrimesterCommonChanges from '../../content/lessons/early-pregnancy-basics/02-first-trimester-common-changes.json';
import firstPrenatalVisit from '../../content/lessons/early-pregnancy-basics/03-first-prenatal-visit.json';

import babyMonths1To3 from '../../content/lessons/how-your-baby-grows/01-baby-months-1-to-3.json';
import babyMonths4To6 from '../../content/lessons/how-your-baby-grows/02-baby-months-4-to-6.json';
import babyMonths7To9 from '../../content/lessons/how-your-baby-grows/03-baby-months-7-to-9.json';

import thirdTrimesterBody from '../../content/lessons/preparing-for-birth/01-third-trimester-body.json';
import careTeamAndBirthSetting from '../../content/lessons/preparing-for-birth/02-care-team-and-birth-setting.json';
import buildingYourSupportTeam from '../../content/lessons/preparing-for-birth/03-building-your-support-team.json';
import birthPreferences from '../../content/lessons/preparing-for-birth/04-birth-preferences.json';
import gettingReady from '../../content/lessons/preparing-for-birth/05-getting-ready-bags-routes-car-seat.json';

import howLaborBegins from '../../content/lessons/labor-basics/01-how-labor-begins.json';
import whenToContactYourCareTeam from '../../content/lessons/labor-basics/02-when-to-contact-your-care-team.json';
import stagesOfLabor from '../../content/lessons/labor-basics/03-stages-of-labor.json';
import earlyLaborAtHome from '../../content/lessons/labor-basics/04-early-labor-at-home.json';
import pushingAndBirth from '../../content/lessons/labor-basics/05-pushing-and-birth.json';
import placentaAndFirstHour from '../../content/lessons/labor-basics/06-placenta-and-first-hour.json';

import understandingLaborPain from '../../content/lessons/comfort-and-support-skills/01-understanding-labor-pain.json';
import breathingAndRelaxation from '../../content/lessons/comfort-and-support-skills/02-breathing-and-relaxation.json';
import positionsAndMovement from '../../content/lessons/comfort-and-support-skills/03-positions-and-movement.json';
import touchWaterAndComfortTools from '../../content/lessons/comfort-and-support-skills/04-touch-water-and-comfort-tools.json';
import forSupportPeople from '../../content/lessons/comfort-and-support-skills/05-for-support-people.json';

import makingDecisionsWithYourCareTeam from '../../content/lessons/interventions-and-flexible-decisions/01-making-decisions-with-your-care-team.json';
import monitoringYourBabyInLabor from '../../content/lessons/interventions-and-flexible-decisions/02-monitoring-your-baby-in-labor.json';
import medicalPainRelief from '../../content/lessons/interventions-and-flexible-decisions/03-medical-pain-relief.json';
import inductionOfLabor from '../../content/lessons/interventions-and-flexible-decisions/04-induction-of-labor.json';
import assistedVaginalBirth from '../../content/lessons/interventions-and-flexible-decisions/05-assisted-vaginal-birth.json';
import cesareanBirth from '../../content/lessons/interventions-and-flexible-decisions/06-cesarean-birth.json';
import whenPlansChange from '../../content/lessons/interventions-and-flexible-decisions/07-when-plans-change.json';

import yourNewbornsFirstDays from '../../content/lessons/feeding-and-newborn-care/01-your-newborns-first-days.json';
import newbornCareInTheHospital from '../../content/lessons/feeding-and-newborn-care/02-newborn-care-in-the-hospital.json';
import breastfeedingBasics from '../../content/lessons/feeding-and-newborn-care/03-breastfeeding-basics.json';
import formulaAndCombinationFeeding from '../../content/lessons/feeding-and-newborn-care/04-formula-and-combination-feeding.json';
import safeSleep from '../../content/lessons/feeding-and-newborn-care/05-safe-sleep.json';
import carSeatSafety from '../../content/lessons/feeding-and-newborn-care/06-car-seat-safety.json';
import diapersBathsCryingAndSoothing from '../../content/lessons/feeding-and-newborn-care/07-diapers-baths-crying-and-soothing.json';
import infantCprAndChoking from '../../content/lessons/feeding-and-newborn-care/08-infant-cpr-and-choking.json';

import physicalRecoveryAfterBirth from '../../content/lessons/postpartum-recovery/01-physical-recovery-after-birth.json';
import postpartumWarningSigns from '../../content/lessons/postpartum-recovery/02-postpartum-warning-signs.json';
import whenToCallAboutYourBaby from '../../content/lessons/postpartum-recovery/03-when-to-call-about-your-baby.json';
import emotionalHealthAfterBirth from '../../content/lessons/postpartum-recovery/04-emotional-health-after-birth.json';
import restFoodAndHelpAtHome from '../../content/lessons/postpartum-recovery/05-rest-food-and-help-at-home.json';
import yourPostpartumCheckups from '../../content/lessons/postpartum-recovery/06-your-postpartum-checkups.json';

// The server answers only from lesson content shipped with the function, never
// from lesson text sent by the app. Every course's lessons are listed here.
const lessons = [
  welcomeHowThisClassWorks,
  earlyPregnancyFirstSteps,
  firstTrimesterCommonChanges,
  firstPrenatalVisit,
  babyMonths1To3,
  babyMonths4To6,
  babyMonths7To9,
  thirdTrimesterBody,
  careTeamAndBirthSetting,
  buildingYourSupportTeam,
  birthPreferences,
  gettingReady,
  howLaborBegins,
  whenToContactYourCareTeam,
  stagesOfLabor,
  earlyLaborAtHome,
  pushingAndBirth,
  placentaAndFirstHour,
  understandingLaborPain,
  breathingAndRelaxation,
  positionsAndMovement,
  touchWaterAndComfortTools,
  forSupportPeople,
  makingDecisionsWithYourCareTeam,
  monitoringYourBabyInLabor,
  medicalPainRelief,
  inductionOfLabor,
  assistedVaginalBirth,
  cesareanBirth,
  whenPlansChange,
  yourNewbornsFirstDays,
  newbornCareInTheHospital,
  breastfeedingBasics,
  formulaAndCombinationFeeding,
  safeSleep,
  carSeatSafety,
  diapersBathsCryingAndSoothing,
  infantCprAndChoking,
  physicalRecoveryAfterBirth,
  postpartumWarningSigns,
  whenToCallAboutYourBaby,
  emotionalHealthAfterBirth,
  restFoodAndHelpAtHome,
  yourPostpartumCheckups,
] as unknown as Lesson[];

const lessonsById = new Map(lessons.map((l) => [l.lessonId, l]));

export function findLesson(lessonId: string): Lesson | undefined {
  return lessonsById.get(lessonId);
}

/** The lesson as plain text: every slide's heading, on-screen text and narration. */
export function lessonText(lesson: Lesson): string {
  return lesson.slides
    .map((s) => {
      let text = `## ${s.heading}\n${s.onScreen.join('\n')}\n${s.narration}`;
      if (s.type === 'comparison') {
        text += '\n' + s.rows.map((r) => `${s.columns[0]}: ${r[0]} | ${s.columns[1]}: ${r[1]}`).join('\n');
      }
      if (s.type === 'checkin') {
        text += `\nQ: ${s.question.prompt}\nA: ${s.question.options[s.question.correctIndex]}. ${s.question.explanation}`;
      }
      return text;
    })
    .join('\n\n');
}
