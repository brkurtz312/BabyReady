import type { Lesson } from '../models/lesson';
import { checkCourse } from '../lib/lessonRules';

import welcomeHowThisClassWorks from '../../content/lessons/preparing-for-birth/01-welcome-how-this-class-works.json';
import thirdTrimesterBody from '../../content/lessons/preparing-for-birth/02-third-trimester-body.json';
import careTeamAndBirthSetting from '../../content/lessons/preparing-for-birth/03-care-team-and-birth-setting.json';
import buildingYourSupportTeam from '../../content/lessons/preparing-for-birth/04-building-your-support-team.json';
import birthPreferences from '../../content/lessons/preparing-for-birth/05-birth-preferences.json';
import gettingReady from '../../content/lessons/preparing-for-birth/06-getting-ready-bags-routes-car-seat.json';

import howLaborBegins from '../../content/lessons/labor-basics/01-how-labor-begins.json';
import whenToContactYourCareTeam from '../../content/lessons/labor-basics/02-when-to-contact-your-care-team.json';
import stagesOfLabor from '../../content/lessons/labor-basics/03-stages-of-labor.json';
import earlyLaborAtHome from '../../content/lessons/labor-basics/04-early-labor-at-home.json';
import pushingAndBirth from '../../content/lessons/labor-basics/05-pushing-and-birth.json';
import placentaAndFirstHour from '../../content/lessons/labor-basics/06-placenta-and-first-hour.json';

import earlyPregnancyFirstSteps from '../../content/lessons/early-pregnancy-basics/01-early-pregnancy-first-steps.json';
import firstTrimesterCommonChanges from '../../content/lessons/early-pregnancy-basics/02-first-trimester-common-changes.json';
import firstPrenatalVisit from '../../content/lessons/early-pregnancy-basics/03-first-prenatal-visit.json';

import understandingLaborPain from '../../content/lessons/comfort-and-support-skills/01-understanding-labor-pain.json';
import breathingAndRelaxation from '../../content/lessons/comfort-and-support-skills/02-breathing-and-relaxation.json';

import makingDecisions from '../../content/lessons/interventions-and-flexible-decisions/01-making-decisions-with-your-care-team.json';
import monitoringYourBaby from '../../content/lessons/interventions-and-flexible-decisions/02-monitoring-your-baby-in-labor.json';
import medicalPainRelief from '../../content/lessons/interventions-and-flexible-decisions/03-medical-pain-relief.json';
import inductionOfLabor from '../../content/lessons/interventions-and-flexible-decisions/04-induction-of-labor.json';
import assistedVaginalBirth from '../../content/lessons/interventions-and-flexible-decisions/05-assisted-vaginal-birth.json';
import cesareanBirth from '../../content/lessons/interventions-and-flexible-decisions/06-cesarean-birth.json';
import whenPlansChange from '../../content/lessons/interventions-and-flexible-decisions/07-when-plans-change.json';

import safeSleep from '../../content/lessons/feeding-and-newborn-care/05-safe-sleep.json';
import carSeatSafety from '../../content/lessons/feeding-and-newborn-care/06-car-seat-safety.json';

import postpartumWarningSigns from '../../content/lessons/postpartum-recovery/02-postpartum-warning-signs.json';
import whenToCallAboutYourBaby from '../../content/lessons/postpartum-recovery/03-when-to-call-about-your-baby.json';

export type Course = {
  courseId: string;
  title: string;
  /** Short label shown above the title, such as "Module 1". */
  label: string;
  /** One line describing the course on the home screen. */
  description: string;
  lessons: Lesson[];
};

// JSON imports are typed loosely (plain strings), so they are cast to Lesson
// here and checked against the quality rules below and in tests/lessons.test.mjs.
function sortedLessons(lessons: unknown[]): Lesson[] {
  return (lessons as Lesson[]).slice().sort((a, b) => a.order - b.order);
}

function minutes(lessons: Lesson[]): number {
  return lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0);
}

const preparingForBirthLessons = sortedLessons([
  welcomeHowThisClassWorks,
  thirdTrimesterBody,
  careTeamAndBirthSetting,
  buildingYourSupportTeam,
  birthPreferences,
  gettingReady,
]);

