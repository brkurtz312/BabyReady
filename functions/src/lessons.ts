import type { Lesson } from '../../src/models/lesson';

import earlyPregnancyFirstSteps from '../../content/lessons/early-pregnancy-basics/01-early-pregnancy-first-steps.json';
import firstTrimesterCommonChanges from '../../content/lessons/early-pregnancy-basics/02-first-trimester-common-changes.json';
import firstPrenatalVisit from '../../content/lessons/early-pregnancy-basics/03-first-prenatal-visit.json';

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

// The server answers only from lesson content shipped with the function, never
// from lesson text sent by the app. Every course's lessons are listed here.
const lessons = [
  earlyPregnancyFirstSteps,
  firstTrimesterCommonChanges,
  firstPrenatalVisit,
  welcomeHowThisClassWorks,
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
