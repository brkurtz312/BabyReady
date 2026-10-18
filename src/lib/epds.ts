/**
 * The Edinburgh Postnatal Depression Scale (EPDS): ten questions about the past
 * seven days, each scored 0 to 3, for a total of 0 to 30.
 *
 * Cox JL, Holden JM, Sagovsky R. Detection of postnatal depression: development
 * of the 10-item Edinburgh Postnatal Depression Scale. British Journal of
 * Psychiatry 1987;150:782-786. © 1987 The Royal College of Psychiatrists.
 *
 * The wording and scores below must match the published scale exactly. The
 * bands were chosen by the clinical reviewer: 0-9, 10-12, and 13 or more, with
 * questions 3 to 5 (the EPDS-3A anxiety items) flagged at 6 or more. Any answer
 * other than "Never" on question 10 shows crisis help first, whatever the total.
 *
 * This file has no imports so plain Node can run it in tests.
 */

export type EpdsOption = { label: string; score: number };
export type EpdsQuestion = { number: number; text: string; options: EpdsOption[] };

export const EPDS_INTRO =
  'As you are pregnant or have recently had a baby, we would like to know how you are feeling. Please choose the answer that comes closest to how you have felt in the past 7 days, not just how you feel today.';

export const EPDS_CITATION =
  'Edinburgh Postnatal Depression Scale. Cox JL, Holden JM, Sagovsky R. British Journal of Psychiatry 1987;150:782-786. © 1987 The Royal College of Psychiatrists.';

export const EPDS_QUESTIONS: EpdsQuestion[] = [
  {
    number: 1,
    text: 'I have been able to laugh and see the funny side of things',
    options: [
      { label: 'As much as I always could', score: 0 },
      { label: 'Not quite so much now', score: 1 },
      { label: 'Definitely not so much now', score: 2 },
      { label: 'Not at all', score: 3 },
    ],
  },
  {
    number: 2,
    text: 'I have looked forward with enjoyment to things',
    options: [
      { label: 'As much as I ever did', score: 0 },
      { label: 'Rather less than I used to', score: 1 },
      { label: 'Definitely less than I used to', score: 2 },
      { label: 'Hardly at all', score: 3 },
    ],
  },
  {
    number: 3,
    text: 'I have blamed myself unnecessarily when things went wrong',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, some of the time', score: 2 },
      { label: 'Not very often', score: 1 },
      { label: 'No, never', score: 0 },
    ],
  },
  {
    number: 4,
    text: 'I have been anxious or worried for no good reason',
    options: [
      { label: 'No, not at all', score: 0 },
      { label: 'Hardly ever', score: 1 },
      { label: 'Yes, sometimes', score: 2 },
      { label: 'Yes, very often', score: 3 },
    ],
  },
  {
    number: 5,
    text: 'I have felt scared or panicky for no very good reason',
    options: [
      { label: 'Yes, quite a lot', score: 3 },
      { label: 'Yes, sometimes', score: 2 },
      { label: 'No, not much', score: 1 },
      { label: 'No, not at all', score: 0 },
    ],
  },
  {
    number: 6,
    text: 'Things have been getting on top of me',
    options: [
      { label: 'Yes, most of the time I haven’t been able to cope at all', score: 3 },
      { label: 'Yes, sometimes I haven’t been coping as well as usual', score: 2 },
      { label: 'No, most of the time I have coped quite well', score: 1 },
      { label: 'No, I have been coping as well as ever', score: 0 },
    ],
  },
  {
    number: 7,
    text: 'I have been so unhappy that I have had difficulty sleeping',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, sometimes', score: 2 },
      { label: 'Not very often', score: 1 },
      { label: 'No, not at all', score: 0 },
    ],
  },
  {
    number: 8,
    text: 'I have felt sad or miserable',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, quite often', score: 2 },
      { label: 'Not very often', score: 1 },
      { label: 'No, not at all', score: 0 },
    ],
  },
  {
    number: 9,
    text: 'I have been so unhappy that I have been crying',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, quite often', score: 2 },
      { label: 'Only occasionally', score: 1 },
      { label: 'No, never', score: 0 },
    ],
  },
  {
    number: 10,
    text: 'The thought of harming myself has occurred to me',
    options: [
      { label: 'Yes, quite often', score: 3 },
      { label: 'Sometimes', score: 2 },
      { label: 'Hardly ever', score: 1 },
      { label: 'Never', score: 0 },
    ],
  },
];

/** Question 10 is about self-harm. */
export const SELF_HARM_QUESTION = 10;
/** Questions 3 to 5 make up the EPDS-3A anxiety subscale. */
export const ANXIETY_QUESTIONS = [3, 4, 5];
export const ANXIETY_FLAG_AT = 6;

export type EpdsBand = 'low' | 'possible' | 'likely';

export type EpdsResult = {
  total: number;
  band: EpdsBand;
  anxietyScore: number;
  anxietyFlag: boolean;
  selfHarm: boolean;
};

/** True when this answer to this question means crisis help must show now. */
export function needsCrisisHelp(questionNumber: number, score: number): boolean {
  return questionNumber === SELF_HARM_QUESTION && score > 0;
}

export function bandFor(total: number): EpdsBand {
  if (total >= 13) return 'likely';
  if (total >= 10) return 'possible';
  return 'low';
}

/** Scores a full set of answers: one score per question, in question order. */
export function scoreEpds(scores: number[]): EpdsResult {
  if (scores.length !== EPDS_QUESTIONS.length) {
    throw new Error(`Expected ${EPDS_QUESTIONS.length} answers, got ${scores.length}.`);
  }
  scores.forEach((score, k) => {
    if (!EPDS_QUESTIONS[k].options.some((o) => o.score === score)) {
      throw new Error(`Question ${k + 1} has no answer scored ${score}.`);
    }
  });
  const total = scores.reduce((sum, s) => sum + s, 0);
  const anxietyScore = ANXIETY_QUESTIONS.reduce((sum, n) => sum + scores[n - 1], 0);
  return {
    total,
    band: bandFor(total),
    anxietyScore,
    anxietyFlag: anxietyScore >= ANXIETY_FLAG_AT,
    selfHarm: needsCrisisHelp(SELF_HARM_QUESTION, scores[SELF_HARM_QUESTION - 1]),
  };
}

/** What the result screen says for each band. */
export const BAND_MESSAGES: Record<EpdsBand, { title: string; body: string }> = {
  low: {
    title: 'Your answers don’t suggest depression right now.',
    body: 'Feelings can change, especially in the first year after birth. Take this check again any time, and tell your care team if you’re struggling, whatever your score.',
  },
  possible: {
    title: 'Your answers suggest possible depression.',
    body: 'Please tell your care team about this result at your next visit, or sooner if you feel worse. Depression after birth is common, and treatment helps.',
  },
  likely: {
    title: 'Your answers suggest likely depression.',
    body: 'Please contact your care team within the next few days to talk about how you’re feeling. Depression after birth is common, it’s not your fault, and treatment helps.',
  },
};

export const ANXIETY_MESSAGE =
  'Your answers also suggest anxiety. Tell your care team about this, too; anxiety after birth is common and treatable.';

export const CRISIS_MESSAGE = {
  title: 'You deserve support right now.',
  body: 'You said the thought of harming yourself has occurred to you. Please reach out now: call or text 988, or call or text the National Maternal Mental Health Hotline at 1-833-TLC-MAMA (1-833-852-6262), free, any time. If you might act on these thoughts, call 911. Please also tell your care team.',
};
