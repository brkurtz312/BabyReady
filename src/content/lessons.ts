import type { Lesson } from '../models/lesson';
import { checkCourse } from '../lib/lessonRules';

import howLaborBegins from '../../content/lessons/labor-basics/01-how-labor-begins.json';
import whenToContactYourCareTeam from '../../content/lessons/labor-basics/02-when-to-contact-your-care-team.json';
import stagesOfLabor from '../../content/lessons/labor-basics/03-stages-of-labor.json';
import earlyLaborAtHome from '../../content/lessons/labor-basics/04-early-labor-at-home.json';
import pushingAndBirth from '../../content/lessons/labor-basics/05-pushing-and-birth.json';
import placentaAndFirstHour from '../../content/lessons/labor-basics/06-placenta-and-first-hour.json';

export const LABOR_BASICS_COURSE_ID = 'labor-basics';
export const LABOR_BASICS_TITLE = 'Labor Basics and When to Call';

// JSON imports are typed loosely (plain strings), so they are cast to Lesson
// here and checked against the quality rules below and in tests/lessons.test.mjs.
export const laborBasicsLessons: Lesson[] = (
  [
    howLaborBegins,
    whenToContactYourCareTeam,
    stagesOfLabor,
    earlyLaborAtHome,
    pushingAndBirth,
    placentaAndFirstHour,
  ] as unknown as Lesson[]
).sort((a, b) => a.order - b.order);

if (__DEV__) {
  const { errors } = checkCourse(laborBasicsLessons);
  for (const e of errors) {
    console.error(`Lesson rule broken in ${e.lessonId} (${e.where}): ${e.message}`);
  }
}
