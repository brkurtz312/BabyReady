/**
 * Deterministic safety routing for "Ask a question".
 *
 * This runs BEFORE any AI call, on the device and again on the server.
 * Questions that mention urgent symptoms never reach the AI; they get a fixed
 * message telling the learner to contact their care team or call 911.
 *
 * It is deliberately conservative: a general question that mentions an urgent
 * symptom (for example "how much bleeding is normal?") is routed here too.
 *
 * Plain TypeScript with no imports, so the app, the Firebase Function and
 * Node tests can all use the same file.
 */

export type AskSafetyRoute = 'crisis' | 'urgent' | 'water-broke' | 'ok';

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)? (myself|me)\b/,
  /\bsuicid/,
  /\bself[- ]?harm/,
  /\bhurt(ing)? (myself|my baby|the baby)\b/,
  /\b(don'?t|do not) want to (live|be alive|be here)\b/,
  /\bend (my|it all|my life)\b/,
];

const URGENT_PATTERNS: RegExp[] = [
  /\bbleed(s|ing)?\b/,
  /\bblood\b/,
  /\bhemorrhag/,
  /\b(can'?t|cannot|trouble|hard to|difficulty|struggling to) breath/,
  /\bshort(ness)? of breath\b/,
  /\bchest (pain|pressure|tight)/,
  /\bheart (is )?(racing|pounding)\b/,
  /\bsevere\b/,
  /\bseizure|convuls|fitting\b/,
  /\bfaint(ed|ing)?\b|\bpassed out\b|\bunconscious\b/,
  /\b(not|stopped|less|isn'?t|hasn'?t been|haven'?t felt|reduced|decreased|fewer|no)\b.{0,20}\b(mov|kick)/,
  /\bfever\b|\btemperature of 1(00|01|02|03|04)/,
  /\bblurr|\bvision\b|\bseeing spots\b|\bcan'?t see\b/,
  /\bheadache\b/,
  /\bswelling\b.{0,30}\b(face|hands|sudden)/,
  /\bcord\b.{0,20}\b(out|coming|see|feel)/,
];

const WATER_BROKE_PATTERNS: RegExp[] = [
  /\b(my )?water(s)? (just |has |have )?(broke|broken|is breaking|breaking|burst)\b/,
  /\bleaking (fluid|water)\b/,
  /\bgush of (fluid|water)\b/,
];

function normalize(question: string): string {
  return question.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ').trim();
}

export function routeQuestion(question: string): AskSafetyRoute {
  const q = normalize(question);
  if (CRISIS_PATTERNS.some((p) => p.test(q))) return 'crisis';
  if (URGENT_PATTERNS.some((p) => p.test(q))) return 'urgent';
  if (WATER_BROKE_PATTERNS.some((p) => p.test(q))) return 'water-broke';
  return 'ok';
}

/** Fixed messages shown instead of an AI answer. Never AI-generated. */
export const SAFETY_MESSAGES: Record<Exclude<AskSafetyRoute, 'ok'>, { title: string; body: string }> = {
  crisis: {
    title: 'You deserve support right now.',
    body: 'If you are thinking about harming yourself or your baby, call or text 988 (Suicide & Crisis Lifeline) now, or call 911 if you are in immediate danger. Please also tell your care team.',
  },
  urgent: {
    title: 'This sounds like it could need attention now.',
    body: 'Contact your care team right away. If it feels like an emergency, call 911. This class can’t assess symptoms.',
  },
  'water-broke': {
    title: 'Call your care team now.',
    body: 'When your water breaks, your care team wants to hear from you, even without contractions. Note the time and what the fluid looks like. If anything feels like an emergency, call 911.',
  },
};

export const MAX_QUESTION_LENGTH = 500;