export const laborBasicsLessons = sortedLessons([
  howLaborBegins,
  whenToContactYourCareTeam,
  stagesOfLabor,
  earlyLaborAtHome,
  pushingAndBirth,
  placentaAndFirstHour,
]);

const earlyPregnancyLessons = sortedLessons([
  earlyPregnancyFirstSteps,
  firstTrimesterCommonChanges,
  firstPrenatalVisit,
]);

const comfortAndSupportLessons = sortedLessons([understandingLaborPain, breathingAndRelaxation]);

const interventionsLessons = sortedLessons([makingDecisions, monitoringYourBaby, medicalPainRelief, inductionOfLabor, assistedVaginalBirth, cesareanBirth, whenPlansChange]);

const feedingAndNewbornCareLessons = sortedLessons([safeSleep, carSeatSafety]);

const postpartumRecoveryLessons = sortedLessons([postpartumWarningSigns, whenToCallAboutYourBaby]);

export const LABOR_BASICS_TITLE = 'Labor Basics and When to Call';

/** The class courses, in the order they appear on the home screen. */
export const courses: Course[] = [
  {
    courseId: 'early-pregnancy-basics',
    title: 'Early Pregnancy Basics',
    label: 'FIRST TRIMESTER',
    description: `Three short lessons for the early weeks: first steps, common changes and when to reach out, and your first prenatal visit. About ${minutes(earlyPregnancyLessons)} minutes.`,
    lessons: earlyPregnancyLessons,
  },
  {
    courseId: 'preparing-for-birth',
    title: 'Preparing for Birth',
    label: 'CLASS · MODULE 1',
    description: `Six lessons on your changing body, your care team and birth setting, your support team, birth preferences, and getting ready. About ${minutes(preparingForBirthLessons)} minutes.`,
    lessons: preparingForBirthLessons,
  },
  {
    courseId: 'labor-basics',
    title: LABOR_BASICS_TITLE,
    label: 'CLASS · MODULE 2',
    description: `Six narrated lessons on how labor begins, when to call, and birth, with check-ins and a review quiz after each lesson. About ${minutes(laborBasicsLessons)} minutes.`,
    lessons: laborBasicsLessons,
  },
  {
    courseId: 'comfort-and-support-skills',
    title: 'Comfort, Movement, and Support Skills',
    label: 'CLASS · MODULE 3',
    description: `Understanding labor pain, and hands-on comfort skills: breathing, positions, touch, water, and how support people can help. About ${minutes(comfortAndSupportLessons)} minutes.`,
    lessons: comfortAndSupportLessons,
  },
  {
    courseId: 'interventions-and-flexible-decisions',
    title: 'Interventions and Flexible Decisions',
    label: 'CLASS · MODULE 4',
    description: `Making decisions with your care team, and what to know about common interventions. About ${minutes(interventionsLessons)} minutes.`,
    lessons: interventionsLessons,
  },
  {
    courseId: 'feeding-and-newborn-care',
    title: 'Feeding and Newborn Care',
    label: 'CLASS · MODULE 5',
    description: `Keeping your newborn safe: sleep on the back in a bare crib, and car seats used right on every ride. About ${minutes(feedingAndNewbornCareLessons)} minutes.`,
    lessons: feedingAndNewbornCareLessons,
  },
  {
    courseId: 'postpartum-recovery',
    title: 'Postpartum Recovery, Mood, and Red Flags',
    label: 'CLASS · MODULE 6',
    description: `Warning signs to know for the year after birth, for you and your baby: when to call, when to call 911, and getting help. About ${minutes(postpartumRecoveryLessons)} minutes.`,
    lessons: postpartumRecoveryLessons,
  },
];

export const allLessons: Lesson[] = courses.flatMap((course) => course.lessons);

if (__DEV__) {
  for (const course of courses) {
    const { errors } = checkCourse(course.lessons);
    for (const e of errors) {
      console.error(`Lesson rule broken in ${e.lessonId} (${e.where}): ${e.message}`);
    }
  }
}
